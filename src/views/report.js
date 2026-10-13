// ============================================================================
// CLIKIUM TERRENO — VISTA: INFORME Y RESUMEN (ES MODULE)
// ============================================================================

import {
  esc, num, stamp, icon, empty, badge, controlBadges, layerLabel,
  activityStage, getActivityStatus, getControlStatus, requiredControlsLabel,
  findAssignedActivity, sectorUsesPk
} from '../utils.js';
import { selectedDay, metadata, amount, getMediaUrl } from '../state.js';

export function reportText(day) {
  const crewTotalHh = day.crew.reduce((n, p) => n + p.hours + (p.extra || 0), 0);
  return [
    `📋 INFORME DIARIO DE TERRENO · CLIKIUM (BETA)`,
    `DESTINATARIO: Matías Ramos (Secretario Técnico)`,
    `PROYECTO: ${day.project}${day.isDemo ? ' · EJEMPLO' : ''}`,
    `FECHA: ${day.date} · EMISOR: ${day.user}`,
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
        `▶ ${i + 1}. ${a.activity} / ${a.process}${layerLabel(a) !== 'Sin capa' ? ' / ' + layerLabel(a) : ''}`,
        `   Sector: ${a.sector}${pkText}`,
        `   Avance: ${amount(a)}${a.mode === 'trips' ? ' (' + a.trips + ' viajes × ' + num(a.capacity) + ' m³)' : ''}`,
        `   Estado: ${activityStage(a)} · Control: ${getActivityStatus(a)}${a.requiredControls !== 'none' ? ` (Lab: ${getControlStatus(a, 'Laboratorio')} · Topo: ${getControlStatus(a, 'Topografía')})` : ''}`,
        resText ? `   ${resText}` : '',
        a.description ? `   Descrip: ${a.description}` : '',
        a.notes ? `   Obs: ${a.notes}` : '',
        a.photoIds.length ? `   📸 ${a.photoIds.length} fotos adjuntas` : '',
        ''
      ].filter(Boolean);
    }),
    '----------------------------------------',
    `👷 HORAS HOMBRE (HH) POR TRABAJADOR (${day.crew.length} personas · ${num(crewTotalHh)} HH):`,
    ...day.crew.map(p => {
      const tot = p.hours + (p.extra || 0);
      const extraTxt = p.extra ? ` [${p.hours}h + ${p.extra}h ext]` : '';
      const asigTxt = p.assignment ? ` → Asignación: ${p.assignment}` : ' → General';
      return `   • ${p.name} (${p.role || 'M1'}): ${num(tot)} HH${extraTxt}${asigTxt}`;
    }),
    `   TOTAL HH DEL DÍA: ${num(crewTotalHh)} HH`,
    '----------------------------------------',
    '🚜 MAQUINARIA:',
    ...day.machines.map(m => `   • ${m.name} (${m.operator}): ${num(m.hours)}h op · ${num(m.standby)}h std-by`),
    day.notes ? `\n📝 Observaciones generales: ${day.notes}` : '',
    '',
    `Emitido desde faena por ${day.user} para el Secretario Técnico Matías Ramos.`
  ].filter(x => x !== undefined).join('\n');
}

