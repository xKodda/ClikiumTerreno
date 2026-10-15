// ============================================================================
// CLIKIUM TERRENO — VISTA: RECURSOS (ES MODULE)
// ============================================================================

import { esc, num, icon, primary, empty, activityLabel, findAssignedActivity, dataTable, cmpDesc, getMachineForOperator, nameKey } from '../utils.js';
import { stateStore, selectedDay } from '../state.js';

const assignmentBadge = (record, day) => {
  const matched = findAssignedActivity(record, day);
  if (matched) return `<span class="badge approved" title="Vinculado a: ${esc(activityLabel(matched))}">${esc(record.assignment)}</span>`;
  if (record.assignment) return `<span class="badge no-control">${esc(record.assignment)}</span>`;
  return '<span class="badge annulled">Sin asignar</span>';
};

export function renderResources() {
  const day = selectedDay();
  if (!day) {
    return `<div class="heading"><div><div class="eyebrow">RECURSOS</div><h1>Personal y maquinaria</h1></div></div>${empty('Primero inicia una jornada', 'Las horas se registran por persona y equipo para cada día.', primary('start-day', 'Iniciar jornada'))}`;
  }
  const open = !day.closedAt;
  const hh = day.crew.reduce((n, p) => n + p.hours + p.extra, 0);
  const extra = day.crew.reduce((n, p) => n + p.extra, 0);
  const assignedCrew = day.crew.filter(p => !!findAssignedActivity(p, day));
  const assignedHh = assignedCrew.reduce((n, p) => n + p.hours + p.extra, 0);
  const machHours = day.machines.reduce((n, m) => n + m.hours, 0);
  const standby = day.machines.reduce((n, m) => n + m.standby, 0);
  const assignedMachines = day.machines.filter(m => !!findAssignedActivity(m, day));
  const assignedMachHours = assignedMachines.reduce((n, m) => n + m.hours, 0);
  const uniqueMachines = new Set(day.machines.map(m => nameKey(m.name))).size;

  const prevDay = (stateStore.state?.days || [])
    .filter(d => d.id !== day.id && d.date <= day.date && (d.crew.length > 0 || d.machines.length > 0))
    .sort((a, b) => cmpDesc(a.date, b.date))[0];

  // Agrupar cuadrilla por trabajador único para desplegar su distribución de 9h
  const workerGroupsMap = new Map();
  for (const p of day.crew) {
    const k = nameKey(p.name);
    if (!workerGroupsMap.has(k)) {
      workerGroupsMap.set(k, {
        name: p.name,
        role: p.role || 'M1',
        entries: [],
        normalHours: 0,
        extraHours: 0,
        totalHours: 0
      });
    }
    const g = workerGroupsMap.get(k);
    g.entries.push(p);
    g.normalHours += Number(p.hours) || 0;
    g.extraHours += Number(p.extra) || 0;
    g.totalHours += (Number(p.hours) || 0) + (Number(p.extra) || 0);
    if (p.role) g.role = p.role;
  }
  const workerGroups = [...workerGroupsMap.values()];

  const crewCardsHtml = workerGroups.length ? `
    <div class="crew-workers-grid">
      ${workerGroups.map(g => {
        const opMach = getMachineForOperator(g.name, day, stateStore.catalog?.maquinarias);
        const roleLabel = `${esc(g.role)}${opMach ? ` · Op. ${esc(opMach.name)}` : ''}`;
        const remainingNormal = Math.max(0, 9 - g.normalHours);
        const percent = Math.min(100, Math.round((g.normalHours / 9) * 100));
        const isComplete = g.normalHours >= 9;

        let statusBadge = '';
        if (isComplete) {
          statusBadge = '<span class="badge approved" style="font-weight:700">9.0/9h completas</span>';
        } else if (g.normalHours === 0) {
          statusBadge = '<span class="badge" style="background:#f1f5f9;color:#475569">0/9h (9h libres)</span>';
        } else {
          statusBadge = `<span class="badge pending" style="font-weight:700">${num(g.normalHours)}/9h (quedan ${num(remainingNormal)}h libres)</span>`;
        }

        const extraBadge = g.extraHours > 0
          ? `<span class="badge" style="background:#f3e8ff;color:#6b21a8;border:1px solid #d8b4fe;font-weight:700">+${num(g.extraHours)}h extra</span>`
          : '';

        return `
          <div class="crew-worker-card">
            <div class="crew-worker-header">
              <div class="crew-worker-title">
                <div class="crew-worker-name">${esc(g.name)}</div>
                <div class="crew-worker-role">${roleLabel}</div>
              </div>
              <div class="crew-worker-metrics">
                <div class="crew-worker-badges">
                  ${statusBadge}
                  ${extraBadge}
                </div>
                <div class="crew-worker-total">${num(g.totalHours)} HH</div>
              </div>
            </div>

            <div class="crew-progress-track" title="${num(g.normalHours)} de 9h normales completadas">
              <div class="crew-progress-fill ${isComplete ? 'complete' : ''}" style="width:${percent}%"></div>
            </div>

            <div class="crew-worker-activities">
              <div class="crew-activities-caption">Labores en que participó hoy (${g.entries.length}):</div>
              <div class="crew-activities-list">
                ${g.entries.map(e => `
                  <div class="crew-activity-item">
                    <div class="crew-activity-main">
                      <div class="crew-activity-tag">${assignmentBadge(e, day)}</div>
                      <div class="crew-activity-hours">
                        <strong>${num(e.hours)} h</strong> <span class="muted">normal</span>
                        ${e.extra ? ` · <strong style="color:#7c3aed">+${num(e.extra)} h</strong> <span class="muted">extra</span>` : ''}
                      </div>
                    </div>
                    ${open ? `
                      <div class="crew-activity-actions">
                        <button type="button" class="btn btn-xs btn-secondary" data-action="edit-person" data-id="${esc(e.id)}" data-day-id="${esc(day.id)}">Editar</button>
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>

            ${open ? `
              <div class="crew-worker-footer">
                <button type="button" class="btn btn-xs btn-outline" data-action="add-person-for-worker" data-worker="${esc(g.name)}" data-day-id="${esc(day.id)}">
                  + Asignar a otra labor ${remainingNormal > 0 ? `(${num(remainingNormal)}h libres)` : '(horas extra)'}
                </button>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>` : '<p class="muted">Agrega los trabajadores de la jornada y sus horas en faena. Se suman las HH automáticamente.</p>';

  const machineTable = dataTable(
    ['Equipo', 'Operador a cargo', 'Asignación', 'Operación', 'Stand-by', ''],
    day.machines.map(m => [
      `<strong>${esc(m.name)}</strong>`,
      `<span style="font-weight:550;color:#1e293b">${esc(m.operator || 'Sin asignar')}</span>`,
      assignmentBadge(m, day),
      `<strong>${num(m.hours)} h</strong>`,
      num(m.standby) > 0 ? `<span style="color:var(--amber);font-weight:600">${num(m.standby)} h</span>` : `${num(m.standby)} h`,
      open ? `<button class="text-button" data-action="edit-machine" data-id="${esc(m.id)}" data-day-id="${esc(day.id)}">Editar</button>` : ''
    ])
  );

  return `<div class="heading">
    <div>
      <div class="eyebrow">RECURSOS · ${esc(day.date)}</div>
      <h1>Personal y maquinaria</h1>
      <p>Gestión de cuadrilla, maquinaria pesada y distribución de horas en faena.</p>
    </div>
    ${open && prevDay ? `<div class="heading-actions"><button class="btn btn-secondary" data-action="copy-yesterday-crew" data-id="${esc(day.id)}">${icon('history')} Copiar recursos de ayer</button></div>` : ''}
  </div>
  <section class="panel">
    <div class="section-head section-head-wrap">
      <div>
        <h2 style="margin-bottom:2px">Cuadrilla</h2>
        <span class="muted" style="font-size:0.8rem">Distribución de las 9h estándar por maestro entre sus distintas actividades</span>
      </div>
      <div class="heading-actions">
        ${open ? `<button class="btn btn-secondary" data-action="add-multi-person" data-id="${esc(day.id)}">${icon('people')} Selección múltiple</button> ${primary('add-person', 'Agregar persona', day.id)}` : '<span class="badge">Jornada cerrada</span>'}
      </div>
    </div>
    ${crewCardsHtml}
    ${(() => {
      const uniqueWorkers = workerGroups.length;
      return `<div class="resource-total">Total: <strong>${num(hh)} HH</strong> (${uniqueWorkers} trabajadores en faena${day.crew.length > uniqueWorkers ? ` · ${day.crew.length} asignaciones` : ''}) · Asignadas: <strong>${num(assignedHh)} HH</strong> · Extra: <strong>${num(extra)} h</strong></div>`;
    })()}
  </section>
  <section class="panel">
    <div class="section-head section-head-wrap">
      <div>
        <h2 style="margin-bottom:2px">Maquinaria</h2>
        <span class="muted" style="font-size:0.8rem">Equipos del proyecto y operadores enlazados</span>
      </div>
      ${open ? `<div class="heading-actions">
        <button class="btn btn-secondary" data-action="add-multi-machine" data-id="${esc(day.id)}">${icon('truck')} Selección múltiple</button>
        ${primary('add-machine', 'Agregar equipo', day.id)}
      </div>` : '<span class="badge">Jornada cerrada</span>'}
    </div>
    ${day.machines.length ? machineTable : '<p class="muted">Registra los equipos oficiales o externos y sus tiempos de operación y espera.</p>'}
    <div class="resource-total">Total: <strong>${num(machHours)} h operación</strong> (${uniqueMachines} equipos en faena${day.machines.length > uniqueMachines ? ` · ${day.machines.length} asignaciones` : ''}) · Asignadas: <strong>${num(assignedMachHours)} h</strong> · Stand-by: <strong>${num(standby)} h</strong></div>
  </section>`;
}
