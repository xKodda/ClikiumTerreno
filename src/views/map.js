// ============================================================================
// CLIKIUM TERRENO — VISTA: TRAMOS Y CAPAS (ES MODULE)
// ============================================================================

import {
  esc, pkNumber, sectorUsesPk, option, empty, statusClass,
  activityStage, getActivityStatus, getControlStatus, layerLabel, normalizeProjectId,
  isLayerPlacement, icon, badge, controlBadges
} from '../utils.js';
import { stateStore, selectedDay, allActivities, amount, catalogSectors } from '../state.js';
import { showDialog } from '../dialogs.js';

const GRID_STEP_M = 10; // separación exacta de 10 en 10 metros

const pkLabel = m => `${Math.floor(m / 1000)}+${String(Math.round(m % 1000)).padStart(3, '0')}`;

const hasPk = a => sectorUsesPk(a.sector) && pkNumber(a.pkStart) !== null && pkNumber(a.pkEnd) !== null && isLayerPlacement(a);

function getSectorMetrics(relevant) {
  const bounds = relevant.flatMap(a => [pkNumber(a.pkStart), pkNumber(a.pkEnd)]).filter(n => n !== null && !isNaN(n));
  const minBound = bounds.length ? Math.min(...bounds) : 1170;
  const maxBound = bounds.length ? Math.max(...bounds) : 1270;
  const start = Math.floor(minBound / GRID_STEP_M) * GRID_STEP_M;
  const end = Math.max(Math.ceil(maxBound / GRID_STEP_M) * GRID_STEP_M, start + GRID_STEP_M);
  const distance = Math.max(GRID_STEP_M, end - start);
  const pct = m => ((m - start) / distance) * 100;

  const ticks = [];
  for (let t = start; t <= end; t += GRID_STEP_M) {
    ticks.push(t);
  }

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

  return { start, end, distance, pct, ticks, trackWidthPx, totalSurfaceWidth, axisHtml, trackStyle };
}

function renderTimelineSurface(relevant, metrics) {
  const { distance, pct, trackWidthPx, totalSurfaceWidth, axisHtml, trackStyle } = metrics;
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

  return `<div class="map-scroll-container">
    <div class="map-surface" style="width:${totalSurfaceWidth}px; min-width:${totalSurfaceWidth}px;">
      <div class="map-axis-row">
        <div class="map-row-label map-axis-spacer"><span>PK / Actividad</span></div>
        <div class="map-axis" style="width:${trackWidthPx}px; min-width:${trackWidthPx}px;">${axisHtml}</div>
      </div>
      ${rowsHtml}
    </div>
  </div>`;
}

