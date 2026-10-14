// ============================================================================
// CLIKIUM TERRENO — VISTA: JORNADA (ES MODULE)
// ============================================================================

import {
  esc, num, today, dateLabel, timeOnly, icon, primary, empty,
  statusClass, badge, controlBadges, layerLabel, activityStage,
  getActivityStatus, findAssignedActivity, sectorUsesPk
} from '../utils.js';
import { stateStore, selectedDay, amount } from '../state.js';

export function activityCard(a, day) {
  const overall = getActivityStatus(a);
  const pkLabel = (sectorUsesPk(a.sector) && a.pkStart)
    ? `PK <strong>${esc(a.pkStart)}</strong>${a.pkStart !== a.pkEnd && a.pkEnd ? ` — <strong>${esc(a.pkEnd)}</strong>` : ''}`
    : `<strong>Ubicación por sector</strong>`;
  const actCrew = day.crew.filter(p => findAssignedActivity(p, day)?.id === a.id);
  const actMachines = day.machines.filter(m => findAssignedActivity(m, day)?.id === a.id);
  const actHh = actCrew.reduce((n, p) => n + p.hours + p.extra, 0);
  const crewPill = actCrew.length
    ? `<span class="activity-crew-pill">Cuadrilla: ${actCrew.length} pers. (${num(actHh)} HH)${actMachines.length ? ' · Equipos: ' + actMachines.map(m => esc(m.name)).join(', ') : ''}</span>`
    : (!day.closedAt ? `<button type="button" class="crew-shortcut" data-action="assign-crew" data-id="${a.id}" data-day-id="${day.id}">+ Asignar cuadrilla</button>` : '');

  return `<article class="activity-card ${statusClass(overall)}">
    <div class="card-top">
      <div>
        <div class="card-sector">${esc(a.sector)} · ${esc(layerLabel(a)).toUpperCase()}</div>
        <h3>${esc(a.activity)}${a.isAnnulled ? ' (ANULADO)' : ''}</h3>
        <div class="card-process">${esc(a.process)} · ${esc(activityStage(a))}</div>
        ${a.isAnnulled ? `<div class="annulled-note">Motivo de anulación: ${esc(a.annulReason)}</div>` : ''}
        <div class="control-tags" style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          ${controlBadges(a)}
          ${crewPill}
        </div>
      </div>
      ${badge(overall)}
    </div>
    <div class="card-data">
      <span>${pkLabel}</span>
      ${a.mode === 'trips' ? `<span>${num(a.trips)} viajes × ${num(a.capacity)} m³</span>` : ''}
      <span class="quantity">${amount(a)}</span>
    </div>
    <div class="card-bottom">
      <span class="meta">${timeOnly(a.createdAt)} · ${a.photoIds.length} fotos · ${a.controls.length} eventos de control</span>
      <button class="text-button" data-action="detail" data-id="${a.id}" data-day-id="${day.id}">Ver registro</button>
    </div>
  </article>`;
}

