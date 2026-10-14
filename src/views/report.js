// ============================================================================
// CLIKIUM TERRENO — VISTA: INFORME Y RESUMEN (ES MODULE)
// ============================================================================

import {
  esc, num, stamp, icon, empty, badge, controlBadges, layerLabel,
  activityStage, getActivityStatus, getControlStatus, requiredControlsLabel,
  findAssignedActivity, sectorUsesPk, dataTable, projectDisplayName
} from '../utils.js';
import { selectedDay, metadata, amount, getMediaUrl } from '../state.js';

export function reportText(day) {
  const crewTotalHh = day.crew.reduce((n, p) => n + p.hours + (p.extra || 0), 0);
  return [
    `INFORME DIARIO DE TERRENO — CLIKIUM`,
    `PROYECTO: ${projectDisplayName(day.project)}${day.isDemo ? ' · EJEMPLO' : ''}`,
    `FECHA: ${day.date} · RESPONSABLE: ${day.user}`,
    `ESTADO JORNADA: ${day.closedAt ? 'Cerrada' : 'En curso'}`,
    '----------------------------------------',
    ...day.activities.flatMap((a, i) => {
      const aCrew = day.crew.filter(p => findAssignedActivity(p, day)?.id === a.id);
      const aMach = day.machines.filter(m => findAssignedActivity(m, day)?.id === a.id);
      const aHh = aCrew.reduce((n, p) => n + p.hours + p.extra, 0);
      const resText = (aCrew.length || aMach.length)
        ? `Recursos: ${aCrew.length ? `${aCrew.length} personas (${num(aHh)} HH)` : ''}${aCrew.length && aMach.length ? ' · ' : ''}${aMach.length ? `Equipos: ${aMach.map(m => m.name).join(', ')}` : ''}`
        : '';
      const pkText = (sectorUsesPk(a.sector) && a.pkStart) ? ` · PK ${a.pkStart} a ${a.pkEnd}` : '';
      return [
        `${i + 1}. ${a.activity} / ${a.process}${layerLabel(a) !== 'Sin capa' ? ' / ' + layerLabel(a) : ''}`,
        `   Sector: ${a.sector}${pkText}`,
        `   Avance: ${amount(a)}${a.mode === 'trips' ? ' (' + a.trips + ' viajes × ' + num(a.capacity) + ' m³)' : ''}`,
        `   Estado: ${activityStage(a)} · Control: ${getActivityStatus(a)}${a.requiredControls !== 'none' ? ` (Lab: ${getControlStatus(a, 'Laboratorio')} · Topo: ${getControlStatus(a, 'Topografía')})` : ''}`,
        resText ? `   ${resText}` : '',
        a.description ? `   Descrip: ${a.description}` : '',
        a.notes ? `   Obs: ${a.notes}` : '',
        a.photoIds.length ? `   [${a.photoIds.length} fotos adjuntas]` : '',
        ''
      ].filter(Boolean);
    }),
    '----------------------------------------',
    `HORAS HOMBRE (HH) POR TRABAJADOR (${day.crew.length} personas · ${num(crewTotalHh)} HH):`,
    ...day.crew.map(p => {
      const tot = p.hours + (p.extra || 0);
      const extraTxt = p.extra ? ` [${p.hours}h + ${p.extra}h ext]` : '';
      const asigTxt = p.assignment ? ` → Asignación: ${p.assignment}` : ' → General';
      return `   - ${p.name} (${p.role || 'M1'}): ${num(tot)} HH${extraTxt}${asigTxt}`;
    }),
    `   TOTAL HH DEL DÍA: ${num(crewTotalHh)} HH`,
    '----------------------------------------',
    'MAQUINARIA:',
    ...day.machines.map(m => `   - ${m.name} (${m.operator}): ${num(m.hours)}h op · ${num(m.standby)}h std-by`),
    day.notes ? `\nObservaciones generales: ${day.notes}` : '',
    '',
    `Emitido desde faena por ${day.user}.`
  ].filter(x => x !== undefined).join('\n');
}

