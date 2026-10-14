// ============================================================================
// CLIKIUM TERRENO — FORMULARIOS Y DIÁLOGOS (ES MODULE)
// ============================================================================

import {
  $, esc, num, stamp, today, now, uid, dateLabel, icon, input, select,
  textarea, statusClass, badge, controlBadges, layerLabel, activityLabel,
  activityStage, getActivityStatus, requiredControlsLabel, sectorUsesPk,
  pkNumber, normalizePk, nameKey, toast, findAssignedActivity,
  projectDisplayName, normalizeProjectId, PROJECT_MATERIALS,
  TRANSFER_DESTINATIONS, TRANSFER_PURPOSES, isLoadingActivity,
  isTransferActivity, isLayerActivity, formatActivityMeta, parseActivityMeta
} from './utils.js';
import {
  stateStore, selectedDay, allActivities, metadata, amount, capatazField,
  sectorSelect, save, getMediaUrl
} from './state.js';

export const modal = $('#modal');

export function showDialog(title, subtitle, body, { form = '', dayId = '', activityId = '', recordId = '' } = {}) {
  $('#modal-content').innerHTML = `
    <div class="dialog-header">
      <div>
        <h2 id="dialog-title">${esc(title)}</h2>
        <p>${esc(subtitle)}</p>
      </div>
      <button class="close-dialog" data-action="close-modal" aria-label="Cerrar">×</button>
    </div>
    ${form ? `<form id="dialog-form" data-form="${form}" data-day-id="${esc(dayId)}" data-activity-id="${esc(activityId)}" data-record-id="${esc(recordId)}">${body}<div class="form-error" role="alert"></div><div class="form-footer"><button type="button" class="btn btn-secondary" data-action="close-modal">Cancelar</button><button class="btn btn-primary" type="submit">Guardar</button></div></form>` : body}`;
  modal.setAttribute('aria-labelledby', 'dialog-title');
  if (!modal.open) modal.showModal();
}

export function startForm() {
  const s = stateStore.state?.settings || {};
  const projDisplay = projectDisplayName(s.project);
  const projId = normalizeProjectId(s.project);
  showDialog('Iniciar jornada', 'La jornada queda asociada a fecha, capataz y proyecto.', `<div class="form-grid">${input('date', 'Fecha', today(), 'type="date" required')}${capatazField()}<label class="field"><span>Proyecto</span><input type="text" value="${esc(projDisplay)}" readonly style="background:#f8fafc;font-weight:600;color:#1e293b"><input type="hidden" name="project" value="${esc(projId)}"></label></div>`, { form: 'start' });
}

export function updateQuantityForm() {
  const form = $('#dialog-form'); if (form?.dataset.form !== 'activity') return;
  const tTotal = $('#trip-total');
  const t = Number(form.elements.trips?.value) || 0, c = Number(form.elements.capacity?.value) || 22;
  if (tTotal) {
    tTotal.textContent = t ? `Volumen calculado: ${num(t * c)} m³ (${t} viajes × ${num(c)} m³)` : '';
  }
}

export function updateSectorForm() {
  const form = $('#dialog-form'); if (form?.dataset.form !== 'activity') return;
  const sector = form.elements.sector?.value || '';
  const pkFields = $('#pk-fields');
  if (pkFields) {
    const show = sectorUsesPk(sector);
    pkFields.hidden = !show;
    if (form.elements.pkStart) {
      form.elements.pkStart.required = show;
      if (!show) form.elements.pkStart.value = '';
    }
    if (form.elements.pkEnd) {
      form.elements.pkEnd.required = show;
      if (!show) form.elements.pkEnd.value = '';
    }
  }
}

export function updateLayerForm() {
  const form = $('#dialog-form'); if (form?.dataset.form !== 'activity') return;
  const lType = form.elements.layerType?.value || '';
  const numWrap = $('#layer-num-wrapper');
  if (numWrap) {
    const showNum = ['terraplen_4', 'terraplen_6', 'relleno_estructural_3', 'relleno', 'marina'].includes(lType);
    numWrap.hidden = !showNum;
    if (form.elements.layer) {
      form.elements.layer.required = showNum;
      form.elements.layer.disabled = !showNum;
      const labelSpan = numWrap.querySelector('span');
      if (labelSpan) {
        labelSpan.textContent = lType === 'marina' ? 'N° de capa de marina' : 'N° de capa';
      }
    }
  }
  const processSel = form.elements.process;
  if (processSel) {
    if (lType === 'terraplen_4' || lType === 'terraplen_6') {
      if (['Movimiento de tierra', 'Relleno estructural', 'Otro'].includes(processSel.value)) {
        processSel.value = 'Terraplén';
      }
    } else if (lType === 'relleno_estructural_3') {
      if (['Movimiento de tierra', 'Terraplén', 'Otro'].includes(processSel.value)) {
        processSel.value = 'Relleno estructural';
      }
    }
  }
}

