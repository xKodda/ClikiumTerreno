// ============================================================================
// CLIKIUM TERRENO — VISTA: HISTORIAL (ES MODULE)
// ============================================================================

import { esc, dateLabel, icon, empty, getActivityStatus, cmpDesc, projectDisplayName } from '../utils.js';
import { stateStore } from '../state.js';

export function renderHistory() {
  const search = stateStore.historySearch.toLowerCase();
  const days = [...(stateStore.state?.days || [])]
    .filter(d => (!stateStore.historyMonth || String(d.date).startsWith(stateStore.historyMonth)) && (!search || JSON.stringify(d).toLowerCase().includes(search)))
    .sort((a, b) => cmpDesc(a.date, b.date) || cmpDesc(a.startedAt, b.startedAt));

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
    ${days.map(d => `<article class="history-card" style="display:flex;flex-direction:column;justify-content:space-between">
      <div>
        <div class="card-top">
          <span class="card-sector">${esc(projectDisplayName(d.project))}${d.isDemo ? ' · EJEMPLO' : ''}</span>
          <span class="badge ${d.closedAt ? 'approved' : 'pending'}">${d.closedAt ? 'Cerrada' : 'Abierta'}</span>
        </div>
        <h3 style="cursor:pointer;margin:12px 0 6px" data-action="open-day" data-id="${d.id}">${esc(dateLabel(d.date))}</h3>
        <span class="muted">${esc(d.user)}</span>
      </div>
      <div>
        <div class="history-foot">
          <span>${d.activities.length} actividades · ${d.activities.reduce((n, a) => n + a.photoIds.length, 0)} fotos</span>
          <span>${d.activities.filter(a => getActivityStatus(a) === 'Control pendiente').length} pendientes</span>
        </div>
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid #edf1f3;display:flex;gap:8px;justify-content:flex-end;align-items:center;flex-wrap:wrap">
          <button type="button" class="btn btn-sm btn-secondary" data-action="open-day" data-id="${d.id}">Ver jornada</button>
          ${d.closedAt ? `<button type="button" class="btn btn-sm btn-primary" data-action="reopen-day" data-id="${d.id}">Reabrir jornada</button>` : ''}
        </div>
      </div>
    </article>`).join('')}
  </div>
  ${!days.length ? empty('No hay jornadas para este filtro', 'Prueba con otro mes o inicia una jornada.') : ''}`;
}