export function renderReport() {
  const day = selectedDay();
  if (!day) return empty('Jornada no encontrada', 'Abre una jornada desde el historial.');

  const quantities = new Map();
  day.activities.filter(a => !a.isAnnulled && a.unit !== '%').forEach(a => {
    const key = [a.activity, a.process, a.unit].join(' / ');
    quantities.set(key, (quantities.get(key) || 0) + (Number(a.quantity) || 0));
  });
  const crewHours = day.crew.reduce((n, p) => n + p.hours, 0);
  const crewExtra = day.crew.reduce((n, p) => n + (p.extra || 0), 0);
  const project = projectDisplayName(day.project);

  return `<div class="report-actions">
    <button class="btn btn-secondary" data-action="navigate" data-view="today">← Volver</button>
    <button class="btn btn-whatsapp" data-action="whatsapp-report" data-id="${esc(day.id)}">WhatsApp</button>
    <button class="btn btn-primary" data-action="print">${icon('report')}PDF</button>
    <button class="btn btn-secondary" data-action="copy-report" data-id="${esc(day.id)}">Copiar texto</button>
  </div>
  <article class="report">
    <header class="report-head">
      <div>
        <div class="eyebrow">CLIKIUM TERRENO · INFORME DIARIO${day.isDemo ? ' · EJEMPLO' : ''}</div>
        <h1>Control de Obra y Faena</h1>
        <p class="muted"><strong>Proyecto:</strong> ${esc(project)} · <strong>Capataz:</strong> ${esc(day.user)}</p>
      </div>
      <div class="report-meta">
        <strong>${esc(day.date)}</strong><br>
        <span class="muted">${day.closedAt ? 'Jornada cerrada' : 'Jornada abierta · borrador'}</span>
      </div>
    </header>
    <p><strong>Inicio:</strong> ${day.startedAt ? stamp(day.startedAt) : '—'}${day.closedAt ? ` · <strong>Cierre:</strong> ${stamp(day.closedAt)}` : ''}</p>
    <p><strong>Registros:</strong> ${day.activities.length} · <strong>Fotos:</strong> ${day.activities.reduce((n, a) => n + a.photoIds.length, 0)} · <strong>HH:</strong> ${num(crewHours + crewExtra)}</p>
    ${quantities.size ? `<h3>Cantidades por actividad y proceso</h3>${dataTable(['Actividad / proceso / unidad', 'Cantidad'], [...quantities].map(([label, q]) => [esc(label), num(q)]))}
    <p class="hint">Las cantidades de distintos procesos no son un volumen neto.</p>` : ''}
    ${day.activities.map((a, i) => {
      const aCrew = day.crew.filter(p => findAssignedActivity(p, day)?.id === a.id);
      const aMach = day.machines.filter(m => findAssignedActivity(m, day)?.id === a.id);
      const aHh = aCrew.reduce((n, p) => n + p.hours + p.extra, 0);
      const resSummary = (aCrew.length || aMach.length)
        ? `<p><strong>Recursos asignados:</strong> ${aCrew.length ? `${aCrew.length} personas (${num(aHh)} HH)` : ''}${aCrew.length && aMach.length ? ' · ' : ''}${aMach.length ? `Equipos: ${aMach.map(m => esc(m.name)).join(', ')}` : ''}</p>`
        : '';
      const usesPk = sectorUsesPk(a.sector) && a.pkStart;
      const pkText = usesPk ? ` · PK ${esc(a.pkStart)} a ${esc(a.pkEnd)}` : '';
      const layer = layerLabel(a) !== 'Sin capa' ? esc(layerLabel(a)) : '';
      const controlRows = a.controls.map(c => {
        const attUrl = c.attachmentId ? (getMediaUrl(c.attachmentId) || `/api/media/${c.attachmentId}`) : '';
        return [
          c.at ? stamp(c.at) : '—', esc(c.type), esc(c.status),
          `${esc(c.author)}${c.note ? '<br>' + esc(c.note) : ''}${attUrl ? `<br><a href="${attUrl}" target="_blank" rel="noopener">Protocolo: ${esc(metadata(c.attachmentId)?.name || 'Ver archivo')}</a>` : ''}`
        ];
      });
      return `<section class="report-activity">
        <h3>${i + 1}. ${esc(a.activity)} / ${esc(a.process)}${layer ? ' / ' + layer : ''}${a.isAnnulled ? ' (ANULADO)' : ''}</h3>
        <p>${esc(a.sector)}${usesPk ? ` · <strong>PK ${esc(a.pkStart)} a ${esc(a.pkEnd)}</strong>` : ''}</p>
        <p><strong>Ejecutado:</strong> ${amount(a)}${a.mode === 'trips' ? ` · ${a.trips} viajes × ${num(a.capacity)} m³` : ''} · <strong>Ejecución:</strong> ${esc(activityStage(a))}</p>
        <p><strong>Exigencia:</strong> ${esc(requiredControlsLabel(a.requiredControls))} · ${badge(getActivityStatus(a))} ${a.requiredControls !== 'none' ? controlBadges(a) : ''}</p>
        ${resSummary}
        ${a.description ? `<p>${esc(a.description)}</p>` : ''}
        ${a.notes ? `<p><strong>Observaciones:</strong> ${esc(a.notes)}</p>` : ''}
        ${controlRows.length ? dataTable(['Fecha / hora', 'Control', 'Resultado', 'Responsable / observación'], controlRows) : ''}
        ${a.photoIds.length ? `<div class="photo-grid">${a.photoIds.map(id => {
          const pUrl = getMediaUrl(id) || `/api/media/${id}`;
          return `<figure><img src="${pUrl}" alt="${esc(a.description || a.activity)}" loading="lazy"><figcaption class="photo-label">${esc(a.description || a.activity)} · ${esc(a.sector)}${pkText}${layer ? ' · ' + layer : ''}</figcaption></figure>`;
        }).join('')}</div>` : ''}
      </section>`;
    }).join('')}
    ${day.crew.length ? `<h3>Personal y horas hombre (HH)</h3>${dataTable(
      ['Persona / cargo', 'Asignación', 'Horas', 'Extras', 'Total HH'],
      day.crew.map(p => [`${esc(p.name)} / ${esc(p.role || 'M1')}`, esc(p.assignment || 'General'), `${num(p.hours)} h`, `${num(p.extra || 0)} h`, `<strong>${num(p.hours + (p.extra || 0))} HH</strong>`]),
      `<tr class="table-total"><td data-label="">TOTAL (${day.crew.length} personas)</td><td data-label="">—</td><td data-label="Horas">${num(crewHours)} h</td><td data-label="Extras">${num(crewExtra)} h</td><td data-label="Total HH">${num(crewHours + crewExtra)} HH</td></tr>`
    )}` : ''}
    ${day.machines.length ? `<h3>Maquinaria</h3>${dataTable(
      ['Equipo', 'Operador', 'Asignación', 'Operación', 'Stand-by'],
      day.machines.map(m => [esc(m.name), esc(m.operator), esc(m.assignment), `${num(m.hours)} h`, `${num(m.standby)} h`])
    )}` : ''}
    ${day.notes ? `<div class="notes"><strong>Observaciones del día</strong><br>${esc(day.notes)}</div>` : ''}
    <footer class="report-footer">Generado con Clikium Terreno · ${stamp(new Date().toISOString())}. Los estados reflejan registros del sistema y no reemplazan protocolos firmados.</footer>
  </article>`;
}