export function updateActivityForm() {
  const form = $('#dialog-form'); if (form?.dataset.form !== 'activity') return;
  const act = form.elements.activity?.value || '';

  // 1. Visibilidad de Material
  const matSec = $('#material-section');
  if (matSec) {
    const showMat = isLoadingActivity(act) || act.includes('Descarga') || act.includes('Extendido') || act.includes('Compactación');
    matSec.hidden = !showMat;
    if (form.elements.material) form.elements.material.disabled = !showMat;
  }

  // 2. Visibilidad de Traslado (Destino y Finalidad)
  const transferSec = $('#transfer-section');
  if (transferSec) {
    const showTransfer = isTransferActivity(act);
    transferSec.hidden = !showTransfer;
    if (form.elements.transferDestination) form.elements.transferDestination.disabled = !showTransfer;
    if (form.elements.transferPurpose) form.elements.transferPurpose.disabled = !showTransfer;
  }

  // 3. Visibilidad de Capa (se oculta en carguío puro o traslado)
  const layerSec = $('#layer-section');
  if (layerSec) {
    const showLayer = isLayerActivity(act);
    layerSec.hidden = !showLayer;
    if (form.elements.layerType) form.elements.layerType.disabled = !showLayer;
    if (form.elements.layer) form.elements.layer.disabled = !showLayer;
  }

  updateQuantityForm();
  updateSectorForm();
  updateLayerForm();
}

export function repeatPreviousActivity(dayId) {
  const form = $('#dialog-form'); if (!form || form.dataset.form !== 'activity') return;
  const day = stateStore.state.days.find(d => d.id === dayId);
  const lastAct = day?.activities.filter(a => !a.isAnnulled).at(-1) || allActivities().filter(a => !a.isAnnulled && !a.day.isDemo).at(-1);
  if (!lastAct) return toast('No hay actividades anteriores para repetir.');

  const meta = parseActivityMeta(lastAct.description);
  if (form.elements.activity) form.elements.activity.value = lastAct.activity || 'Carguío';
  if (form.elements.material && (lastAct.material || meta.material)) form.elements.material.value = lastAct.material || meta.material;
  if (form.elements.transferDestination && (lastAct.transferDestination || meta.destination)) form.elements.transferDestination.value = lastAct.transferDestination || meta.destination;
  if (form.elements.transferPurpose && (lastAct.transferPurpose || meta.purpose)) form.elements.transferPurpose.value = lastAct.transferPurpose || meta.purpose;
  if (form.elements.process) form.elements.process.value = lastAct.process || 'Movimiento de tierra';
  if (form.elements.sector) form.elements.sector.value = lastAct.sector || 'Eje 48';
  if (form.elements.layerType) form.elements.layerType.value = lastAct.layerType || 'terraplen_4';
  if (form.elements.layer) form.elements.layer.value = lastAct.layer || 1;
  if (form.elements.pkStart) form.elements.pkStart.value = lastAct.pkStart || '';
  if (form.elements.pkEnd) form.elements.pkEnd.value = lastAct.pkEnd || '';
  if (form.elements.unit) form.elements.unit.value = lastAct.unit || 'm³';
  if (form.elements.requiredControls) form.elements.requiredControls.value = lastAct.requiredControls || 'both';
  if (form.elements.mode) form.elements.mode.value = lastAct.mode === 'trips' ? 'Viajes de tolva' : 'Cantidad manual';
  if (form.elements.capacity) form.elements.capacity.value = lastAct.capacity || 22;
  if (form.elements.quantity) form.elements.quantity.value = '';
  if (form.elements.trips) form.elements.trips.value = '';
  if (form.elements.stage) form.elements.stage.value = 'Terminado';
  if (form.elements.description) form.elements.description.value = '';
  if (form.elements.notes) form.elements.notes.value = '';

  updateActivityForm();
  toast('Datos copiados de la actividad anterior. Completa cantidad y fotos.');
}

