// ============================================================================
// CLIKIUM TERRENO — VISTA: PENDIENTES (ES MODULE)
// ============================================================================

import {
  esc, dateLabel, icon, empty, statusClass, badge, controlBadges,
  layerLabel, activityStage, getActivityStatus, getControlStatus, sectorUsesPk
} from '../utils.js';
import { stateStore, selectedDay, allActivities, amount } from '../state.js';

export function pendingActivityCard(a) {
  const overall = getActivityStatus(a);
  const day = a.day;
  const pkLabel = (sectorUsesPk(a.sector) && a.pkStart)
    ? `PK <strong>${esc(a.pkStart)}</strong>${a.pkStart !== a.pkEnd && a.pkEnd ? ` — <strong>${esc(a.pkEnd)}</strong>` : ''}`
    : `<strong>Ubicación por sector</strong>`;
  return `<article class="activity-card ${statusClass(overall)}">
    <div class="card-top">
      <div>
        <div class="card-sector">${esc(day.date)} · ${esc(day.user)} · ${esc(a.sector)} · ${esc(layerLabel(a)).toUpperCase()}</div>
        <h3>${esc(a.activity)}</h3>
        <div class="card-process">${esc(a.process)} · ${esc(activityStage(a))}</div>
        <div class="control-tags" style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">${controlBadges(a)}</div>
      </div>
      ${badge(overall)}
    </div>
    <div class="card-data">
      <span>${pkLabel}</span>
      <span class="quantity">${amount(a)}</span>
    </div>
    <div class="card-bottom">
      <span class="meta">Jornada: ${esc(dateLabel(day.date))} · ${a.controls.length} controles registrados</span>
      <button class="btn btn-sm btn-primary" data-action="add-control" data-id="${a.id}" data-day-id="${day.id}">+ Agregar control</button>
      <button class="text-button" data-action="detail" data-id="${a.id}" data-day-id="${day.id}">Ver historial</button>
    </div>
  </article>`;
}

export function renderPending() {
  const curDay = selectedDay();
  const allActs = allActivities().filter(a => !a.isAnnulled && !a.day.isDemo);
  const curActs = curDay ? curDay.activities.filter(a => !a.isAnnulled).map(a => ({ ...a, day: curDay })) : [];

  const allPendingActs = allActs.filter(a => {
    const st = getActivityStatus(a);
    return st === 'Control pendiente' || st === 'Rechazado';
  }).sort((a, b) => b.day.date.localeCompare(a.day.date) || b.createdAt.localeCompare(a.createdAt));

  const curPendingActs = curActs.filter(a => {
    const st = getActivityStatus(a);
    return st === 'Control pendiente' || st === 'Rechazado';
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const isScopeToday = stateStore.pendingScope === 'today' && !!curDay;
  const pendingActs = isScopeToday ? curPendingActs : allPendingActs;

  const totalPending = pendingActs.length;
  const totalRejected = pendingActs.filter(a => getActivityStatus(a) === 'Rechazado').length;
  const totalLabPending = pendingActs.filter(a => getControlStatus(a, 'Laboratorio') === 'Control pendiente').length;
  const totalTopPending = pendingActs.filter(a => getControlStatus(a, 'Topografía') === 'Control pendiente').length;

  let filtered = pendingActs;
  if (stateStore.pendingTabFilter === 'rejected') {
    filtered = pendingActs.filter(a => getActivityStatus(a) === 'Rechazado');
  } else if (stateStore.pendingTabFilter === 'lab') {
    filtered = pendingActs.filter(a => getControlStatus(a, 'Laboratorio') === 'Control pendiente');
  } else if (stateStore.pendingTabFilter === 'top') {
    filtered = pendingActs.filter(a => getControlStatus(a, 'Topografía') === 'Control pendiente');
  }

  const scopeHtml = curDay ? `
    <div class="scope-toggle" style="margin-bottom:16px;display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn ${isScopeToday ? 'btn-primary' : 'btn-secondary'}" data-action="filter-pending-scope" data-scope="today">
        ${icon('day')} Esta jornada (${curPendingActs.length})
      </button>
      <button class="btn ${!isScopeToday ? 'btn-primary' : 'btn-secondary'}" data-action="filter-pending-scope" data-scope="all">
        ${icon('history')} Todas las jornadas (${allPendingActs.length})
      </button>
    </div>` : '';

  return `<div class="heading">
    <div>
      <div class="eyebrow">${isScopeToday ? `JORNADA ACTUAL · ${esc(curDay.date)} · ${esc(curDay.user)}` : 'SEGUIMIENTO MULTI-JORNADA'}</div>
      <h1>${isScopeToday ? 'Pendientes de esta jornada' : 'Pendientes y rechazos abiertos'}</h1>
      <p>${isScopeToday ? 'Controles pendientes de los avances registrados en la jornada seleccionada.' : 'Controles de calidad pendientes acumulados de jornadas anteriores y actuales.'}</p>
    </div>
  </div>
  ${scopeHtml}
  <div class="stats">
    <div class="stat"><div class="stat-label">Total pendientes</div><div class="stat-value">${totalPending}<small>actividades</small></div><div class="stat-note">${isScopeToday ? 'En jornada actual' : 'Requieren cierre de calidad'}</div></div>
    <div class="stat"><div class="stat-label">Rechazos abiertos</div><div class="stat-value" style="color:var(--danger, #c0392b)">${totalRejected}<small>registros</small></div><div class="stat-note">Prioridad de corrección</div></div>
    <div class="stat"><div class="stat-label">Pendiente Laboratorio</div><div class="stat-value">${totalLabPending}<small>ensayos</small></div><div class="stat-note">Densidad / humedad</div></div>
    <div class="stat"><div class="stat-label">Pendiente Topografía</div><div class="stat-value">${totalTopPending}<small>controles</small></div><div class="stat-note">Cotas / geometría</div></div>
  </div>
  <div class="filters">
    <button class="btn ${stateStore.pendingTabFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" data-action="filter-pending-tab" data-tab="all">Todos (${totalPending})</button>
    <button class="btn ${stateStore.pendingTabFilter === 'rejected' ? 'btn-primary' : 'btn-secondary'}" data-action="filter-pending-tab" data-tab="rejected">Rechazados (${totalRejected})</button>
    <button class="btn ${stateStore.pendingTabFilter === 'lab' ? 'btn-primary' : 'btn-secondary'}" data-action="filter-pending-tab" data-tab="lab">Laboratorio (${totalLabPending})</button>
    <button class="btn ${stateStore.pendingTabFilter === 'top' ? 'btn-primary' : 'btn-secondary'}" data-action="filter-pending-tab" data-tab="top">Topografía (${totalTopPending})</button>
  </div>
  <div class="activity-list" style="margin-top:16px">
    ${filtered.length ? filtered.map(a => pendingActivityCard(a)).join('') : empty(
      isScopeToday ? 'Sin controles pendientes en esta jornada' : 'Sin pendientes en esta vista',
      isScopeToday ? 'Todos los avances registrados en esta jornada tienen sus controles al día o son completos.' : 'Todas las actividades registradas tienen sus controles al día o están aprobadas.'
    )}
  </div>`;
}
