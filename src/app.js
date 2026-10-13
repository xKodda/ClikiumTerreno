// ============================================================================
// CLIKIUM TERRENO — MODULAR FRONTEND APP (ES MODULE)
// ============================================================================

import {
  $, esc, num, uid, now, today, dateLabel, timeOnly, icon, toast,
  sectorUsesPk, pkNumber, normalizePk, nameKey, statusClass, badge, controlBadges,
  layerLabel, activityStage, getActivityStatus, getControlStatus,
  requiredControlsLabel, findAssignedActivity, textarea
} from './utils.js';

import {
  stateStore, selectedDay, allActivities, foremanId, amount, metadata,
  save, editDay, updateSaveStatus, retrySync, upload
} from './state.js';

import {
  modal, showDialog, startForm, activityForm, resourceForm, multiPersonForm,
  copyYesterdayCrewForm, controlForm, annulForm, updateQuantityForm,
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
  $('#project-name').textContent = stateStore.state?.settings?.project || 'Túnel Lo Ruiz';
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

  $('#main').innerHTML = renderer();
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
      await signOut();
      window.location.reload();
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
    if (action === 'open-day') { stateStore.selectedDayId = id; stateStore.pendingScope = 'today'; stateStore.view = 'today'; render(); return; }
    if (action === 'report') { stateStore.selectedDayId = id; stateStore.view = 'report'; render(); return; }
    if (action === 'print') { await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); return window.print(); }
    if (action === 'clear-history') { stateStore.historySearch = ''; stateStore.historyMonth = ''; render(); return; }
    if (action === 'day-notes') {
      const day = stateStore.state.days.find(d => d.id === id);
      return showDialog('Observaciones de jornada', 'Incidencias, interferencias o temas pendientes.', `<div class="form-grid">${textarea('notes', 'Observaciones', day.notes)}</div>`, { form: 'notes', dayId: id });
    }
    if (action === 'close-day') {
      const day = stateStore.state.days.find(d => d.id === id);
      return showDialog('Cerrar jornada', `${day.activities.length} actividades · ${day.activities.filter(a => activityStage(a) === 'En curso').length} en curso · ${day.activities.filter(a => getActivityStatus(a) === 'Control pendiente').length} controles pendientes.`, `<p>El cierre bloquea la edición de avances y recursos. Los controles de laboratorio y topografía podrán agregarse después.</p><div class="form-grid">${textarea('notes', 'Observaciones finales', day.notes)}</div>`, { form: 'close', dayId: id });
    }
    if (action === 'demo') return await demo(render);
    if (action === 'delete-demo') {
      const nextState = structuredClone(stateStore.state);
      nextState.days = nextState.days.filter(d => !d.isDemo);
      await save(nextState);
      stateStore.selectedDayId = null;
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
              <button type="button" class="btn btn-whatsapp" onclick="window.saveAndSendWa()">Guardar y Enviar 📱</button>
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
    updateQuantityForm();
    updateSectorForm();
    updateLayerForm();
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
    updateQuantityForm();
    updateSectorForm();
    updateLayerForm();
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
      const nextState = structuredClone(stateStore.state);
      const id = uid();
      const capataz = stateStore.catalog.capataces.find(p => p.id === val('userId'));
      if (!capataz) throw new Error('Selecciona un capataz registrado.');
      nextState.settings = { ...nextState.settings, project: val('project'), user: capataz.nombre, userId: capataz.id };
      nextState.days.push({
        id, date: val('date'), project: val('project'), user: capataz.nombre, userId: capataz.id,
        isDemo: false, startedAt: now(), closedAt: null, notes: '', activities: [], crew: [], machines: []
      });
      await save(nextState);
      stateStore.selectedDayId = id;
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

        const tripsMode = true;
        const existing = day.activities.find(a => a.id === form.dataset.activityId);
        const capacityVal = number('capacity') || 22;
        const quantity = number('trips') * capacityVal;

        const photoIds = [...(existing?.photoIds || [])];
        form._uploadedPhotos ||= new Map();
        for (const file of form.elements.photos.files) {
          const key = `${file.name}:${file.size}:${file.lastModified}`;
          if (!form._uploadedPhotos.has(key)) form._uploadedPhotos.set(key, await upload(file));
          photoIds.push(form._uploadedPhotos.get(key));
        }

        const layerTypeVal = val('layerType') || 'terraplen_4';
        const isCapa = ['terraplen_4', 'terraplen_6', 'relleno_estructural_3', 'relleno', 'marina'].includes(layerTypeVal);
        const newLayer = isCapa ? number('layer') : 0;
        const newPkStart = pkStartVal, newPkEnd = pkEndVal, newUnit = 'm³', newSector = val('sector');
        const reqCtrl = val('requiredControls') || 'both';
        const stageVal = val('stage') || 'Terminado';

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
          id: existing?.id || uid(), sector: newSector, activity: val('activity'), process: val('process'),
          layer: newLayer, layerType: layerTypeVal, pkStart: newPkStart, pkEnd: newPkEnd,
          requiredControls: reqCtrl, unit: newUnit, mode: tripsMode ? 'trips' : 'manual',
          quantity, trips: tripsMode ? number('trips') : 0, capacity: number('capacity') || 22,
          stage: stageVal, description: val('description'), notes: val('notes'),
          createdAt: existing?.createdAt || now(), photoIds: [...new Set(photoIds)], controls,
          ...(existing?.isAnnulled ? { isAnnulled: existing.isAnnulled, annulReason: existing.annulReason, annulledAt: existing.annulledAt, annulledBy: existing.annulledBy } : {})
        };
        if (existing) Object.assign(existing, record); else day.activities.push(record);

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