export function activityForm(dayId, activityId = '', preset = '') {
  const day = stateStore.state.days.find(d => d.id === dayId);
  if (!day || day.closedAt) return toast('La jornada está cerrada. Puedes agregar controles al registro.');
  const a = day.activities.find(x => x.id === activityId);
  const templates = {
    excavation: { activity: 'Excavación', material: 'Excavación TCN', process: 'Movimiento de tierra', unit: 'm³', requiredControls: 'top', layerType: 'sello_natural', stage: 'Terminado' },
    fill: { activity: 'Descarga, extendido y compactado', material: 'Relleno estructural bajo 3"', process: 'Relleno estructural', unit: 'm³', requiredControls: 'both', layerType: 'relleno_estructural_3', layer: 1, stage: 'Terminado' },
    compact: { activity: 'Compactación', material: 'Terraplén bajo 4"', process: 'Terraplén', unit: 'capas', requiredControls: 'both', layerType: 'terraplen_4', layer: 1, stage: 'Terminado' }
  };

  const parsedMeta = parseActivityMeta(a?.description || '');
  const value = a ? {
    ...a,
    material: a.material || parsedMeta.material || 'Marina',
    transferDestination: a.transferDestination || parsedMeta.destination || 'Centro de acopio',
    transferPurpose: a.transferPurpose || parsedMeta.purpose || 'Mejoramiento de camino',
    cleanDesc: parsedMeta.cleanDescription
  } : {
    sector: 'Eje 48',
    activity: 'Carguío',
    material: 'Marina',
    transferDestination: 'Centro de acopio',
    transferPurpose: 'Mejoramiento de camino',
    process: 'Movimiento de tierra',
    requiredControls: 'both',
    layer: 1,
    layerType: 'terraplen_4',
    pkStart: '',
    pkEnd: '',
    unit: 'm³',
    quantity: 0,
    mode: 'manual',
    trips: 0,
    capacity: 22,
    stage: 'Terminado',
    description: '',
    cleanDesc: '',
    notes: '',
    ...(templates[preset] || {})
  };

  // Map legacy layerType values if editing existing record
  if (value.layerType === 'sello') value.layerType = 'sello_natural';
  if (value.layerType === 'relleno' || !value.layerType) {
    value.layerType = value.process === 'Terraplén' ? 'terraplen_4' : (value.layer ? 'relleno_estructural_3' : 'terraplen_4');
  }

  const defaultActivities = [
    'Carguío', 'Carguío y traslado', 'Carguío y extendido',
    'Excavación', 'Escarpe',
    'Descarga', 'Descarga y extendido', 'Extendido', 'Extendido y compactado',
    'Compactación', 'Descarga, extendido y compactado',
    'Perfilado y compactación', 'Perfilado', 'Humectación',
    'Instalación de tubos', 'Mejoramiento de sello', 'Cama de apoyo', 'Obras civiles'
  ];
  const activityList = [...defaultActivities];
  if (value.activity && !activityList.includes(value.activity)) {
    activityList.push(value.activity);
  }

  const layerTypeOptions = [
    { value: 'terraplen_4', label: 'Terraplén (Material bajo 4")' },
    { value: 'terraplen_6', label: 'Terraplén (Material bajo 6")' },
    { value: 'relleno_estructural_3', label: 'Relleno estructural (Material bajo 3")' },
    { value: 'sello_natural', label: 'Sello natural' },
    { value: 'sello_mejorado', label: 'Sello mejorado' },
    { value: 'marina', label: 'Marina' }
  ];

  const requiredOptions = [
    { value: 'both', label: 'Laboratorio y Topografía' },
    { value: 'lab', label: 'Solo Laboratorio' },
    { value: 'top', label: 'Solo Topografía' },
    { value: 'none', label: 'Sin control (Registro completo)' }
  ];

  const hasPrevious = !!(day.activities.find(act => !act.isAnnulled) || allActivities().find(act => !act.isAnnulled && !act.day.isDemo));
  const repeatBar = !a && hasPrevious ? `<div class="repeat-bar"><span class="repeat-text">¿Registrando lo mismo? Copia los datos anteriores.</span><button type="button" class="btn btn-repeat" data-action="repeat-previous" data-day-id="${esc(dayId)}">${icon('history')} Repetir anterior</button></div>` : '';
  const openDetails = a && (value.cleanDesc || a.notes || a.process !== 'Movimiento de tierra');

  showDialog(
    a ? 'Editar avance' : 'Registrar avance',
    'El avance físico y la aprobación de calidad se registran por separado.',
    `${repeatBar}<div class="form-grid">
      ${select('activity', 'Actividad', activityList, value.activity)}
      ${sectorSelect(value.sector)}

      <div class="field full" id="material-section">
        <div class="form-grid">
          ${select('material', 'Material cargado / intervenido', PROJECT_MATERIALS, value.material || 'Marina')}
        </div>
      </div>

      <div class="field full" id="transfer-section">
        <div class="form-grid">
          ${select('transferDestination', 'Destino del traslado', TRANSFER_DESTINATIONS, value.transferDestination || 'Centro de acopio')}
          ${select('transferPurpose', 'Finalidad / Uso del traslado', TRANSFER_PURPOSES, value.transferPurpose || 'Mejoramiento de camino')}
        </div>
      </div>

      <div id="pk-fields" class="field full">
        <div class="form-grid">
          ${input('pkStart', 'PK inicial', value.pkStart, 'placeholder="Ej: 1179.42 o 1+179.42" title="Ingresa los metros o formato PK"')}
          ${input('pkEnd', 'PK final', value.pkEnd, 'placeholder="Ej: 1600 o 1+600" title="Ingresa los metros o formato PK"')}
          <span class="hint" style="grid-column:1/-1;margin-top:-6px">Ingresa los metros (ej. <b>1179.42</b> o <b>1600</b>) y se guardará como <b>1+179.42</b> a <b>1+600</b>. Admite también <b>PK 0</b> (0+000).</span>
        </div>
      </div>

      <div class="field full" id="layer-section">
        <div class="form-grid">
          ${select('layerType', 'Tipo de capa', layerTypeOptions, value.layerType)}
          <div id="layer-num-wrapper">
            ${input('layer', 'Número de capa', value.layer || 1, 'type="number" min="1" max="500" step="1" placeholder="Ej: 1"')}
          </div>
        </div>
      </div>

      ${select('stage', 'Estado de ejecución', ['Terminado', 'En curso'], value.stage || 'Terminado')}
      ${select('requiredControls', 'Exigencia de control', requiredOptions, value.requiredControls || 'both')}

      <div class="form-divider">Cantidad ejecutada (Medición por viajes de tolva)</div>
      <div class="field full">
        <div class="form-grid">
          ${input('trips', 'Número de viajes', value.trips || '', 'type="number" min="0" max="100000" step="1" required')}
          ${input('capacity', 'Capacidad por tolva (m³)', value.capacity || 22, 'type="number" min="0.1" max="1000" step="0.01" required')}
        </div>
      </div>
      <div id="trip-total" class="computed"></div>

      <label class="field full">
        <span>Fotos del avance</span>
        <input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple>
        <span class="hint">Se guardan con esta jornada, sector, actividad, capa y PK. Máximo 12 MB por foto. ${a ? 'Las fotos anteriores se conservan.' : ''}</span>
      </label>

      <details class="form-details" ${openDetails ? 'open' : ''}>
        <summary class="details-summary"><span>Observaciones y detalles opcionales</span></summary>
        <div class="form-grid" style="margin-top:14px">
          ${select('process', 'Proceso', ['Movimiento de tierra', 'Relleno estructural', 'Terraplén', 'Subrasante', 'Base estabilizada', 'Bajo 4 pulgadas', 'Obra de arte', 'Muros TEM', 'Otro'], value.process)}
          ${textarea('description', 'Descripción para el informe / foto', value.cleanDesc || value.description || '')}
          ${textarea('notes', 'Observaciones o interferencias', value.notes || '')}
        </div>
      </details>
    </div>`,
    { form: 'activity', dayId, activityId }
  );

  const form = $('#dialog-form');
  if (form) {
    const handlePkBlur = e => {
      if (e.target.value.trim()) {
        const norm = normalizePk(e.target.value);
        if (norm) e.target.value = norm;
      }
    };
    if (form.elements.pkStart) form.elements.pkStart.addEventListener('blur', handlePkBlur);
    if (form.elements.pkEnd) form.elements.pkEnd.addEventListener('blur', handlePkBlur);
  }

  updateActivityForm();
}

