// ============================================================================
// CLIKIUM TERRENO — VISTA: TRAMOS Y CAPAS (ES MODULE)
// ============================================================================

import {
  esc, pkNumber, sectorUsesPk, option, icon, empty, statusClass,
  activityStage, getActivityStatus, getControlStatus, layerLabel
} from '../utils.js';
import { stateStore, selectedDay, allActivities, amount } from '../state.js';

export function renderMap() {
  const project = selectedDay()?.project || stateStore.state.settings.project;
  const entries = allActivities().filter(a => a.day.project === project && (!a.day.isDemo || a.day.id === stateStore.selectedDayId));
  const hasPk = a => sectorUsesPk(a.sector) && pkNumber(a.pkStart) !== null && pkNumber(a.pkEnd) !== null;
  const sectors = [...new Set([...stateStore.catalog.sectores.filter(sectorUsesPk), ...entries.filter(hasPk).map(a => a.sector)])];
  if (sectors.length && !sectors.includes(stateStore.mapSector)) stateStore.mapSector = sectors[0];
  const processes = [...new Set(entries.filter(hasPk).map(a => a.process))];
  const relevant = entries.filter(a => hasPk(a) && a.sector === stateStore.mapSector && (!stateStore.mapLayer || a.layer === Number(stateStore.mapLayer)) && (!stateStore.mapProcess || a.process === stateStore.mapProcess) && (!stateStore.mapDate || a.day.date <= stateStore.mapDate)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const bounds = relevant.flatMap(a => [pkNumber(a.pkStart), pkNumber(a.pkEnd)]);

  let minBound = bounds.length ? Math.min(...bounds) : (stateStore.mapSector === 'OA6' ? 1260 : 1210);
  let maxBound = bounds.length ? Math.max(...bounds) : (stateStore.mapSector === 'OA6' ? 1270 : 1310);

  const start = Math.floor(minBound / 10) * 10;
  const end = Math.ceil(maxBound / 10) * 10;
  const distance = Math.max(end - start, 10);
  const interval = 10;
  const intervalPct = (interval / distance) * 100;

  const ticks = [];
  for (let t = start; t <= end; t += interval) {
    ticks.push(t);
  }

  const pkLabel = m => {
    const km = Math.floor(m / 1000);
    const rem = m % 1000;
    return `${km}+${String(rem).padStart(3, '0')}`;
  };

  const axisHtml = ticks.map(t => {
    const pct = ((t - start) / distance) * 100;
    let transform = 'translateX(-50%)';
    if (pct <= 0.1) transform = 'translateX(0)';
    else if (pct >= 99.9) transform = 'translateX(-100%)';
    return `<span style="position:absolute;left:${pct.toFixed(4)}%;transform:${transform};white-space:nowrap">${pkLabel(t)}</span>`;
  }).join('');

  const trackBgStyle = `background:repeating-linear-gradient(to right,#edf2f4 0,#edf2f4 calc(${intervalPct.toFixed(4)}% - 1px),#dce5e8 calc(${intervalPct.toFixed(4)}% - 1px),#dce5e8 ${intervalPct.toFixed(4)}%)`;

  const groups = new Map();
  relevant.forEach(a => {
    const key = `${a.process} · ${layerLabel(a).toLowerCase()} · ${a.activity}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  });

  return `<div class="heading">
    <div>
      <div class="eyebrow">MONOGRAFÍA DE AVANCES</div>
      <h1>Tramos y capas</h1>
      <p>Ubicación de los registros por PK, proceso y actividad.</p>
    </div>
  </div>
  <div class="filters">
    <select id="map-sector" aria-label="Sector">${sectors.map(s => option(s, stateStore.mapSector)).join('')}</select>
    <select id="map-process" aria-label="Proceso"><option value="">Todos los procesos</option>${processes.map(p => option(p, stateStore.mapProcess)).join('')}</select>
    <input id="map-layer" value="${esc(stateStore.mapLayer)}" type="number" min="1" placeholder="Todas las capas" aria-label="Capa">
    <input id="map-date" value="${esc(stateStore.mapDate)}" type="date" aria-label="Registros hasta esta fecha">
  </div>
  <div class="map-card">
    <div class="section-head">
      <h2>${esc(stateStore.mapSector)}</h2>
      <span class="muted">${relevant.length} registros</span>
    </div>
    <p class="hint">Cada barra corresponde a una actividad registrada (tramos en intervalos de 10 m). Los registros coincidentes se muestran en filas separadas. El color refleja el estado general de control.</p>
    <div class="map-scroll">
      <div class="map-surface">
        <div class="map-axis">${axisHtml}</div>
        ${[...groups].flatMap(([key, records]) => records.map(a => {
          const overall = getActivityStatus(a);
          const left = ((pkNumber(a.pkStart) - start) / distance) * 100;
          const width = Math.max(.8, ((pkNumber(a.pkEnd) - pkNumber(a.pkStart)) / distance) * 100);
          return `<div class="map-row">
            <div class="map-row-label">${esc(key)}<br><span class="muted">${esc(a.day.date)}</span></div>
            <div class="map-track" style="${trackBgStyle}">
              <button class="map-segment ${statusClass(overall)} ${activityStage(a) === 'En curso' ? 'in-progress' : ''}" style="left:${left.toFixed(4)}%;width:${Math.min(width, 100 - left).toFixed(4)}%" data-action="detail" data-id="${a.id}" data-day-id="${a.day.id}" title="${esc(`${a.activity} · PK ${a.pkStart} a ${a.pkEnd} · ${amount(a)} · Estado: ${overall} (Lab: ${getControlStatus(a, 'Laboratorio')}, Topo: ${getControlStatus(a, 'Topografía')})`)}" aria-label="${esc(`${a.activity}, PK ${a.pkStart} a ${a.pkEnd}, ${overall}`)}">${amount(a)}</button>
            </div>
          </div>`;
        })).join('')}
      </div>
    </div>
    <div class="legend">
      <span><i></i>Control pendiente</span>
      <span><i class="approved"></i>Aprobado</span>
      <span><i class="rejected"></i>Rechazado</span>
      <span><i class="no-control"></i>No requiere control</span>
      <span><i class="in-progress"></i>Ejecución en curso</span>
    </div>
  </div>
  ${!relevant.length ? empty('Todavía no hay avances en este tramo', 'Los registros con PK aparecerán aquí después de guardarlos.') : ''}`;
}
