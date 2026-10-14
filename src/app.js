// ============================================================================
// CLIKIUM TERRENO — MODULAR FRONTEND APP (ES MODULE)
// ============================================================================

import {
  $, esc, num, uid, now, today, dateLabel, timeOnly, icon, toast,
  sectorUsesPk, pkNumber, normalizePk, nameKey, statusClass, badge, controlBadges,
  layerLabel, activityStage, getActivityStatus, getControlStatus,
  requiredControlsLabel, findAssignedActivity, textarea,
  projectDisplayName, normalizeProjectId,
  formatActivityMeta, parseActivityMeta, isLayerActivity, isLoadingActivity,
  isLoadingOnlyActivity, isTransferActivity, isDirectMeasurementActivity, getDefaultUnit
} from './utils.js';

import {
  stateStore, selectedDay, allActivities, foremanId, amount, metadata,
  save, editDay, updateSaveStatus, retrySync, upload,
  persistLocalState, mergePendingWithRemote
} from './state.js';

import {
  modal, showDialog, startForm, activityForm, resourceForm, multiPersonForm,
  copyYesterdayCrewForm, controlForm, annulForm, updateActivityForm, updateQuantityForm,
  updateSectorForm, updateLayerForm, repeatPreviousActivity, detail, demo
} from './dialogs.js';

import { renderDay } from './views/day.js';
import { renderPending } from './views/pending.js';
import { renderResources } from './views/resources.js';
import { renderHistory } from './views/history.js';
import { renderMap } from './views/map.js';
import { renderReport, reportText } from './views/report.js';
import { renderBackup } from './views/backup.js';

// ----------------------------------------------------------------------------
// RENDER DISPATCHER
// ----------------------------------------------------------------------------
export function render() {
  document.body.classList.toggle('report-mode', stateStore.view === 'report');
  $('#project-name').textContent = projectDisplayName(stateStore.state?.settings?.project);
  $('#header-date').textContent = dateLabel(today());

  const userEl = $('#user-display-name');
  if (userEl) userEl.textContent = stateStore.state?.settings?.user || 'Christofer Godoy';

  const curDay = selectedDay();
  const curDayPending = curDay
    ? curDay.activities.filter(a => !a.isAnnulled && (getActivityStatus(a) === 'Control pendiente' || getActivityStatus(a) === 'Rechazado')).length
    : 0;
  const pendingBadge = curDayPending > 0 ? `<span class="nav-badge">${curDayPending}</span>` : '';

  const items = [
    ['today', 'day', 'Jornada'],
    ['pending', 'check', `Pendientes${pendingBadge}`],
    ['history', 'history', 'Historial'],
    ['map', 'map', 'Tramos'],
    ['resources', 'people', 'Recursos'],
    ['backup', 'backup', 'Respaldo']
  ];

  $('#nav').innerHTML = items.map(([key, i, label]) =>
    `<button class="nav-item ${stateStore.view === key ? 'active' : ''}" data-action="navigate" data-view="${key}" ${stateStore.view === key ? 'aria-current="page"' : ''}>${icon(i)}<span>${label}</span></button>`
  ).join('');

  const renderer = {
    today: renderDay,
    pending: renderPending,
    history: renderHistory,
    map: renderMap,
    resources: renderResources,
    backup: renderBackup,
    report: renderReport
  }[stateStore.view] || renderDay;

  try {
    $('#main').innerHTML = renderer();
  } catch (error) {
    console.error(`Error al renderizar la vista "${stateStore.view}":`, error);
    $('#main').innerHTML = `<div class="connection-error">
      <h2>No se pudo mostrar esta sección.</h2>
      <p class="muted">${esc(error?.message || 'Error inesperado')}</p>
      <button class="btn btn-primary" data-action="navigate" data-view="today">Volver a la jornada</button>
    </div>`;
  }
}