export function detail(dayId, activityId) {
  const day = stateStore.state.days.find(d => d.id === dayId);
  const a = day?.activities.find(x => x.id === activityId);
  if (!a) return;
  const overall = getActivityStatus(a);
  const stage = activityStage(a);
  const meta = parseActivityMeta(a.description);
  const photos = a.photoIds.map(id => {
    const m = metadata(id);
    const url = getMediaUrl(id) || `/api/media/${id}`;
    return `<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${esc(meta.cleanDescription || a.activity)}"><span class="photo-label">${esc(m?.name || 'Foto de avance')}</span></a>`;
  }).join('');
  const annulBox = a.isAnnulled ? `<div class="annulled-box"><strong>REGISTRO ANULADO POR ERROR</strong><br>Motivo de anulación: ${esc(a.annulReason || 'Registrado por error')}<br><small>Anulado por ${esc(a.annulledBy || 'Capataz')} el ${stamp(a.annulledAt || a.createdAt)}</small></div>` : '';
  const pkLabel = (sectorUsesPk(a.sector) && a.pkStart) ? `PK ${esc(a.pkStart)}${a.pkStart !== a.pkEnd && a.pkEnd ? ` — ${esc(a.pkEnd)}` : ''}` : `Ubicación por sector (${esc(a.sector)})`;
  const layerBadge = layerLabel(a) !== 'Sin capa' ? `<span class="badge">${esc(layerLabel(a))}</span>` : '';
  const matBadge = (a.material || meta.material) ? `<span class="badge">Material: ${esc(a.material || meta.material)}</span>` : '';
  const transferInfo = (a.transferDestination || meta.destination || a.transferPurpose || meta.purpose) ? `<div style="font-size:0.85rem;color:#334155;margin-top:6px"><strong>Traslado:</strong> ${esc(a.transferDestination || meta.destination || '')}${a.transferPurpose || meta.purpose ? ` · Finalidad: ${esc(a.transferPurpose || meta.purpose)}` : ''}</div>` : '';

  const actCrew = day.crew.filter(p => findAssignedActivity(p, day)?.id === a.id);
  const actMachines = day.machines.filter(m => findAssignedActivity(m, day)?.id === a.id);
  const actHh = actCrew.reduce((n, p) => n + p.hours + p.extra, 0);
  const crewSection = `
    <div style="margin-top:16px;background:#f8fafc;padding:12px 14px;border-radius:8px;border:1px solid #e2e8f0">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div><strong>Personal y maquinaria asignada</strong><br><span class="muted">${actCrew.length} personas · ${num(actHh)} HH</span></div>
        ${!day.closedAt ? `<button class="btn btn-sm btn-secondary" data-action="assign-crew" data-id="${a.id}" data-day-id="${day.id}">${icon('people')} + Asignar cuadrilla</button>` : ''}
      </div>
      ${actCrew.length ? `<div style="font-size:0.85rem;line-height:1.5">${actCrew.map(p => `<div>• <strong>${esc(p.name)}</strong> (${esc(p.role)}): ${num(p.hours)}h + ${num(p.extra)}h extra = <strong>${num(p.hours + p.extra)} HH</strong></div>`).join('')}</div>` : '<p class="muted" style="margin:0;font-size:0.83rem">No hay trabajadores vinculados directamente a esta actividad.</p>'}
      ${actMachines.length ? `<div style="font-size:0.85rem;margin-top:8px;line-height:1.5;border-top:1px dashed #cbd5e1;padding-top:6px">${actMachines.map(m => `<div>[Equipo] <strong>${esc(m.name)}</strong> (Op: ${esc(m.operator || 'Sin operador')}): ${num(m.hours)} h op · ${num(m.standby)} h stand-by</div>`).join('')}</div>` : ''}
    </div>`;

  showDialog(
    a.activity,
    `${a.sector} · ${a.process} · ${day.date}`,
    `${annulBox}
    <div class="detail-meta">
      ${badge(overall)}
      <span class="badge dark">Exigencia: ${esc(requiredControlsLabel(a.requiredControls))}</span>
      ${controlBadges(a)}
      <span class="badge ${stage === 'Terminado' ? 'approved' : ''}">${esc(stage)}</span>
      ${layerBadge}
      ${matBadge}
    </div>
    <div class="detail-grid">
      <div>Tramo<br><strong>${pkLabel}</strong></div>
      <div>Cantidad ejecutada<br><strong>${amount(a)}</strong>${a.mode === 'trips' ? `<br>${a.trips} viajes × ${num(a.capacity)} m³` : ''}</div>
    </div>
    ${transferInfo}
    ${meta.cleanDescription ? `<p class="detail-description">${esc(meta.cleanDescription)}</p>` : ''}
    ${a.notes ? `<p class="detail-description muted">${esc(a.notes)}</p>` : ''}
    ${photos ? `<div class="photo-grid">${photos}</div>` : ''}
    ${crewSection}
    <div class="section-head">
      <h3>Historial de controles</h3>
      ${!a.isAnnulled && a.requiredControls !== 'none' ? `<button class="text-button" data-action="add-control" data-id="${a.id}" data-day-id="${day.id}">Agregar control</button>` : ''}
    </div>
    <div class="timeline">${a.controls.map((c, i) => {
      const isNoReq = a.requiredControls === 'none';
      const resolved = (c.status === 'Control pendiente' || c.status === 'Registro completo') && ['Aprobado', 'Registro completo', 'No requiere control'].includes(overall) && i < a.controls.length - 1;
      const resolvedAt = resolved ? a.controls.at(-1).at : null;
      const itemStatus = isNoReq ? 'Registro completo' : c.status;
      return `<div class="timeline-item ${resolved ? 'resolved' : statusClass(itemStatus)}">
        ${resolved ? `<span class="badge resolved-badge">Control pendiente</span> <span class="badge approved">Resuelto</span>` : badge(itemStatus)}
        <div class="meta">${stamp(c.at)} · ${esc(c.type)} · ${esc(c.author)}</div>
        ${c.note ? `<div>${esc(c.note)}</div>` : (isNoReq ? '<div>Registro de ejecución física completo. No requiere ensayos ni recepción de calidad.</div>' : '')}
        ${resolved ? `<div class="resolved-note">Cerrado por los controles aprobados el ${stamp(resolvedAt)}.</div>` : ''}
        ${c.attachmentId ? `<a href="/api/media/${c.attachmentId}" target="_blank" rel="noopener">Ver protocolo adjunto</a>` : ''}
      </div>`;
    }).join('')}</div>
    ${!day.closedAt && !a.isAnnulled ? `<div class="form-footer" style="gap:10px;flex-wrap:wrap"><button class="btn btn-secondary" data-action="edit-activity" data-id="${a.id}" data-day-id="${day.id}">Editar avance / fotos</button><button class="btn btn-danger-outline" data-action="annul-activity" data-id="${a.id}" data-day-id="${day.id}">Anular avance (por error)</button></div>` : (day.closedAt ? '<p class="hint">Jornada cerrada. El historial sigue admitiendo nuevos controles.</p>' : '')}`
  );
}

