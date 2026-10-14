// ============================================================================
// CLIKIUM TERRENO — VISTA: RECURSOS (ES MODULE)
// ============================================================================

import { esc, num, icon, primary, empty, activityLabel, findAssignedActivity, dataTable, cmpDesc } from '../utils.js';
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
  const standby = day.machines.reduce((n, m) => n + m.standby, 0);
  const assignedCrew = day.crew.filter(p => !!findAssignedActivity(p, day));
  const assignedHh = assignedCrew.reduce((n, p) => n + p.hours + p.extra, 0);
  const prevDay = (stateStore.state?.days || [])
    .filter(d => d.id !== day.id && d.date <= day.date && (d.crew.length > 0 || d.machines.length > 0))
    .sort((a, b) => cmpDesc(a.date, b.date))[0];

  const crewTable = dataTable(
    ['Persona / cargo', 'Asignación', 'Horas', 'Extras', 'HH', ''],
    day.crew.map(p => [
      `<strong>${esc(p.name)}</strong><br><span class="muted">${esc(p.role)}</span>`,
      assignmentBadge(p, day),
      num(p.hours), num(p.extra), `<strong>${num(p.hours + p.extra)}</strong>`,
      open ? `<button class="text-button" data-action="edit-person" data-id="${esc(p.id)}" data-day-id="${esc(day.id)}">Editar</button>` : ''
    ])
  );

  const machineTable = dataTable(
    ['Equipo', 'Operador', 'Asignación', 'Operación', 'Stand-by', ''],
    day.machines.map(m => [
      `<strong>${esc(m.name)}</strong>`, esc(m.operator), assignmentBadge(m, day),
      `${num(m.hours)} h`, `${num(m.standby)} h`,
      open ? `<button class="text-button" data-action="edit-machine" data-id="${esc(m.id)}" data-day-id="${esc(day.id)}">Editar</button>` : ''
    ])
  );

  return `<div class="heading">
    <div>
      <div class="eyebrow">RECURSOS · ${esc(day.date)}</div>
      <h1>Personal y maquinaria</h1>
    </div>
    ${open && prevDay ? `<div class="heading-actions"><button class="btn btn-secondary" data-action="copy-yesterday-crew" data-id="${esc(day.id)}">${icon('history')} Traer cuadrilla de ayer</button></div>` : ''}
  </div>
  <section class="panel">
    <div class="section-head section-head-wrap">
      <h2>Cuadrilla</h2>
      <div class="heading-actions">
        ${open ? `<button class="btn btn-secondary" data-action="add-multi-person" data-id="${esc(day.id)}">${icon('people')} Selección múltiple</button> ${primary('add-person', 'Agregar persona', day.id)}` : '<span class="badge">Jornada cerrada</span>'}
      </div>
    </div>
    ${day.crew.length ? crewTable : '<p class="muted">Agrega la cuadrilla y sus horas efectivas. Se suman las HH automáticamente.</p>'}
    <div class="resource-total">Total: <strong>${num(hh)} HH</strong> (${day.crew.length} pers.) · Asignadas: <strong>${num(assignedHh)} HH</strong> (${assignedCrew.length} pers.) · Extra: <strong>${num(extra)} h</strong></div>
  </section>
  <section class="panel">
    <div class="section-head section-head-wrap">
      <h2>Maquinaria</h2>
      ${open ? `<div class="heading-actions">${primary('add-machine', 'Agregar equipo', day.id)}</div>` : ''}
    </div>
    ${day.machines.length ? machineTable : '<p class="muted">Registra horas productivas y tiempos de espera del equipo.</p>'}
    <div class="resource-total">Stand-by total: <strong>${num(standby)} h</strong></div>
  </section>`;
}
