// ============================================================================
// CLIKIUM TERRENO — VISTA: TRAMOS Y CAPAS (ES MODULE)
// ============================================================================

import {
  esc, pkNumber, sectorUsesPk, option, empty, statusClass,
  activityStage, getActivityStatus, getControlStatus, layerLabel, normalizeProjectId
} from '../utils.js';
import { stateStore, selectedDay, allActivities, amount, catalogSectors } from '../state.js';

const GRID_STEP_M = 10;      // separación de la grilla de fondo (m)
const MAX_AXIS_LABELS = 6;   // máximo de etiquetas PK visibles en el eje

const pkLabel = m => `${Math.floor(m / 1000)}+${String(Math.round(m % 1000)).padStart(3, '0')}`;

const hasPk = a => sectorUsesPk(a.sector) && pkNumber(a.pkStart) !== null && pkNumber(a.pkEnd) !== null;

/** Paso "redondo" para las etiquetas del eje según la distancia visible. */
function labelStep(distance) {
  const raw = distance / MAX_AXIS_LABELS;
  const nice = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  return nice.find(n => n >= raw) || Math.ceil(raw / 1000) * 1000;
}

export function renderMap() {
  const project = normalizeProjectId(selectedDay()?.project || stateStore.state?.settings?.project);
  const entries = allActivities().filter(a =>
    !a.isAnnulled &&
    normalizeProjectId(a.day.project) === project &&
    (!a.day.isDemo || a.day.id === stateStore.selectedDayId)
  );
  const pkEntries = entries.filter(hasPk);

  // Sectores con PK: catálogo + los usados en registros (sin duplicados)
  const sectors = [...new Set([...catalogSectors().filter(sectorUsesPk), ...pkEntries.map(a => a.sector)])];
  if (sectors.length && !sectors.includes(stateStore.mapSector)) stateStore.mapSector = sectors[0];
  const sector = stateStore.mapSector;

  const processes = [...new Set(pkEntries.map(a => a.process).filter(Boolean))];
  const layerFilter = stateStore.mapLayer ? Number(stateStore.mapLayer) : null;

  const relevant = pkEntries
    .filter(a =>
      a.sector === sector &&
      (layerFilter === null || Number(a.layer) === layerFilter) &&
      (!stateStore.mapProcess || a.process === stateStore.mapProcess) &&
      (!stateStore.mapDate || a.day.date <= stateStore.mapDate))
    .sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')));

  // Rango visible del eje
  const bounds = relevant.flatMap(a => [pkNumber(a.pkStart), pkNumber(a.pkEnd)]);
  const minBound = bounds.length ? Math.min(...bounds) : 1210;
  const maxBound = bounds.length ? Math.max(...bounds) : 1310;
  const start = Math.floor(minBound / GRID_STEP_M) * GRID_STEP_M;
  const end = Math.max(Math.ceil(maxBound / GRID_STEP_M) * GRID_STEP_M, start + GRID_STEP_M);
  const distance = end - start;
  const pct = m => ((m - start) / distance) * 100;

  const step = labelStep(distance);
  const ticks = [];
  for (let t = Math.ceil(start / step) * step; t <= end; t += step) ticks.push(t);
  if (ticks[0] !== start) ticks.unshift(start);
  if (ticks.at(-1) !== end) ticks.push(end);
  // Evita etiquetas pegadas en los extremos
  const minGapPct = 9;
  const visibleTicks = ticks.filter((t, i, arr) =>
    i === 0 || i === arr.length - 1 ||
    (pct(t) - pct(arr[0]) >= minGapPct && pct(arr.at(-1)) - pct(t) >= minGapPct));

  const axisHtml = visibleTicks.map((t, i, arr) => {
    const edge = i === 0 ? 'axis-start' : i === arr.length - 1 ? 'axis-end' : '';
    return `<span class="map-tick ${edge}" style="left:${pct(t).toFixed(3)}%">${pkLabel(t)}</span>`;
  }).join('');

  const gridPct = ((GRID_STEP_M / distance) * 100).toFixed(4);
  const trackStyle = `--grid:${gridPct}%`;

  const rowsHtml = relevant.map(a => {
    const overall = getActivityStatus(a);
    const left = Math.max(0, pct(pkNumber(a.pkStart)));
    const width = Math.min(Math.max(1.2, pct(pkNumber(a.pkEnd)) - pct(pkNumber(a.pkStart))), 100 - left);
    const title = `${a.activity} · PK ${a.pkStart} a ${a.pkEnd} · ${amount(a)} · ${overall} (Lab: ${getControlStatus(a, 'Laboratorio')}, Topo: ${getControlStatus(a, 'Topografía')})`;
    return `<div class="map-row">
      <div class="map-row-label">
        <strong>${esc(a.activity)}</strong>
        <span class="muted">${esc(layerLabel(a))} · ${esc(a.day.date)} · PK ${esc(a.pkStart)}–${esc(a.pkEnd)}</span>
      </div>
      <div class="map-track" style="${trackStyle}">
        <button class="map-segment ${statusClass(overall)} ${activityStage(a) === 'En curso' ? 'in-progress' : ''}"
          style="left:${left.toFixed(3)}%;width:${width.toFixed(3)}%"
          data-action="detail" data-id="${esc(a.id)}" data-day-id="${esc(a.day.id)}"
          title="${esc(title)}" aria-label="${esc(title)}">${esc(amount(a))}</button>
      </div>
    </div>`;
  }).join('');

  return `<div class="heading">
    <div>
      <div class="eyebrow">MONOGRAFÍA DE AVANCES</div>
      <h1>Tramos y capas</h1>
      <p>Ubicación de los registros por PK, proceso y actividad.</p>
    </div>
  </div>
  <div class="filters filters-grid">
    <label class="filter-field"><span>Sector</span>
      <select id="map-sector">${sectors.length ? sectors.map(s => option(s, sector)).join('') : '<option value="">Sin sectores con PK</option>'}</select>
    </label>
    <label class="filter-field"><span>Proceso</span>
      <select id="map-process"><option value="">Todos</option>${processes.map(p => option(p, stateStore.mapProcess)).join('')}</select>
    </label>
    <label class="filter-field"><span>Capa</span>
      <input id="map-layer" value="${esc(stateStore.mapLayer)}" type="number" min="1" inputmode="numeric" placeholder="Todas">
    </label>
    <label class="filter-field"><span>Hasta fecha</span>
      <input id="map-date" value="${esc(stateStore.mapDate)}" type="date">
    </label>
  </div>
  <div class="map-card">
    <div class="section-head">
      <h2>${esc(sector || 'Sin sector')}</h2>
      <span class="muted">${relevant.length} registros</span>
    </div>
    ${relevant.length ? `
      <div class="map-surface">
        <div class="map-axis-row"><div class="map-row-label map-axis-spacer"></div><div class="map-axis">${axisHtml}</div></div>
        ${rowsHtml}
      </div>
      <p class="hint">Toca una barra para ver el detalle. Grilla de fondo cada ${GRID_STEP_M} m.</p>` :
      empty('Todavía no hay avances en este tramo', 'Los registros con PK aparecerán aquí después de guardarlos.')}
    <div class="legend">
      <span><i></i>Pendiente</span>
      <span><i class="approved"></i>Aprobado</span>
      <span><i class="rejected"></i>Rechazado</span>
      <span><i class="no-control"></i>Sin control</span>
      <span><i class="in-progress"></i>En curso</span>
    </div>
  </div>`;
}