export function annulForm(dayId, activityId) {
  const day = stateStore.state.days.find(d => d.id === dayId);
  if (!day || day.closedAt) return toast('La jornada está cerrada. No se pueden modificar registros.');
  const a = day.activities.find(x => x.id === activityId);
  if (!a || a.isAnnulled) return toast('El registro ya fue anulado.');
  const pkStr = (sectorUsesPk(a.sector) && a.pkStart) ? ` PK ${a.pkStart} - ${a.pkEnd}` : '';
  showDialog('Anular avance por error', `Actividad: ${a.activity} (${a.sector}${pkStr})`, `<p class="hint" style="margin-bottom:14px">El registro se conservará en el historial para auditoría, pero no sumará volumen ni figurará en los controles pendientes activos.</p><div class="form-grid">${textarea('annulReason', 'Motivo de anulación (obligatorio)', '')}</div>`, { form: 'annul', dayId, activityId });
}

export function controlForm(dayId, activityId) {
  const s = stateStore.state?.settings || {};
  showDialog('Registrar control', 'Cada cambio queda como un evento nuevo, con fecha y hora.', `<div class="form-grid">${select('type', 'Tipo de control', ['Laboratorio', 'Topografía', 'General'], 'Laboratorio')}${select('status', 'Resultado', ['Control pendiente', 'Rechazado', 'Aprobado'], 'Control pendiente')}${input('author', 'Responsable', s.user || '', 'required maxlength="150"')}${textarea('note', 'Observación / número de protocolo')}<label class="field full"><span>Foto o PDF del protocolo</span><input name="attachment" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"><span class="hint">Máximo 12 MB. Este registro conserva la hora en que fue ingresado.</span></label></div>`, { form: 'control', dayId, activityId });
}

