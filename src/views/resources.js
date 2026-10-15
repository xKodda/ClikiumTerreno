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

  const crewTable = dataTable(
    ['Persona / cargo', 'Asignación', 'Horas', 'Extras', 'HH', ''],
    day.crew.map(p => {
      const opMach = getMachineForOperator(p.name, day, stateStore.catalog?.maquinarias);
      const roleText = `${esc(p.role)}${opMach ? ` · ${esc(opMach.name)}` : ''}`;
      return [
        `<strong>${esc(p.name)}</strong><br><span class="muted">${roleText}</span>`,
        assignmentBadge(p, day),
        num(p.hours), num(p.extra), `<strong>${num(p.hours + p.extra)}</strong>`,
        open ? `<button class="text-button" data-action="edit-person" data-id="${esc(p.id)}" data-day-id="${esc(day.id)}">Editar</button>` : ''
      ];
    })
  );

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
        <span class="muted" style="font-size:0.8rem">Trabajadores en terreno y distribución de HH</span>
      </div>
      <div class="heading-actions">
        ${open ? `<button class="btn btn-secondary" data-action="add-multi-person" data-id="${esc(day.id)}">${icon('people')} Selección múltiple</button> ${primary('add-person', 'Agregar persona', day.id)}` : '<span class="badge">Jornada cerrada</span>'}
      </div>
    </div>
    ${day.crew.length ? crewTable : '<p class="muted">Agrega la cuadrilla y sus horas efectivas. Se suman las HH automáticamente.</p>'}
    ${(() => {
      const uniqueWorkers = new Set(day.crew.map(p => nameKey(p.name))).size;
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