// ----------------------------------------------------------------------------
// INTERACTIVE EVENT LISTENERS
// ----------------------------------------------------------------------------
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id, dayId } = button.dataset;

  try {
    if (action === 'logout') {
      try {
        await signOut();
      } catch (e) {
        console.error('Logout error:', e);
      }
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {}
      window.location.replace(window.location.origin + window.location.pathname);
      return;
    }
    if (action === 'close-modal') return modal.close();
    if (action === 'retry-sync') return await retrySync(render);
    if (action === 'filter-pending-tab') { stateStore.pendingTabFilter = button.dataset.tab; render(); return; }
    if (action === 'filter-pending-scope') { stateStore.pendingScope = button.dataset.scope; render(); return; }
    if (action === 'navigate') { stateStore.view = button.dataset.view; render(); return; }
    if (action === 'backup-view') { stateStore.view = 'backup'; render(); return; }
    if (action === 'start-day') return startForm();
    if (action === 'add-activity') return activityForm(id);
    if (action === 'preset') return activityForm(id, '', button.dataset.preset);
    if (action === 'repeat-previous') return repeatPreviousActivity(dayId);
    if (action === 'detail') return detail(dayId, id);
    if (action === 'edit-activity') return activityForm(dayId, id);
    if (action === 'annul-activity') return annulForm(dayId, id);
    if (action === 'add-control') return controlForm(dayId, id);
    if (action === 'add-person') return resourceForm(id, 'person');
    if (action === 'add-multi-person') return multiPersonForm(id);
    if (action === 'assign-crew') return multiPersonForm(dayId, id);
    if (action === 'copy-yesterday-crew') return copyYesterdayCrewForm(id);
    if (action === 'edit-person') return resourceForm(dayId, 'person', id);
    if (action === 'add-machine') return resourceForm(id, 'machine');
    if (action === 'edit-machine') return resourceForm(dayId, 'machine', id);
    if (action === 'open-day') { stateStore.selectedDayId = id; localStorage.setItem('clikium_selected_day_id', id); stateStore.pendingScope = 'today'; stateStore.view = 'today'; render(); return; }
    if (action === 'reopen-day') {
      const { nextState, day } = editDay(id);
      day.closedAt = null;
      const user = stateStore.state.settings.user || day.user;
      const nowStr = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      const auditNote = `[Jornada reabierta ${nowStr} hrs por ${user}]`;
      day.notes = day.notes ? `${day.notes}\n${auditNote}` : auditNote;
      await save(nextState);
      render();
      toast('Jornada reabierta. Ya puedes registrar o corregir avances.');
      return;
    }
    if (action === 'report') { stateStore.selectedDayId = id; localStorage.setItem('clikium_selected_day_id', id); stateStore.view = 'report'; render(); return; }
    if (action === 'print') { await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); return window.print(); }
    if (action === 'clear-history') { stateStore.historySearch = ''; stateStore.historyMonth = ''; render(); return; }
    if (action === 'day-notes') {
      const day = stateStore.state.days.find(d => d.id === id);
      return showDialog('Observaciones de jornada', 'Incidencias, interferencias o temas pendientes.', `<div class="form-grid">${textarea('notes', 'Observaciones', day.notes)}</div>`, { form: 'notes', dayId: id });
    }
    if (action === 'close-day') {
      const day = stateStore.state.days.find(d => d.id === id);
      return showDialog('Cerrar jornada', `${day.activities.length} actividades · ${day.activities.filter(a => activityStage(a) === 'En curso').length} en curso.`, `<p>El cierre registra el término de la jornada laboral. Si requieres corregir o registrar más avances después, podrás reabrirla registrando fecha y hora.</p><div class="form-grid">${textarea('notes', 'Observaciones finales', day.notes)}</div>`, { form: 'close', dayId: id });
    }
    if (action === 'demo') return await demo(render);
    if (action === 'delete-demo') {
      const nextState = structuredClone(stateStore.state);
      nextState.days = nextState.days.filter(d => !d.isDemo);
      stateStore.selectedDayId = null;
      localStorage.removeItem('clikium_selected_day_id');
      await save(nextState);
      stateStore.view = 'today';
      render();
      toast('Jornada de ejemplo eliminada.');
      return;
    }
    if (action === 'copy-report') {
      const text = reportText(stateStore.state.days.find(d => d.id === id));
      try {
        await navigator.clipboard.writeText(text);
        toast('Resumen copiado. Las fotos se adjuntan por separado.');
      } catch {
        showDialog('Resumen para WhatsApp', 'Copia este texto; las fotos se adjuntan por separado.', `<textarea id="copy-text" rows="15">${esc(text)}</textarea>`);
        $('#copy-text').select();
      }
      return;
    }
    if (action === 'whatsapp-report') {
      const targetDay = stateStore.state.days.find(d => d.id === id);
      if (!targetDay) return toast('Jornada no encontrada');
      const text = reportText(targetDay);
      try { await navigator.clipboard.writeText(text); } catch (e) {}

      const savedPhone = localStorage.getItem('clikium_phone_matias_ramos') || '';
      const sendToWhatsApp = (phone) => {
        let clean = (phone || '').replace(/\D/g, '');
        if (clean && !clean.startsWith('56')) {
          if (clean.length === 9) clean = '56' + clean;
        }
        const waUrl = clean 
          ? `https://wa.me/${clean}?text=${encodeURIComponent(text)}`
          : `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(waUrl, '_blank');
        toast('Abriendo WhatsApp... Texto del informe copiado.');
      };

      if (!savedPhone) {
        showDialog(
          'WhatsApp de Secretaría Técnica',
          'Solo se solicitará esta primera vez',
          `<div style="display:flex;flex-direction:column;gap:12px">
            <p style="font-size:0.875rem;color:#475569;margin:0">Ingresa el número de destino para enviar los informes directos por WhatsApp:</p>
            <label class="field">
              <span>Número (+56 9...)</span>
              <input type="tel" id="matias-phone-input" placeholder="+56 9 1234 5678" style="font-size:16px;font-weight:600">
            </label>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:6px">
              <button type="button" class="btn btn-whatsapp" onclick="window.saveAndSendWa()">Guardar y Enviar</button>
            </div>
          </div>`
        );
        window.saveAndSendWa = () => {
          const ph = $('#matias-phone-input')?.value.trim();
          if (ph) localStorage.setItem('clikium_phone_matias_ramos', ph);
          modal.close();
          sendToWhatsApp(ph);
        };
      } else {
        sendToWhatsApp(savedPhone);
      }
      return;
    }
  } catch (error) {
    toast(error.message);
  }
});

document.addEventListener('input', event => {
  if (event.target.closest('[data-form="activity"]')) {
    updateActivityForm();
  }
  if (event.target.id === 'history-search') {
    stateStore.historySearch = event.target.value;
    const start = event.target.selectionStart;
    render();
    $('#history-search').focus();
    $('#history-search').setSelectionRange(start, start);
  }
});

document.addEventListener('change', event => {
  if (event.target.closest('[data-form="activity"]')) {
    updateActivityForm();
  }
  const id = event.target.id;
  if (id === 'single-activity-select') {
    const asgInput = $('#single-assignment-input');
    if (asgInput) {
      if (event.target.value === '__custom__') { asgInput.value = ''; asgInput.focus(); }
      else if (event.target.value) { asgInput.value = event.target.value; }
    }
  }
  if (id === 'multi-activity-select') {
    const asgInput = $('#multi-default-assignment');
    if (asgInput) { asgInput.value = event.target.value; }
  }
  if (id === 'history-month') { stateStore.historyMonth = event.target.value; render(); }
  if (id === 'map-sector') { stateStore.mapSector = event.target.value; render(); }
  if (id === 'map-layer') { stateStore.mapLayer = event.target.value; render(); }
  if (id === 'map-process') { stateStore.mapProcess = event.target.value; render(); }
  if (id === 'map-date') { stateStore.mapDate = event.target.value; render(); }
});

document.addEventListener('submit', async event => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();

  const submitButton = $('button[type="submit"]', form) || $('button', form.querySelector('.form-footer'));
  const errorBox = $('.form-error', form);
  errorBox?.classList.remove('visible');

  const val = name => form.elements[name].value.trim();
  const number = name => Number(form.elements[name].value);
  submitButton.disabled = true;
  submitButton.textContent = 'Guardando…';

  try {
    const type = form.dataset.form;
    if (type === 'start') {
      const nextState = structuredClone(stateStore.state || { settings: {}, days: [] });
      if (!nextState.days) nextState.days = [];
      const id = uid();
      const capataz = stateStore.catalog.capataces.find(p => p.id === val('userId'));
      if (!capataz) throw new Error('Selecciona un capataz registrado.');
      const projId = normalizeProjectId(val('project')) || 'tunel_lo_ruiz';
      nextState.settings = { ...nextState.settings, project: projId, user: capataz.nombre, userId: capataz.id };
      nextState.days.push({
        id, date: val('date'), project: projId, user: capataz.nombre, userId: capataz.id,
        isDemo: false, startedAt: now(), closedAt: null, notes: '', activities: [], crew: [], machines: []
      });
      stateStore.selectedDayId = id;
      localStorage.setItem('clikium_selected_day_id', id);
      await save(nextState);
      stateStore.pendingScope = 'today';
      stateStore.view = 'today';
    } else if (type === 'settings') {
      const nextState = structuredClone(stateStore.state);
      const capataz = stateStore.catalog.capataces.find(p => p.id === val('userId'));
      if (!capataz) throw new Error('Selecciona un capataz registrado.');
      nextState.settings = { ...nextState.settings, project: val('project'), user: capataz.nombre, userId: capataz.id };
      await save(nextState);
      stateStore.selectedDayId = null;
    } else {
      const { nextState, day } = editDay(form.dataset.dayId);
      if (type === 'activity') {
        const usesPk = sectorUsesPk(val('sector'));
        const rawStart = val('pkStart');
        const rawEnd = val('pkEnd') || rawStart;
        const pkStartVal = usesPk && rawStart ? normalizePk(rawStart) : '';
        const pkEndVal = usesPk && rawEnd ? normalizePk(rawEnd) : '';
        if (usesPk && (!pkStartVal || !pkEndVal)) throw new Error('Debe ingresar el PK inicial y final para ejes y caminos.');
        if (pkStartVal && pkEndVal && pkNumber(pkStartVal) !== null && pkNumber(pkEndVal) !== null) {
          if (pkNumber(pkEndVal) < pkNumber(pkStartVal)) throw new Error('El PK final no puede ser menor al inicial.');
        }

        const actId = form.dataset.activityId?.trim();
        const existing = actId ? day.activities.find(a => a.id === actId) : null;
        const actVal = val('activity');
        const processVal = val('process');
        const isDirect = isDirectMeasurementActivity(actVal, processVal);

        let tripsMode = !isDirect;
        let quantity = 0;
        let newUnit = 'm³';
        let capacityVal = 0;
        let tripsCount = 0;

        if (isDirect) {
          quantity = number('quantity') || 0;
          newUnit = val('unit') || getDefaultUnit(actVal, processVal);
          tripsMode = false;
          tripsCount = 0;
          capacityVal = 0;
        } else {
          tripsMode = true;
          capacityVal = number('capacity') || 22;
          tripsCount = number('trips') || 0;
          quantity = tripsCount * capacityVal;
          newUnit = 'm³';
        }

        const photoIds = [...(existing?.photoIds || [])];
        form._uploadedPhotos ||= new Map();
        for (const file of form.elements.photos.files) {
          const key = `${file.name}:${file.size}:${file.lastModified}`;
          if (!form._uploadedPhotos.has(key)) form._uploadedPhotos.set(key, await upload(file));
          photoIds.push(form._uploadedPhotos.get(key));
        }

        const needsLayer = isLayerActivity(actVal);
        const layerTypeVal = needsLayer ? (val('layerType') || 'terraplen_4') : '';
        const isCapa = needsLayer && ['terraplen_4', 'terraplen_6', 'relleno_estructural_3', 'relleno', 'marina'].includes(layerTypeVal);
        const newLayer = isCapa ? number('layer') : 0;
        const newPkStart = pkStartVal, newPkEnd = pkEndVal, newSector = val('sector');

        let reqCtrl = val('requiredControls') || 'both';
        if (isLoadingOnlyActivity(actVal)) {
          reqCtrl = 'none';
        } else if (actVal.toLowerCase().includes('tubo') || actVal.toLowerCase().includes('cama de apoyo')) {
          reqCtrl = 'top';
        }

        const stageVal = val('stage') || 'Terminado';

        const materialVal = isLoadingActivity(actVal) ? val('material') : '';
        const transferDestVal = isTransferActivity(actVal) ? val('transferDestination') : '';
        const transferPurpVal = isTransferActivity(actVal) ? val('transferPurpose') : '';
        const formattedDesc = formatActivityMeta(val('description'), materialVal, transferDestVal, transferPurpVal);

        let initialControl;
        if (reqCtrl === 'none') {
          initialControl = {
            id: uid(),
            status: 'Registro completo',
            type: 'General',
            author: stateStore.state.settings.user || day.user,
            note: 'Registro de ejecución física completo. No requiere ensayos de laboratorio ni topografía.',
            at: now(),
            attachmentId: null
          };
        } else if (reqCtrl === 'top') {
          initialControl = {
            id: uid(),
            status: 'Control pendiente',
            type: 'General',
            author: day.user,
            note: 'Registro de ejecución física. Exige control topográfico obligatorio.',
            at: now(),
            attachmentId: null
          };
        } else {
          initialControl = {
            id: uid(),
            status: 'Control pendiente',
            type: 'General',
            author: day.user,
            note: 'Registro de ejecución física. Control por verificar.',
            at: now(),
            attachmentId: null
          };
        }

        let controls = existing?.controls ? [...existing.controls] : [initialControl];
        if (existing && !existing.isAnnulled) {
          const changes = [];
          if (existing.pkStart !== newPkStart || existing.pkEnd !== newPkEnd) changes.push(`PK (${existing.pkStart}-${existing.pkEnd} → ${newPkStart}-${newPkEnd})`);
          if (existing.layer !== newLayer || existing.layerType !== layerTypeVal) changes.push(`Capa (${layerLabel(existing)} → ${layerLabel({ layer: newLayer, layerType: layerTypeVal })})`);
          if (Math.abs(existing.quantity - quantity) > 0.001 || (existing.unit || 'm³') !== newUnit) changes.push(`Cantidad (${num(existing.quantity)} ${existing.unit || ''} → ${num(quantity)} ${newUnit})`);
          if (changes.length > 0) {
            controls.push({
              id: uid(), type: 'General', status: reqCtrl === 'none' ? 'Registro completo' : 'Control pendiente',
              author: stateStore.state.settings.user || day.user,
              note: `Modificación de avance: ${changes.join(', ')}.`, at: now(), attachmentId: null
            });
          }
        }

        const record = {
          id: existing ? existing.id : uid(), sector: newSector, activity: actVal, process: processVal,
          layer: newLayer, layerType: layerTypeVal, pkStart: newPkStart, pkEnd: newPkEnd,
          requiredControls: reqCtrl, unit: newUnit, mode: tripsMode ? 'trips' : 'manual',
          quantity, trips: tripsCount, capacity: capacityVal,
          stage: stageVal, description: formattedDesc, notes: val('notes'),
          createdAt: existing?.createdAt || now(), photoIds: [...new Set(photoIds)], controls,
          ...(existing?.isAnnulled ? { isAnnulled: existing.isAnnulled, annulReason: existing.annulReason, annulledAt: existing.annulledAt, annulledBy: existing.annulledBy } : {})
        };
        if (existing) {
          Object.assign(existing, record);
        } else {
          day.activities.push(record);
        }

      } else if (type === 'annul') {
        const activity = day.activities.find(a => a.id === form.dataset.activityId);
        const reason = val('annulReason');
        if (!reason) throw new Error('Debe ingresar un motivo para anular el registro.');
        activity.isAnnulled = true;
        activity.annulReason = reason;
        activity.annulledAt = now();
        activity.annulledBy = stateStore.state.settings.user || day.user;
        activity.controls.push({
          id: uid(), type: 'General', status: 'Anulado', author: stateStore.state.settings.user || day.user,
          note: `Anulación de registro: ${reason}`, at: now(), attachmentId: null
        });

      } else if (type === 'control') {
        const activity = day.activities.find(a => a.id === form.dataset.activityId);
        const file = form.elements.attachment.files[0];
        const fileKey = file ? `${file.name}:${file.size}:${file.lastModified}` : '';
        if (file && form._attachmentUpload?.key !== fileKey) form._attachmentUpload = { key: fileKey, id: await upload(file) };
        activity.controls.push({
          id: uid(), type: val('type'), status: val('status'), author: val('author'),
          note: val('note'), at: now(), attachmentId: file ? form._attachmentUpload.id : null
        });
        if (getActivityStatus(activity) === 'Aprobado') {
          activity.stage = 'Terminado';
        }

      } else if (type === 'person' || type === 'machine') {
        const person = type === 'person';
        if (person) {
          const nameVal = val('name');
          const existingPerson = day.crew.find(r => r.id !== form.dataset.recordId && nameKey(r.name) === nameKey(nameVal));
          if (existingPerson) throw new Error(`La persona "${nameVal}" ya está registrada en la cuadrilla de hoy. Modifica su registro existente para ajustar la asignación y evitar duplicar sus HH.`);
        }
        if (number('hours') + number(person ? 'extra' : 'standby') > 24) throw new Error('La suma de horas no puede superar 24 h por día.');
        const list = person ? day.crew : day.machines;
        const existing = list.find(r => r.id === form.dataset.recordId);
        const record = {
          id: existing?.id || uid(), name: val('name'), assignment: val('assignment'), hours: number('hours'),
          ...(person ? { role: val('role'), extra: number('extra') } : { operator: val('operator'), standby: number('standby') })
        };
        if (existing) Object.assign(existing, record); else list.push(record);

      } else if (type === 'multi-person') {
        const checkboxes = form.querySelectorAll('input[name="selected_workers"]:checked:not(:disabled)');
        if (!checkboxes.length) throw new Error('Selecciona al menos un trabajador para ingresar.');
        const h = number('default_hours'), ex = number('default_extra'), asg = val('default_assignment');
        if (h + ex > 24) throw new Error('La suma de horas no puede superar 24 h por día.');
        let added = 0;
        for (const cb of checkboxes) {
          const wName = cb.value;
          if (day.crew.some(p => nameKey(p.name) === nameKey(wName))) continue;
          day.crew.push({ id: uid(), name: wName, role: cb.dataset.role || 'M1', hours: h, extra: ex, assignment: asg });
          added++;
        }
        toast(`Se agregaron ${added} trabajadores a la cuadrilla.`);

      } else if (type === 'copy-crew') {
        const workerCbs = form.querySelectorAll('input[name="copy_crew"]:checked:not(:disabled)');
        const machineCbs = form.querySelectorAll('input[name="copy_machines"]:checked:not(:disabled)');
        let addedW = 0, addedM = 0;
        for (const cb of workerCbs) {
          const wName = cb.value;
          if (day.crew.some(p => nameKey(p.name) === nameKey(wName))) continue;
          day.crew.push({
            id: uid(), name: wName, role: cb.dataset.role || 'M1',
            hours: Number(cb.dataset.hours) || 8, extra: Number(cb.dataset.extra) || 0,
            assignment: cb.dataset.assignment || ''
          });
          addedW++;
        }
        for (const cb of machineCbs) {
          const mName = cb.value;
          if (day.machines.some(m => nameKey(m.name) === nameKey(mName))) continue;
          day.machines.push({
            id: uid(), name: mName, operator: cb.dataset.operator || '',
            hours: Number(cb.dataset.hours) || 8, standby: Number(cb.dataset.standby) || 0,
            assignment: cb.dataset.assignment || ''
          });
          addedM++;
        }
        toast(`Importados: ${addedW} trabajadores y ${addedM} equipos.`);

      } else if (type === 'notes' || type === 'close') {
        day.notes = val('notes');
        if (type === 'close') day.closedAt = now();
      }

      await save(nextState);
    }

    if (modal.open) modal.close();
    render();
    toast('Registro guardado.');
  } catch (error) {
    if (errorBox) {
      errorBox.textContent = error.message;
      errorBox.classList.add('visible');
      errorBox.scrollIntoView({ block: 'nearest' });
    } else {
      toast(error.message);
    }
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Guardar';
  }
});

// ----------------------------------------------------------------------------
// BOOTSTRAP INITIALIZATION
// ----------------------------------------------------------------------------
import { loadState } from './data/sync.js';
import { checkSession, signInWithOtp, verifyOtp, signInWithPassword, signOut } from './data/auth.js';

const CATALOG_CACHE_KEY = 'clikium_catalog_cache';

async function load() {
  const cachedLocal = localStorage.getItem('clikium_terreno_state_cache');
  const pendingLocal = localStorage.getItem('clikium_terreno_pending_state');
  const savedDayId = localStorage.getItem('clikium_selected_day_id');
  if (savedDayId) stateStore.selectedDayId = savedDayId;
  try {
    const cachedCatalog = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || 'null');
    if (cachedCatalog) stateStore.catalog = { ...stateStore.catalog, ...cachedCatalog };
  } catch (e) {}

  if (pendingLocal) {
    try {
      stateStore.pendingSyncState = JSON.parse(pendingLocal);
      if (stateStore.pendingSyncState?.state) {
        stateStore.state = stateStore.pendingSyncState.state;
      }
    } catch (e) {}
  } else if (cachedLocal) {
    try {
      stateStore.state = JSON.parse(cachedLocal);
    } catch (e) {}
  }

  // Renderizar estado local de inmediato si existe
  if (stateStore.state) {
    updateSaveStatus(stateStore.pendingSyncState ? 'pending' : 'offline', stateStore.pendingSyncState ? null : 'Copia local');
    render();
  }

  // Eventos de reconexión y visibilidad móvil
  window.addEventListener('online', () => {
    if (stateStore.pendingSyncState) retrySync(render);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (stateStore.state) persistLocalState(stateStore.state);
    } else if (document.visibilityState === 'visible' && navigator.onLine && stateStore.pendingSyncState) {
      retrySync(render);
    }
  });
  window.addEventListener('pagehide', () => {
    if (stateStore.state) persistLocalState(stateStore.state);
  });

  // Reintento periódico en segundo plano
  setInterval(() => {
    if (navigator.onLine && stateStore.pendingSyncState && !stateStore.saving) {
      retrySync(render);
    }
  }, 35000);

  try {
    // Check for hash errors from previous Supabase redirect
    let hashErrorMsg = '';
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const errDesc = hashParams.get('error_description');
      if (errDesc) {
        hashErrorMsg = decodeURIComponent(errDesc.replace(/\+/g, ' '));
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    const session = await checkSession();
    if (!session) {
      document.body.classList.add('unauthenticated');
      const userPill = $('#user-pill');
      if (userPill) userPill.style.display = 'none';

      $('#main').innerHTML = `
        <div class="flex items-center justify-center min-h-[75vh] px-4 py-8">
          <div class="bg-white border border-slate-200/90 p-6 sm:p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
            <div class="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
              <span class="text-xl text-white font-bold tracking-tight">C</span>
            </div>
            <h2 class="text-xl font-bold text-slate-900 mb-1">Clikium Terreno</h2>
            <p class="text-slate-500 mb-4 text-xs">Acceso a faena · Túnel Lo Ruiz</p>

            ${hashErrorMsg ? `<div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs text-left leading-relaxed">Aviso: ${esc(hashErrorMsg)}</div>` : ''}
            <div id="login-alert-banner"></div>
            
            <div class="flex border-b border-slate-200 mb-4 text-xs font-semibold">
              <button type="button" id="tab-pw" class="flex-1 pb-2 border-b-2 border-slate-900 text-slate-900 font-bold transition-all" onclick="window.switchLoginTab('password')">
                Contraseña
              </button>
              <button type="button" id="tab-otp" class="flex-1 pb-2 border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition-all" onclick="window.switchLoginTab('otp')">
                Enlace / Código
              </button>
            </div>

            <!-- MODO CONTRASEÑA -->
            <form id="form-password-mode" onsubmit="event.preventDefault(); window.loginWithPassword();" class="space-y-3">
              <input type="email" id="login-email-pw" placeholder="tu@correo.com" required autocomplete="email" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-base outline-none focus:border-slate-800 transition-colors">
              <input type="password" id="login-password-input" placeholder="Contraseña de acceso" required autocomplete="current-password" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-base outline-none focus:border-slate-800 transition-colors">
              <button type="submit" id="btn-login-pw" class="w-full py-3 bg-slate-900 hover:bg-black text-white text-sm font-semibold rounded-xl shadow transition-all active:scale-98">
                Iniciar sesión
              </button>
              <p class="text-[11px] text-slate-400 leading-normal pt-1">
                Acceso directo recomendado sin límite de correos.
              </p>
            </form>

            <!-- MODO ENLACE / OTP -->
            <form id="form-otp-mode" onsubmit="event.preventDefault(); window.loginWithOtp();" class="space-y-3" style="display:none">
              <input type="email" id="login-email-otp" placeholder="tu@correo.com" required autocomplete="email" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-base outline-none focus:border-slate-800 transition-colors">
              <button type="submit" id="btn-login-otp" class="w-full py-3 bg-slate-900 hover:bg-black text-white text-sm font-semibold rounded-xl shadow transition-all active:scale-98">
                Enviar enlace a correo
              </button>
              <div id="otp-input-area" style="display:none" class="pt-2">
                <input type="text" id="login-otp-code" placeholder="Código de 6 dígitos" maxlength="8" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center text-base font-semibold tracking-widest text-slate-800 outline-none focus:border-slate-800 mb-2">
                <button type="button" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow" onclick="window.submitOtpCode()">
                  Validar código
                </button>
              </div>
              <p class="text-[11px] text-slate-400 leading-normal pt-1">
                Recibirás un enlace o código de un solo uso en tu correo.
              </p>
            </form>
          </div>
        </div>`;

      window.switchLoginTab = (mode) => {
        const formPw = $('#form-password-mode');
        const formOtp = $('#form-otp-mode');
        const tabPw = $('#tab-pw');
        const tabOtp = $('#tab-otp');
        if (mode === 'password') {
          formPw.style.display = 'block';
          formOtp.style.display = 'none';
          tabPw.className = 'flex-1 pb-2 border-b-2 border-slate-900 text-slate-900 font-bold transition-all';
          tabOtp.className = 'flex-1 pb-2 border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition-all';
        } else {
          formPw.style.display = 'none';
          formOtp.style.display = 'block';
          tabOtp.className = 'flex-1 pb-2 border-b-2 border-slate-900 text-slate-900 font-bold transition-all';
          tabPw.className = 'flex-1 pb-2 border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition-all';
        }
      };

      window.loginWithPassword = async () => {
        const email = $('#login-email-pw').value.trim();
        const password = $('#login-password-input').value;
        const btn = $('#btn-login-pw');
        const banner = $('#login-alert-banner');
        if (!email || !password) return;

        btn.disabled = true;
        btn.textContent = 'Verificando…';
        if (banner) banner.innerHTML = '';

        try {
          await signInWithPassword(email, password);
          window.location.replace(window.location.origin + window.location.pathname);
        } catch (err) {
          btn.disabled = false;
          btn.textContent = 'Iniciar sesión';
          const msg = err.message || '';
          if (banner) {
            banner.innerHTML = `
              <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs text-left leading-relaxed">
                <strong>Error al ingresar:</strong> ${esc(msg)}
                ${msg.toLowerCase().includes('invalid login credentials') ? '<br><span class="text-slate-600 mt-1 block">Si creaste tu usuario por enlace, actualiza tu contraseña en Supabase SQL Editor para ingresar.</span>' : ''}
              </div>`;
          } else {
            alert('Error: ' + msg);
          }
        }
      };

      window.loginWithOtp = async () => {
        const email = $('#login-email-otp').value.trim();
        const btn = $('#btn-login-otp');
        const banner = $('#login-alert-banner');
        if (!email) return;

        btn.disabled = true;
        btn.textContent = 'Enviando…';
        if (banner) banner.innerHTML = '';

        try {
          await signInWithOtp(email);
          btn.disabled = false;
          btn.textContent = 'Reenviar enlace';
          $('#otp-input-area').style.display = 'block';
          if (banner) {
            banner.innerHTML = `
              <div class="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs text-left leading-relaxed">
                Enlace enviado a <strong>${esc(email)}</strong>. Puedes hacer clic en el enlace de tu correo o ingresar el código de 6 dígitos aquí abajo.
              </div>`;
          }
        } catch (err) {
          btn.disabled = false;
          btn.textContent = 'Enviar enlace a correo';
          const isRateLimit = err.message && err.message.toLowerCase().includes('rate limit');
          if (isRateLimit) {
            window.switchLoginTab('password');
            const pwEmail = $('#login-email-pw');
            if (pwEmail) pwEmail.value = email;
            if (banner) {
              banner.innerHTML = `
                <div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs text-left leading-relaxed">
                  <strong>Límite de correos superado:</strong> Supabase limita los envíos por hora en cuentas gratuitas. Ingresa con tu <strong>contraseña</strong> directamente.
                </div>`;
            }
          } else {
            if (banner) {
              banner.innerHTML = `
                <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs text-left leading-relaxed">
                  ${esc(err.message)}
                </div>`;
            } else {
              alert('Error: ' + err.message);
            }
          }
        }
      };

      window.submitOtpCode = async () => {
        const email = $('#login-email-otp').value.trim();
        const token = $('#login-otp-code').value.trim();
        const banner = $('#login-alert-banner');
        if (!token) return alert('Ingresa el código.');
        try {
          await verifyOtp(email, token);
          window.location.replace(window.location.origin + window.location.pathname);
        } catch (err) {
          if (banner) {
            banner.innerHTML = `<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs text-left leading-relaxed">Código inválido: ${esc(err.message)}</div>`;
          } else {
            alert('Código inválido: ' + err.message);
          }
        }
      };

      return;
    }

    // Authenticated! Clean state
    stateStore.session = session;
    document.body.classList.remove('unauthenticated');
    const userPill = $('#user-pill');
    if (userPill) userPill.style.display = 'inline-flex';

    const result = await loadState();
    
    stateStore.catalog = result.catalog;
    try { localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(result.catalog)); } catch (e) {}
    stateStore.version = result.version;
    stateStore.media = result.media;
    stateStore.remoteState = structuredClone(result.state);

    if (stateStore.pendingSyncState && stateStore.pendingSyncState.state) {
      // Combinar cambios locales pendientes sobre el estado remoto para no perder ningún dato
      const merged = mergePendingWithRemote(result.state, stateStore.pendingSyncState.state);
      stateStore.state = merged;
      persistLocalState(merged);
      updateSaveStatus('pending');
      render();
      // Reintentar sincronización con Supabase
      await retrySync(render);
    } else {
      stateStore.state = result.state;
      persistLocalState(result.state);
      updateSaveStatus('saved');
      render();
    }
  } catch (error) {
    console.warn("Carga remota fallida:", error);
    if (stateStore.state) {
      updateSaveStatus('offline', 'Fuera de línea (copia local)');
      render();
      toast('Modo fuera de línea: usando copia local.');
    } else {
      updateSaveStatus('error');
      $('#main').innerHTML = `
        <div class="connection-error">
          <h2>No se pudo abrir el registro.</h2>
          <p>${esc(error.message)}</p>
          <p class="muted">Comprueba la conexión con Supabase.</p>
          <a class="btn btn-primary" href="/">Volver a intentar</a>
        </div>`;
    }
  }
}

load();