function renderCardsList(relevant, metrics) {
  const { start, end, distance, pct } = metrics;

  return `<div class="map-cards-list">
    ${relevant.map(a => {
      const overall = getActivityStatus(a);
      const pks = pkNumber(a.pkStart);
      const pke = pkNumber(a.pkEnd);
      const pMin = Math.min(pks, pke);
      const pMax = Math.max(pks, pke);
      const lengthM = Math.round(pMax - pMin);
      const left = Math.max(0, pct(pMin));
      const width = Math.min(Math.max(2, ((pMax - pMin) / distance) * 100), 100 - left);

      return `<div class="map-card-item ${statusClass(overall)}">
        <div class="map-card-item-head">
          <div>
            <div class="map-card-item-sector">${esc(a.sector)} · ${esc(layerLabel(a)).toUpperCase()}</div>
            <div class="map-card-item-title">${esc(a.activity)}</div>
            <div class="map-card-item-sub">${esc(a.process)} · ${esc(a.day.date)} · PK <strong>${esc(a.pkStart)}</strong> a <strong>${esc(a.pkEnd)}</strong> (${lengthM} m)</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            ${badge(overall)}
            ${controlBadges(a)}
          </div>
        </div>

        <div class="map-mini-track-wrapper">
          <div class="map-mini-track-bounds">
            <span>PK ${pkLabel(start)}</span>
            <span style="color:#0f172a;font-weight:700">Tramo: PK ${esc(a.pkStart)} – ${esc(a.pkEnd)} (${lengthM} m)</span>
            <span>PK ${pkLabel(end)}</span>
          </div>
          <div class="map-mini-track-bar">
            <div class="map-mini-track-fill ${statusClass(overall)} ${activityStage(a) === 'En curso' ? 'in-progress' : ''}"
                 style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%">
              ${esc(amount(a))}
            </div>
          </div>
        </div>

        <div class="map-card-item-foot">
          <div><strong>Avance:</strong> ${amount(a)}${a.mode === 'trips' ? ` (${a.trips} viajes × ${a.capacity} m³)` : ''} · <strong>Estado:</strong> ${esc(activityStage(a))}</div>
          <button class="text-button" data-action="detail" data-id="${esc(a.id)}" data-day-id="${esc(a.day.id)}">Ver detalle y controles</button>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

export function openMapModal() {
  const project = normalizeProjectId(selectedDay()?.project || stateStore.state?.settings?.project);
  const entries = allActivities().filter(a =>
    !a.isAnnulled &&
    normalizeProjectId(a.day.project) === project &&
    (!a.day.isDemo || a.day.id === stateStore.selectedDayId)
  );
  const pkEntries = entries.filter(hasPk);
  const sector = stateStore.mapSector || 'Eje 48';
  const layerFilter = stateStore.mapLayer ? Number(stateStore.mapLayer) : null;

  const relevant = pkEntries
    .filter(a =>
      a.sector === sector &&
      (layerFilter === null || Number(a.layer) === layerFilter) &&
      (!stateStore.mapProcess || a.process === stateStore.mapProcess) &&
      (!stateStore.mapDate || a.day.date <= stateStore.mapDate))
    .sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')));

  if (!relevant.length) {
    return showDialog(`Monografía: ${sector}`, 'No hay avances registrados para este sector.', empty('Sin avances con PK', 'Los registros de capas y avances aparecerán aquí.'));
  }

  const metrics = getSectorMetrics(relevant);
  const surface = renderTimelineSurface(relevant, metrics);

  showDialog(
    `Monografía: ${sector}`,
    `PK ${pkLabel(metrics.start)} a PK ${pkLabel(metrics.end)} · Longitud: ${metrics.distance} m · Grilla exacta cada 10 m`,
    `<div class="map-modal-surface">
      <p class="hint" style="margin-top:0;margin-bottom:12px">Desliza horizontalmente para recorrer toda la traza. Toca cualquier bloque para ver sus controles de laboratorio y topografía.</p>
      ${surface}
      <div class="legend" style="margin-top:14px">
        <span><i></i>Pendiente</span>
        <span><i class="approved"></i>Aprobado</span>
        <span><i class="rejected"></i>Rechazado</span>
        <span><i class="no-control"></i>Sin control</span>
        <span><i class="in-progress"></i>En curso</span>
      </div>
    </div>`
  );
}

export function renderMap() {
  const project = normalizeProjectId(selectedDay()?.project || stateStore.state?.settings?.project);
  const entries = allActivities().filter(a =>
    !a.isAnnulled &&
    normalizeProjectId(a.day.project) === project &&
    (!a.day.isDemo || a.day.id === stateStore.selectedDayId)
  );
  const pkEntries = entries.filter(hasPk);

  // Sectores con PK y capas: catálogo + los usados en registros
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

  const metrics = getSectorMetrics(relevant);
  const isTimeline = stateStore.mapViewMode === 'timeline';

  return `<div class="heading">
    <div>
      <div class="eyebrow">MONOGRAFÍA DE AVANCES</div>
      <h1>Tramos y capas</h1>
      <p>Avances por capas, descarga, extendido, perfilado y compactación sobre la traza.</p>
    </div>
    <div class="heading-actions">
      <button class="btn btn-secondary" data-action="open-map-modal">${icon('expand')} Monografía ampliada</button>
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
        <span class="muted">PK ${pkLabel(metrics.start)} a PK ${pkLabel(metrics.end)} · Longitud: ${metrics.distance} m · Grilla cada 10 m</span>
      </div>
      <div class="map-view-toggle">
        <button class="btn btn-sm ${!isTimeline ? 'btn-primary' : 'btn-secondary'}" data-action="set-map-view" data-mode="cards">Tarjetas ordenadas</button>
        <button class="btn btn-sm ${isTimeline ? 'btn-primary' : 'btn-secondary'}" data-action="set-map-view" data-mode="timeline">Traza continua (10 m)</button>
      </div>
    </div>
    ${relevant.length ? (
      isTimeline
        ? `${renderTimelineSurface(relevant, metrics)}<p class="hint">Desliza horizontalmente para recorrer toda la longitud de la traza. Intervalos fijados de 10 en 10 metros.</p>`
        : renderCardsList(relevant, metrics)
    ) : empty('Todavía no hay avances en este tramo', 'Los registros con avances de capas (descarga, extendido, perfilado, compactación) aparecerán aquí.')}
    <div class="legend">
      <span><i></i>Pendiente</span>
      <span><i class="approved"></i>Aprobado</span>
      <span><i class="rejected"></i>Rechazado</span>
      <span><i class="no-control"></i>Sin control</span>
      <span><i class="in-progress"></i>En curso</span>
    </div>
  </div>`;
}