export function resourceForm(dayId, type, recordId = '') {
  const day = stateStore.state.days.find(d => d.id === dayId); if (!day || day.closedAt) return;
  const person = type === 'person', list = person ? day.crew : day.machines;
  const record = list.find(x => x.id === recordId) || (person ? { name: '', role: 'M1', hours: 8, extra: 0, assignment: '' } : { name: 'Excavadora CAT 323 · I-36', operator: 'César Luncumilla', hours: 8, standby: 0, assignment: '' });
  const workerCatalog = stateStore.catalog.trabajadores || [{ name: 'Juan Calfula', role: 'M1' }, { name: 'Darwin Morales', role: 'Operador' }, { name: 'Ruperto Soto', role: 'M1' }, { name: 'Juan Layten', role: 'M1' }, { name: 'Bastián Delgado', role: 'Carcheck' }, { name: 'Esteban Coloma', role: 'Capataz' }];
  const machineCatalog = stateStore.catalog.maquinarias || [{ name: 'Excavadora CAT 323 · I-36', operator: 'César Luncumilla' }, { name: 'Camión Tolva Mercedes 2638 · T-12', operator: 'Patricio Rivas' }];

  const actSelectHtml = day.activities.length ? `
    <label class="field full">
      <span>Vincular a actividad del día (a prueba de fallos)</span>
      <select id="single-activity-select" name="activity_link">
        <option value="">-- Sin vincular a actividad específica --</option>
        ${day.activities.map(a => `<option value="${esc(activityLabel(a))}" ${record.assignment === activityLabel(a) ? 'selected' : ''}>${esc(activityLabel(a))}</option>`).join('')}
        <option value="__custom__">Escribir otra labor manual...</option>
      </select>
    </label>` : '';

  showDialog(person ? (recordId ? 'Editar persona' : 'Registrar persona') : (recordId ? 'Editar maquinaria' : 'Registrar maquinaria'), 'Las horas son ingresadas manualmente para esta jornada.', `<div class="form-grid">${input('name', person ? 'Nombre' : 'Equipo / código', record.name, `required maxlength="150" ${person ? 'list="known-people"' : 'list="known-machines"'}`)}${person ? `<datalist id="known-people">${workerCatalog.map(n => `<option value="${esc(n.name)}">${esc(n.name)} (${esc(n.role)})</option>`).join('')}</datalist>` : `<datalist id="known-machines">${machineCatalog.map(m => `<option value="${esc(m.name)}">${esc(m.name)} — Operador: ${esc(m.operator)}</option>`).join('')}</datalist>`}${person ? select('role', 'Cargo', ['M1', 'Operador', 'Carcheck', 'Capataz', 'Supervisor', 'Otro'], record.role) : input('operator', 'Operador', record.operator, 'maxlength="150"')}${input('hours', person ? 'Horas normales efectivas' : 'Horas de operación', record.hours, 'type="number" min="0" max="24" step="0.25" required')}${input(person ? 'extra' : 'standby', person ? 'Horas extra' : 'Stand-by (horas)', person ? record.extra : record.standby, 'type="number" min="0" max="24" step="0.25" required')}${actSelectHtml}<label class="field full"><span>Asignación / motivo de espera</span><input name="assignment" id="single-assignment-input" value="${esc(record.assignment)}" placeholder="Ej.: OA6 capa 7 · excavación / extendido" maxlength="300" list="assignments"><datalist id="assignments">${day.activities.map(a => `<option value="${esc(activityLabel(a))}"></option>`).join('')}</datalist></label></div>`, { form: type, dayId, recordId });
}

