// ============================================================================
// CLIKIUM TERRENO — VISTA: TRAMOS Y CAPAS (ES MODULE)
// ============================================================================

import {
  esc, pkNumber, sectorUsesPk, option, empty, statusClass,
  activityStage, getActivityStatus, getControlStatus, layerLabel, normalizeProjectId
} from '../utils.js';
import { stateStore, selectedDay, allActivities, amount, catalogSectors } from '../state.js';

const GRID_STEP_M = 10; // separación exacta de 10 en 10 metros

const pkLabel = m => `${Math.floor(m / 1000)}+${String(Math.round(m % 1000)).padStart(3, '0')}`;

const hasPk = a => sectorUsesPk(a.sector) && pkNumber(a.pkStart) !== null && pkNumber(a.pkEnd) !== null;

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
  const bounds = relevant.flatMap(a => [pkNumber(a.pkStart), pkNumber(a.pkEnd)]).filter(n => n !== null && !isNaN(n));
  const minBound = bounds.length ? Math.min(...bounds) : 1170;
  const maxBound = bounds.length ? Math.max(...bounds) : 1270;
  const start = Math.floor(minBound / GRID_STEP_M) * GRID_STEP_M;
  const end = Math.max(Math.ceil(maxBound / GRID_STEP_M) * GRID_STEP_M, start + GRID_STEP_M);
  const distance = Math.max(GRID_STEP_M, end - start);
  const pct = m => ((m - start) / distance) * 100;

  // Generación estricta de 10 en 10 metros
  const ticks = [];
  for (let t = start; t <= end; t += GRID_STEP_M) {
    ticks.push(t);
  }

  // Ancho mínimo del riel: 42px por cada marca de 10m para garantizar legibilidad total
  const trackWidthPx = Math.max(500, (ticks.length - 1) * 44);
  const totalSurfaceWidth = trackWidthPx + 140;

  const axisHtml = ticks.map((t, i) => {
    const isMajor = t % 100 === 0;
    const isMid = t % 50 === 0 && !isMajor;
    const cls = isMajor ? 'tick-major' : isMid ? 'tick-mid' : 'tick-minor';
    return `<span class="map-tick ${cls}" style="left:${pct(t).toFixed(4)}%">
      <span class="tick-line"></span>
      <span class="tick-text">${pkLabel(t)}</span>
    </span>`;
  }).join('');

  const gridPct = ((GRID_STEP_M / distance) * 100).toFixed(5);
  const trackStyle = `--grid:${gridPct}%; width:${trackWidthPx}px; min-width:${trackWidthPx}px;`;

  const rowsHtml = relevant.map(a => {
    const overall = getActivityStatus(a);
    const pks = pkNumber(a.pkStart);
    const pke = pkNumber(a.pkEnd);
    const pMin = Math.min(pks, pke);
    const pMax = Math.max(pks, pke);
    const left = Math.max(0, pct(pMin));
    const width = Math.min(Math.max(1.2, ((pMax - pMin) / distance) * 100), 100 - left);
    const title = `${a.activity} · PK ${a.pkStart} a ${a.pkEnd} · ${amount(a)} · ${overall}`;
    return `<div class="map-row">
      <div class="map-row-label">
        <strong>${esc(a.activity)}</strong>
        <span class="muted">${esc(layerLabel(a))} · ${esc(a.day.date)} · PK ${esc(a.pkStart)}–${esc(a.pkEnd)}</span>
      </div>
      <div class="map-track" style="${trackStyle}">
        <button class="map-segment ${statusClass(overall)} ${activityStage(a) === 'En curso' ? 'in-progress' : ''}"
          style="left:${left.toFixed(4)}%;width:${width.toFixed(4)}%"
          data-action="detail" data-id="${esc(a.id)}" data-day-id="${esc(a.day.id)}"
          title="${esc(title)}" aria-label="${esc(title)}">${esc(amount(a))}</button>
      </div>
    </div>`;
  }).join('');

  return `<div class="heading">
    <div>
      <div class="eyebrow">MONOGRAFÍA DE AVANCES</div>
      <h1>Tramos y capas</h1>
      <p>Visualización lineal de avances por eje, PK y capa.</p>
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
    <div class="section-head" style="flex-wrap:wrap;gap:8px">
      <div>
        <h2>${esc(sector || 'Sin sector')}</h2>
        <span class="muted">PK ${pkLabel(start)} a PK ${pkLabel(end)} · Longitud: ${distance} m · Grilla cada 10 m</span>
      </div>
      <span class="badge dark">${relevant.length} registros</span>
    </div>
    ${relevant.length ? `
      <div class="map-scroll-container">
        <div class="map-surface" style="width:${totalSurfaceWidth}px; min-width:${totalSurfaceWidth}px;">
          <div class="map-axis-row">
            <div class="map-row-label map-axis-spacer"><span>PK / Actividad</span></div>
            <div class="map-axis" style="width:${trackWidthPx}px; min-width:${trackWidthPx}px;">${axisHtml}</div>
          </div>
          ${rowsHtml}
        </div>
      </div>
      <p class="hint">Desliza horizontalmente para recorrer toda la longitud de la traza. Intervalos fijados de 10 en 10 metros.</p>` :
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