export function renderDay() {
  const day = selectedDay();
  if (!day) {
    return `<div class="heading day-heading">
      <div class="day-heading-info">
        <span class="day-date-text">${esc(dateLabel(today()))}</span>
        <h1 class="day-title">Jornada de hoy</h1>
      </div>
    </div>
    <div class="empty empty-start">
      <div class="empty-icon">${icon('day')}</div>
      <h2>Comencemos la jornada.</h2>
      <p>Inicia el día para registrar actividades, fotos y controles del proyecto.</p>
      <button class="btn btn-accent" data-action="start-day">${icon('plus')}Iniciar jornada</button>
      <button class="text-button sample-link" data-action="demo">Ver una jornada de ejemplo</button>
    </div>`;
  }
  const activities = day.activities;
  const activeActivities = activities.filter(a => !a.isAnnulled);
  const annulledCount = activities.filter(a => a.isAnnulled).length;
  const pending = activeActivities.filter(a => getActivityStatus(a) === 'Control pendiente').length;
  const rejected = activeActivities.filter(a => getActivityStatus(a) === 'Rechazado').length;
  const approved = activeActivities.filter(a => getActivityStatus(a) === 'Aprobado').length;
  const completed = activeActivities.filter(a => getActivityStatus(a) === 'Registro completo').length;

  const m3Acts = activeActivities.filter(a => a.unit === 'm³' || a.mode === 'trips');
  const vExcavado = m3Acts.filter(a => a.activity === 'Excavación' || a.activity.includes('Excav')).reduce((n, a) => n + a.quantity, 0);
  const vDescargado = m3Acts.filter(a => a.activity === 'Descarga' || a.activity === 'Carguío').reduce((n, a) => n + a.quantity, 0);
  const vExtendido = m3Acts.filter(a => ['Extendido', 'Carguío y extendido', 'Compactación', 'Perfilado', 'Mejoramiento de sello', 'Cama de apoyo'].includes(a.activity)).reduce((n, a) => n + a.quantity, 0);
  const vOtros = m3Acts.filter(a => !['Excavación', 'Descarga', 'Carguío', 'Extendido', 'Carguío y extendido', 'Compactación', 'Perfilado', 'Mejoramiento de sello', 'Cama de apoyo'].includes(a.activity) && !a.activity.includes('Excav')).reduce((n, a) => n + a.quantity, 0);

  const hh = day.crew.reduce((n, p) => n + p.hours + p.extra, 0);
  const photos = activities.reduce((n, a) => n + a.photoIds.length, 0);

  const isClosed = Boolean(day.closedAt);
  const statusPill = isClosed
    ? `<span class="day-status-pill status-closed">● Cerrada</span>`
    : `<span class="day-status-pill status-open">● En curso</span>`;

  return `<div class="heading day-heading">
    <div class="day-heading-info">
      <div class="day-status-bar">
        ${statusPill}
        <span class="day-date-text">${esc(dateLabel(day.date))}</span>
      </div>
      <h1 class="day-title">${day.date === today() ? 'Jornada de hoy' : 'Jornada de terreno'}</h1>
    </div>
    <div class="heading-actions">
      <button class="btn btn-secondary" data-action="report" data-id="${day.id}">${icon('report')}Informe diario</button>
      ${!day.closedAt 
        ? primary('add-activity', '+ Registrar avance', day.id) 
        : `<button class="btn btn-primary btn-reopen" data-action="reopen-day" data-id="${day.id}">Reabrir jornada</button>`
      }
    </div>
  </div>
  ${day.isDemo ? '<div class="notice">Jornada de ejemplo. Estos registros son demostrativos y no corresponden a producción real. Puedes iniciar tu propia jornada desde Respaldo. <button class="btn btn-sm btn-secondary" data-action="delete-demo" style="margin-left:12px">Eliminar jornada de ejemplo</button></div>' : ''}
  <div class="stats">
    <div class="stat"><div class="stat-label">Actividades registradas</div><div class="stat-value">${activities.length}<small>registros</small></div><div class="stat-note">${activeActivities.filter(a => activityStage(a) === 'Terminado').length} terminadas${annulledCount ? ` · ${annulledCount} anuladas` : ''}</div></div>
    <div class="stat stat-volumes">
      <div class="stat-label">Volumen por trabajo</div>
      <div class="volume-breakdown">
        <div class="vol-item"><span>Excavado:</span><strong>${num(vExcavado)}<small> m³</small></strong></div>
        <div class="vol-item"><span>Descargado:</span><strong>${num(vDescargado)}<small> m³</small></strong></div>
        <div class="vol-item"><span>Extendido:</span><strong>${num(vExtendido)}<small> m³</small></strong></div>
      </div>
      ${vOtros ? `<div class="stat-note">+ ${num(vOtros)} m³ otros trabajos</div>` : '<div class="stat-note">Cantidades separadas por actividad</div>'}
    </div>
    <div class="stat"><div class="stat-label">Control pendiente</div><div class="stat-value">${pending}<small>registros</small></div><div class="stat-note">${rejected} rechazados · ${approved} aprobados${completed ? ` · ${completed} completos` : ''}${annulledCount ? ` · ${annulledCount} anuladas` : ''}</div></div>
    <div class="stat"><div class="stat-label">Horas hombre</div><div class="stat-value">${num(hh)}<small>HH</small></div><div class="stat-note">${day.crew.length} personas · sin duplicar</div></div>
  </div>
  <div class="activity-layout">
    <section>
      <div class="section-head"><h2>Avances del día</h2><span class="muted">${photos} fotos adjuntas</span></div>
      <div class="activity-list">${activities.length ? activities.map(a => activityCard(a, day)).join('') : empty('Tu primer avance', 'Registra lo que está pasando en terreno. Puedes dejar la ejecución en curso.', !day.closedAt ? primary('add-activity', 'Registrar avance', day.id) : `<button class="btn btn-primary btn-reopen" data-action="reopen-day" data-id="${day.id}">Reabrir jornada para registrar</button>`)}</div>
    </section>
    <aside class="side-panel">
      <h3>${day.closedAt ? 'Registro de la jornada' : 'Registro rápido'}</h3>
      ${!day.closedAt ? [['shovel', 'Excavación', 'excavation'], ['layers', 'Relleno estructural', 'fill'], ['check', 'Compactación', 'compact']].map(([i, label, preset]) => `<button class="quick-button" data-action="preset" data-preset="${preset}" data-id="${day.id}"><span class="quick-icon">${icon(i)}</span>${label}</button>`).join('') : ''}
      <button class="quick-button" data-action="navigate" data-view="resources"><span class="quick-icon">${icon('people')}</span>Personal y maquinaria</button>
      <button class="quick-button quick-button-wa" data-action="whatsapp-report" data-id="${day.id}"><span class="quick-icon">${icon('report')}</span>Compartir por WhatsApp</button>
      <button class="quick-button" data-action="copy-report" data-id="${day.id}"><span class="quick-icon">${icon('report')}</span>Copiar resumen para WhatsApp</button>
      ${!day.closedAt ? `<button class="quick-button" data-action="day-notes" data-id="${day.id}"><span class="quick-icon">${icon('report')}</span>Observaciones del día</button>` : ''}
      <div class="day-info">
        <div>Inicio: <strong>${timeOnly(day.startedAt)}</strong></div>
        <div>${day.closedAt ? `Cierre: <strong>${timeOnly(day.closedAt)}</strong>` : 'Estado: <strong>En curso</strong>'}</div>
        ${!day.closedAt ? `<button class="text-button" data-action="close-day" data-id="${day.id}">Cerrar jornada</button>` : ''}
      </div>
    </aside>
  </div>
  ${day.notes ? `<div class="notes"><strong>Observaciones del día</strong><br>${esc(day.notes)}</div>` : ''}`;
}