export function multiPersonForm(dayId, preselectedActivity = '') {
  const day = stateStore.state.days.find(d => d.id === dayId); if (!day || day.closedAt) return;
  const workerCatalog = stateStore.catalog.trabajadores || [];
  const existingNames = new Set(day.crew.map(p => nameKey(p.name)));

  let defaultAssignment = preselectedActivity;
  if (preselectedActivity) {
    const act = day.activities.find(a => a.id === preselectedActivity);
    if (act) defaultAssignment = activityLabel(act);
  } else if (day.activities.length) {
    defaultAssignment = activityLabel(day.activities[0]);
  }

  const listHtml = workerCatalog.map(w => {
    const isAlready = existingNames.has(nameKey(w.name));
    return `<label class="multi-select-item ${isAlready ? 'disabled' : ''}"><input type="checkbox" name="selected_workers" value="${esc(w.name)}" data-role="${esc(w.role)}" ${isAlready ? 'disabled checked' : ''}><div class="item-info"><strong>${esc(w.name)}</strong><span>${esc(w.role)} ${isAlready ? '· (Ya registrado hoy)' : ''}</span></div></label>`;
  }).join('');

  const actSelectHtml = day.activities.length ? `
    <label class="field full">
      <span>Vincular a actividad registrada:</span>
      <select id="multi-activity-select" name="activity_link">
        ${day.activities.map(a => `<option value="${esc(activityLabel(a))}" ${defaultAssignment === activityLabel(a) ? 'selected' : ''}>${esc(activityLabel(a))}</option>`).join('')}
        <option value="" ${!defaultAssignment ? 'selected' : ''}>Otra labor / Apoyo general</option>
      </select>
    </label>` : '';

  showDialog('Selección múltiple de cuadrilla', 'Marca los trabajadores que asistieron hoy a la jornada.', `<div class="form-grid">${input('default_hours', 'Horas normales', 8, 'type="number" min="0" max="24" step="0.25" required')}${input('default_extra', 'Horas extra', 0, 'type="number" min="0" max="24" step="0.25" required')}${actSelectHtml}<label class="field full"><span>Asignación (texto descriptivo)</span><input name="default_assignment" id="multi-default-assignment" value="${esc(defaultAssignment)}" placeholder="Ej.: OA6 capa 7 · movimiento de tierra" list="assignments"><datalist id="assignments">${day.activities.map(a => `<option value="${esc(activityLabel(a))}"></option>`).join('')}</datalist></label><div class="field full"><span>Selecciona los trabajadores presentes:</span><div class="multi-select-grid" style="margin-top:8px">${listHtml}</div></div></div>`, { form: 'multi-person', dayId });
}

