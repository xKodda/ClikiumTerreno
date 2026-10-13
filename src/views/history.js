// ============================================================================
// CLIKIUM TERRENO — VISTA: HISTORIAL (ES MODULE)
// ============================================================================

import { esc, dateLabel, icon, empty, getActivityStatus } from '../utils.js';
import { stateStore } from '../state.js';

export function renderHistory() {
  const days = [...stateStore.state.days]
    .filter(d => (!stateStore.historyMonth || d.date.startsWith(stateStore.historyMonth)) && (!stateStore.historySearch || JSON.stringify(d).toLowerCase().includes(stateStore.historySearch.toLowerCase())))
    .sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt));

  return `<div class="heading">
    <div>
      <div class="eyebrow">ARCHIVO DE OBRA</div>
      <h1>Historial de jornadas</h1>
      <p>Avances, fotografías y controles de cada día.</p>
    </div>
    <button class="btn btn-primary" data-action="start-day">${icon('plus')}Iniciar jornada</button>
  </div>
  <div class="filters">
    <input id="history-search" value="${esc(stateStore.historySearch)}" placeholder="Buscar actividad, PK, capa o sector" aria-label="Buscar en historial">
    <input id="history-month" type="month" value="${stateStore.historyMonth}" aria-label="Filtrar por mes">
    <button class="btn btn-secondary" data-action="clear-history">Limpiar</button>
  </div>
  <div class="history-grid">
    ${days.map(d => `<button class="history-card" data-action="open-day" data-id="${d.id}">
      <div class="card-top">
        <span class="card-sector">${esc(d.project)}${d.isDemo ? ' · EJEMPLO' : ''}</span>
        <span class="badge ${d.closedAt ? 'approved' : 'pending'}">${d.closedAt ? 'Cerrada' : 'Abierta'}</span>
      </div>
      <h3>${esc(dateLabel(d.date))}</h3>
      <span class="muted">${esc(d.user)}</span>
      <div class="history-foot">
        <span>${d.activities.length} actividades · ${d.activities.reduce((n, a) => n + a.photoIds.length, 0)} fotos</span>
        <span>${d.activities.filter(a => getActivityStatus(a) === 'Control pendiente').length} pendientes</span>
      </div>
    </button>`).join('')}
  </div>
  ${!days.length ? empty('No hay jornadas para este filtro', 'Prueba con otro mes o inicia una jornada.') : ''}`;
}