async function load() {
  window.addEventListener('online', () => retrySync(render));
  const pendingLocal = localStorage.getItem('clikium_terreno_pending_state');
  if (pendingLocal) {
    try {
      stateStore.pendingSyncState = JSON.parse(pendingLocal);
      updateSaveStatus('pending');
    } catch (e) {}
  }

  try {
    const session = await checkSession();
    if (!session) {
      $('#main').innerHTML = `
        <div class="flex items-center justify-center min-h-[70vh] px-4">
          <div class="bg-white border border-slate-200/80 p-6 sm:p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
            <div class="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
              <span class="text-xl text-white font-bold tracking-tight">C</span>
            </div>
            <h2 class="text-xl font-bold text-slate-900 mb-1">Clikium Terreno</h2>
            <p class="text-slate-500 mb-5 text-xs">Acceso a faena</p>
            
            <form id="login-form" onsubmit="event.preventDefault(); window.loginUser();" class="space-y-3">
              <input type="email" id="login-email" placeholder="tu@correo.com" required autocomplete="email" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-base outline-none focus:border-slate-800 transition-colors">
              
              <div id="password-field-wrap" style="display:none">
                <input type="password" id="login-password" placeholder="Contraseña de acceso" autocomplete="current-password" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-base outline-none focus:border-slate-800 transition-colors">
              </div>

              <button type="submit" id="login-submit-btn" class="w-full py-3 bg-slate-900 hover:bg-black text-white text-sm font-semibold rounded-xl shadow transition-all active:scale-98">Ingresar</button>
              
              <div class="pt-1">
                <button type="button" id="toggle-pw-btn" class="text-xs text-slate-500 hover:text-slate-800 underline bg-transparent border-0 cursor-pointer p-1" onclick="window.togglePwMode()">
                  ¿Ingresar con contraseña?
                </button>
              </div>
            </form>
          </div>
        </div>`;
      
      let usePassword = false;
      window.togglePwMode = (forceState = null) => {
        usePassword = forceState !== null ? forceState : !usePassword;
        const pwWrap = $('#password-field-wrap');
        const pwInput = $('#login-password');
        const toggleBtn = $('#toggle-pw-btn');
        const submitBtn = $('#login-submit-btn');
        if (pwWrap) pwWrap.style.display = usePassword ? 'block' : 'none';
        if (pwInput) pwInput.required = usePassword;
        if (toggleBtn) toggleBtn.textContent = usePassword ? '¿Ingresar con enlace al correo?' : '¿Ingresar con contraseña?';
        if (submitBtn) submitBtn.textContent = usePassword ? 'Iniciar sesión' : 'Ingresar';
      };

      window.loginUser = async () => {
        const email = $('#login-email').value.trim();
        if (!email) return;
        const btn = $('#login-submit-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Verificando…'; }

        // Si el modo contraseña está activo o hay contraseña escrita
        const password = $('#login-password')?.value || '';
        if (usePassword || password) {
          try {
            await signInWithPassword(email, password);
            window.location.reload();
            return;
          } catch (pwErr) {
            alert('Error con contraseña: ' + pwErr.message);
            if (btn) { btn.disabled = false; btn.textContent = 'Iniciar sesión'; }
            return;
          }
        }

        try {
          await signInWithOtp(email);
          $('#main').innerHTML = `
            <div class="flex items-center justify-center min-h-[70vh] px-4">
              <div class="bg-white border border-slate-200/80 p-6 sm:p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
                <div class="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4 text-white text-xl shadow-md">
                  ✓
                </div>
                <h2 class="text-lg font-bold text-slate-900 mb-1">Enlace enviado</h2>
                <p class="text-slate-500 text-xs mb-4">Revisa la bandeja de<br><strong class="text-slate-800">${esc(email)}</strong></p>
                
                <div id="otp-container" class="mt-4 pt-4 border-t border-slate-100">
                  <div class="space-y-2">
                    <input type="text" id="login-otp" placeholder="Código de 6 dígitos" maxlength="8" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center text-base font-semibold tracking-widest text-slate-800 outline-none focus:border-slate-800">
                    <button type="button" class="w-full py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow" onclick="window.submitOtp('${esc(email)}')">Validar código</button>
                  </div>
                </div>
              </div>
            </div>`;

          window.submitOtp = async (em) => {
            const token = $('#login-otp').value.trim();
            if (!token) return alert('Ingresa el código.');
            try {
              await verifyOtp(em, token);
              window.location.reload();
            } catch (err) {
              alert('Código inválido: ' + err.message);
            }
          };
        } catch (e) {
          if (e.message && e.message.toLowerCase().includes('rate limit')) {
            window.togglePwMode(true);
            alert('Límite de correos por hora superado en Supabase. Puedes ingresar inmediatamente con tu contraseña:');
          } else {
            alert('Error: ' + e.message);
          }
          if (btn) { btn.disabled = false; btn.textContent = 'Ingresar'; }
        }
      };
      return;
    }

    const result = await loadState();
    
    stateStore.catalog = result.catalog;

    if (stateStore.pendingSyncState && stateStore.pendingSyncState.state) {
      stateStore.state = stateStore.pendingSyncState.state;
      stateStore.version = result.version;
      stateStore.media = result.media;
      updateSaveStatus('pending');
      retrySync(render);
    } else {
      stateStore.state = result.state;
      stateStore.version = result.version;
      stateStore.media = result.media;
      updateSaveStatus('saved');
    }
    render();
  } catch (error) {
    if (stateStore.pendingSyncState && stateStore.pendingSyncState.state) {
      stateStore.state = stateStore.pendingSyncState.state;
      stateStore.version = stateStore.pendingSyncState.version || 1;
      updateSaveStatus('pending');
      render();
      toast('Modo fuera de línea: usando borrador local.');
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