export function copyYesterdayCrewForm(dayId) {
  const day = stateStore.state.days.find(d => d.id === dayId); if (!day || day.closedAt) return;
  const prevDay = [...stateStore.state.days].filter(d => d.id !== day.id && d.date <= day.date && (d.crew.length > 0 || d.machines.length > 0)).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!prevDay) return toast('No hay registros de cuadrilla en jornadas anteriores.');

  const existingCrewNames = new Set(day.crew.map(p => nameKey(p.name)));
  const existingMachineNames = new Set(day.machines.map(m => nameKey(m.name)));

  const crewHtml = prevDay.crew.map(p => {
    const isAlready = existingCrewNames.has(nameKey(p.name));
    return `<label class="multi-select-item ${isAlready ? 'disabled' : ''}"><input type="checkbox" name="copy_crew" value="${esc(p.name)}" data-role="${esc(p.role)}" data-hours="${p.hours}" data-extra="${p.extra}" data-assignment="${esc(p.assignment)}" ${isAlready ? 'disabled checked' : 'checked'}><div class="item-info"><strong>${esc(p.name)}</strong><span>${esc(p.role)} · ${p.hours}h + ${p.extra}h extra ${isAlready ? '· (Ya registrado hoy)' : ''}</span></div></label>`;
  }).join('');

  const machineHtml = prevDay.machines.map(m => {
    const isAlready = existingMachineNames.has(nameKey(m.name));
    return `<label class="multi-select-item ${isAlready ? 'disabled' : ''}"><input type="checkbox" name="copy_machines" value="${esc(m.name)}" data-operator="${esc(m.operator)}" data-hours="${m.hours}" data-standby="${m.standby}" data-assignment="${esc(m.assignment)}" ${isAlready ? 'disabled checked' : 'checked'}><div class="item-info"><strong>${esc(m.name)}</strong><span>Operador: ${esc(m.operator || 'Sin asignar')} · ${m.hours}h op ${isAlready ? '· (Ya registrado hoy)' : ''}</span></div></label>`;
  }).join('');

  showDialog(`Cuadrilla del ${dateLabel(prevDay.date)}`, 'Confirma quiénes asistieron hoy para agregarlos automáticamente.', `<div class="form-grid">${crewHtml ? `<div class="field full"><span>Trabajadores a importar:</span><div class="multi-select-grid" style="margin-top:8px">${crewHtml}</div></div>` : ''}${machineHtml ? `<div class="field full"><span>Maquinaria a importar:</span><div class="multi-select-grid" style="margin-top:8px">${machineHtml}</div></div>` : ''}</div>`, { form: 'copy-crew', dayId, recordId: prevDay.id });
}

export async function demo(onComplete = () => { }) {
  const existing = stateStore.state.days.find(d => d.isDemo);
  if (existing) {
    stateStore.selectedDayId = existing.id;
    stateStore.view = 'today';
    onComplete();
    return;
  }
  const nextState = structuredClone(stateStore.state), dayId = uid();
  const make = (activity, process, sector, layer, pkStart, pkEnd, quantity, unit, requiredControls, labStatus, topStatus, trips = 0, layerType = '') => {
    const controls = requiredControls === 'none'
      ? [{ id: uid(), status: 'Registro completo', type: 'General', author: 'Capataz de ejemplo', note: 'Registro sin control posterior requerido.', at: now(), attachmentId: null }]
      : [{ id: uid(), status: 'Control pendiente', type: 'General', author: 'Capataz de ejemplo', note: 'Registro de ejecución física.', at: now(), attachmentId: null }];
    if (labStatus && labStatus !== 'Control pendiente') controls.push({ id: uid(), status: labStatus, type: 'Laboratorio', author: 'Lab de ejemplo', note: 'Control de densidad / calidad.', at: now(), attachmentId: null });
    if (topStatus && topStatus !== 'Control pendiente') controls.push({ id: uid(), status: topStatus, type: 'Topografía', author: 'Topografía de ejemplo', note: 'Control de nivel y geometría.', at: now(), attachmentId: null });
    return { id: uid(), activity, process, sector, requiredControls, layer, layerType: layerType || (layer ? 'relleno' : ''), pkStart, pkEnd, quantity, unit, mode: trips ? 'trips' : 'manual', trips, capacity: 22, stage: 'Terminado', description: `Ejemplo: ${activity.toLowerCase()} en ${sector}${layer ? ', capa ' + layer : ''}.`, notes: 'Registro demostrativo.', createdAt: now(), photoIds: [], controls };
  };
  nextState.days.push({
    id: dayId, date: today(), project: stateStore.state.settings.project, user: 'Capataz de ejemplo', userId: 'demo', isDemo: true, startedAt: now(), closedAt: null, notes: 'Ejemplo para recorrer el sistema. No corresponde a avance real.',
    activities: [
      make('Carguío y extendido', 'Relleno estructural', 'OA6', 7, '1+260', '1+270', 110, 'm³', 'both', 'Control pendiente', 'Aprobado', 5),
      make('Compactación', 'Relleno estructural', 'OA6', 6, '1+260', '1+270', 1, 'capas', 'both', 'Aprobado', 'Aprobado'),
      make('Excavación', 'Movimiento de tierra', 'Eje 48', 0, '1+220', '1+250', 75, 'm³', 'top', null, 'Control pendiente'),
      make('Instalación de tubos', 'Obra de arte', 'OA6', 0, '1+260', '1+270', 12, 'm lineales', 'none', null, null)
    ],
    crew: [{ id: uid(), name: 'M1 de ejemplo', role: 'M1', hours: 8, extra: 1, assignment: 'OA6 · Relleno estructural · Capa 7' }],
    machines: [{ id: uid(), name: 'CAT 323 · I-36 (ejemplo)', operator: 'Operador de ejemplo', hours: 7, standby: 1, assignment: 'OA6 · Relleno estructural · Capa 7' }]
  });
  await save(nextState);
  stateStore.selectedDayId = dayId;
  stateStore.pendingScope = 'today';
  stateStore.view = 'today';
  onComplete();
  toast('Jornada de ejemplo cargada.');
}