export function renderReport() {
  const day = selectedDay();
  if (!day) return empty('Jornada no encontrada', 'Abre una jornada desde el historial.');

  const resources = (title, rows, headings) => rows.length ? `<h3>${title}</h3><div class="table-scroll"><table><thead><tr>${headings.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : '';
  const quantities = new Map();
  day.activities.filter(a => a.unit !== '%').forEach(a => {
    const key = [a.activity, a.process, a.unit].join(' / ');
    quantities.set(key, (quantities.get(key) || 0) + a.quantity);
  });

  return `<div class="report-actions">
    <button class="btn btn-secondary" data-action="navigate" data-view="today">Volver a jornada</button>
    <button class="btn btn-whatsapp" data-action="whatsapp-report" data-id="${day.id}">📱 Enviar a Matías Ramos (WhatsApp)</button>
    <button class="btn btn-primary" data-action="print">${icon('report')}Imprimir / guardar PDF</button>
    <button class="btn btn-secondary" data-action="copy-report" data-id="${day.id}">Copiar texto</button>
  </div>
  <article class="report">
    <div class="report-head">
      <div>
        <div class="eyebrow">CLIKIUM · TERRENO (VERSIÓN BETA)${day.isDemo ? ' · EJEMPLO' : ''}</div>
        <h1>Informe diario de obra</h1>
        <p style="margin:4px 0 0 0;font-size:0.95rem;color:var(--muted)">
          <strong>Para:</strong> Matías Ramos (Secretario Técnico) &nbsp;·&nbsp; <strong>De:</strong> ${esc(day.user)} (Capataz)
        </p>
      </div>
        <p>${esc(day.project)}</p>
      </div>
      <div>
        <strong>${esc(day.date)}</strong><br>
        ${esc(day.user)}<br>
        <span class="muted">${day.closedAt ? 'Jornada cerrada' : 'Jornada abierta · borrador'}</span>
      </div>
    </div>
    <p><strong>Inicio:</strong> ${stamp(day.startedAt)}${day.closedAt ? ` · <strong>Cierre:</strong> ${stamp(day.closedAt)}` : ''}</p>
    <p><strong>Registros:</strong> ${day.activities.length} · <strong>Fotos:</strong> ${day.activities.reduce((n, a) => n + a.photoIds.length, 0)} · <strong>HH:</strong> ${num(day.crew.reduce((n, p) => n + p.hours + p.extra, 0))}</p>
    ${resources('Cantidades por actividad y proceso', [...quantities].map(([label, quantity]) => `<tr><td>${esc(label)}</td><td>${num(quantity)}</td></tr>`), ['Actividad / proceso / unidad', 'Cantidad'])}
    <p class="hint">Las cantidades de distintos procesos no son un volumen neto. Los porcentajes se muestran individualmente.</p>
    ${day.activities.map((a, i) => {
      const aCrew = day.crew.filter(p => findAssignedActivity(p, day)?.id === a.id);
      const aMach = day.machines.filter(m => findAssignedActivity(m, day)?.id === a.id);
      const aHh = aCrew.reduce((n, p) => n + p.hours + p.extra, 0);
      const resSummary = (aCrew.length || aMach.length)
        ? `<p><strong>Recursos asignados:</strong> ${aCrew.length ? `${aCrew.length} personas (${num(aHh)} HH)` : ''}${aCrew.length && aMach.length ? ' · ' : ''}${aMach.length ? `Equipos: ${aMach.map(m => esc(m.name)).join(', ')}` : ''}</p>`
        : '';
      const pkSpan = (sectorUsesPk(a.sector) && a.pkStart) ? ` · <strong>PK ${esc(a.pkStart)} a ${esc(a.pkEnd)}</strong>` : '';
      const photoPkText = (sectorUsesPk(a.sector) && a.pkStart) ? ` · PK ${esc(a.pkStart)} a ${esc(a.pkEnd)}` : '';
      return `<section class="report-activity">
        <h3>${i + 1}. ${esc(a.activity)} / ${esc(a.process)}${layerLabel(a) !== 'Sin capa' ? ' / ' + esc(layerLabel(a)) : ''}</h3>
        <p>${esc(a.sector)}${pkSpan}</p>
        <p><strong>Ejecutado:</strong> ${amount(a)}${a.mode === 'trips' ? ` · ${a.trips} viajes × ${num(a.capacity)} m³` : ''} · <strong>Ejecución:</strong> ${esc(activityStage(a))}</p>
        <p><strong>Exigencia:</strong> ${esc(requiredControlsLabel(a.requiredControls))} · <strong>Control general:</strong> ${badge(getActivityStatus(a))} ${a.requiredControls !== 'none' ? `· ${controlBadges(a)}` : ''}</p>
        ${resSummary}
        ${a.description ? `<p>${esc(a.description)}</p>` : ''}
        ${a.notes ? `<p><strong>Observaciones:</strong> ${esc(a.notes)}</p>` : ''}
        <table>
          <thead><tr><th>Fecha / hora</th><th>Control</th><th>Resultado</th><th>Responsable / observación</th></tr></thead>
          <tbody>${a.controls.map(c => {
            const attUrl = c.attachmentId ? (getMediaUrl(c.attachmentId) || `/api/media/${c.attachmentId}`) : '';
            return `<tr><td>${stamp(c.at)}</td><td>${esc(c.type)}</td><td>${esc(c.status)}</td><td>${esc(c.author)}${c.note ? '<br>' + esc(c.note) : ''}${attUrl ? `<br><a href="${attUrl}" target="_blank">Protocolo: ${esc(metadata(c.attachmentId)?.name || 'Ver archivo')}</a>` : ''}</td></tr>`;
          }).join('')}</tbody>
        </table>
        ${a.photoIds.length ? `<div class="photo-grid" style="margin-top:16px">${a.photoIds.map(id => {
          const pUrl = getMediaUrl(id) || `/api/media/${id}`;
          return `<div><img src="${pUrl}" alt="${esc(a.description || a.activity)}"><span class="photo-label">${esc(a.description || a.activity)} · ${esc(a.sector)}${photoPkText}${layerLabel(a) !== 'Sin capa' ? ' · ' + esc(layerLabel(a)) : ''}</span></div>`;
        }).join('')}</div>` : ''}
      </section>`;
    }).join('')}
    <h3>Personal y horas hombre (HH)</h3>
    <div class="table-scroll">
      <table>
        <thead><tr><th>Persona / cargo</th><th>Asignación</th><th>Horas normales</th><th>Horas extras</th><th>Total HH</th></tr></thead>
        <tbody>
          ${day.crew.map(p => `<tr><td>${esc(p.name)} / ${esc(p.role || 'M1')}</td><td>${esc(p.assignment || 'General')}</td><td>${num(p.hours)} h</td><td>${num(p.extra || 0)} h</td><td><strong>${num(p.hours + (p.extra || 0))} HH</strong></td></tr>`).join('')}
        </tbody>
        <tfoot>
          <tr style="background:#f1f5f9;font-weight:700"><td>TOTAL CUADRILLA (${day.crew.length} personas)</td><td>-</td><td>${num(day.crew.reduce((n, p) => n + p.hours, 0))} h</td><td>${num(day.crew.reduce((n, p) => n + (p.extra || 0), 0))} h</td><td style="color:#0f172a;font-size:1rem">${num(day.crew.reduce((n, p) => n + p.hours + (p.extra || 0), 0))} HH</td></tr>
        </tfoot>
      </table>
    </div>
    ${resources('Maquinaria', day.machines.map(m => `<tr><td>${esc(m.name)}</td><td>${esc(m.operator)}</td><td>${esc(m.assignment)}</td><td>${num(m.hours)} h</td><td>${num(m.standby)} h</td></tr>`), ['Equipo', 'Operador', 'Asignación', 'Operación', 'Stand-by'])}
    ${day.notes ? `<div class="notes"><strong>Observaciones del día</strong><br>${esc(day.notes)}</div>` : ''}
    <div class="report-footer">Generado con Clikium Terreno · Versión Beta · ${stamp(new Date().toISOString())}. Los estados reflejan registros del sistema y no reemplazan protocolos firmados.</div>
  </article>`;
}
