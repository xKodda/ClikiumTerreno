// ============================================================================
// CLIKIUM TERRENO — VISTA: RECURSOS (ES MODULE)
// ============================================================================

import { esc, num, icon, primary, empty, activityLabel, findAssignedActivity } from '../utils.js';
import { stateStore, selectedDay } from '../state.js';

export function renderResources() {
  const day = selectedDay();
  if (!day) {
    return `<div class="heading"><div><div class="eyebrow">RECURSOS</div><h1>Personal y maquinaria</h1></div></div>${empty('Primero inicia una jornada', 'Las horas se registran por persona y equipo para cada día.', primary('start-day', 'Iniciar jornada'))}`;
  }
  const hh = day.crew.reduce((n, p) => n + p.hours + p.extra, 0);
  const extra = day.crew.reduce((n, p) => n + p.extra, 0);
  const standby = day.machines.reduce((n, m) => n + m.standby, 0);
  const assignedCrew = day.crew.filter(p => !!findAssignedActivity(p, day));
  const assignedHh = assignedCrew.reduce((n, p) => n + p.hours + p.extra, 0);
  const prevDay = [...stateStore.state.days].filter(d => d.id !== day.id && d.date <= day.date && (d.crew.length > 0 || d.machines.length > 0)).sort((a, b) => b.date.localeCompare(a.date))[0];

  return `<div class="heading">
    <div>
      <div class="eyebrow">${esc(day.project)} · ${esc(day.date)}</div>
      <h1>Personal y maquinaria</h1>
      <p>Horas manuales y asignación de la jornada de ${esc(day.user)}.</p>
    </div>
    ${!day.closedAt && prevDay ? `<button class="btn btn-secondary" data-action="copy-yesterday-crew" data-id="${day.id}">${icon('history')} Traer cuadrilla de ayer</button>` : ''}
  </div>
  <section class="panel">
    <div class="section-head">
      <h2>Cuadrilla</h2>
      <div class="heading-actions">
        ${!day.closedAt ? `<button class="btn btn-secondary" data-action="add-multi-person" data-id="${day.id}">${icon('people')} Selección múltiple</button> ${primary('add-person', 'Agregar persona', day.id)}` : '<span class="badge">Jornada cerrada</span>'}
      </div>
    </div>
    ${day.crew.length ? `<div class="table-scroll"><table><thead><tr><th>Persona / cargo</th><th>Asignación a actividad</th><th>Horas</th><th>Extras</th><th>HH</th><th></th></tr></thead><tbody>${day.crew.map(p => {
      const matched = findAssignedActivity(p, day);
      const asgBadge = matched
        ? `<span class="badge approved" title="Vinculado a: ${esc(activityLabel(matched))}">${esc(p.assignment)}</span>`
        : (p.assignment ? `<span class="badge no-control">${esc(p.assignment)}</span>` : `<span class="badge annulled">Sin asignar</span>`);
      return `<tr><td>${esc(p.name)}<br><span class="muted">${esc(p.role)}</span></td><td>${asgBadge}</td><td>${num(p.hours)}</td><td>${num(p.extra)}</td><td>${num(p.hours + p.extra)}</td><td>${!day.closedAt ? `<button class="text-button" data-action="edit-person" data-id="${p.id}" data-day-id="${day.id}">Editar</button>` : ''}</td></tr>`;
    }).join('')}</tbody></table></div>` : '<p class="muted">Agrega la cuadrilla y sus horas efectivas. Se suman las HH automáticamente.</p>'}
    <div class="resource-total">Total: <strong>${num(hh)} HH</strong> (${day.crew.length} pers.) · Asignadas a avances: <strong>${num(assignedHh)} HH</strong> (${assignedCrew.length} pers.) · Horas extra: <strong>${num(extra)} h</strong></div>
  </section>
  <section class="panel">
    <div class="section-head">
      <h2>Maquinaria</h2>
      ${!day.closedAt ? primary('add-machine', 'Agregar equipo', day.id) : ''}
    </div>
    ${day.machines.length ? `<div class="table-scroll"><table><thead><tr><th>Equipo</th><th>Operador</th><th>Asignación</th><th>Operación</th><th>Stand-by</th><th></th></tr></thead><tbody>${day.machines.map(m => {
      const matched = findAssignedActivity(m, day);
      const mAsgBadge = matched
        ? `<span class="badge approved" title="Vinculado a: ${esc(activityLabel(matched))}">${esc(m.assignment)}</span>`
        : (m.assignment ? `<span class="badge no-control">${esc(m.assignment)}</span>` : `<span class="badge annulled">Sin asignar</span>`);
      return `<tr><td>${esc(m.name)}</td><td>${esc(m.operator)}</td><td>${mAsgBadge}</td><td>${num(m.hours)} h</td><td>${num(m.standby)} h</td><td>${!day.closedAt ? `<button class="text-button" data-action="edit-machine" data-id="${m.id}" data-day-id="${day.id}">Editar</button>` : ''}</td></tr>`;
    }).join('')}</tbody></table></div>` : '<p class="muted">Registra horas productivas y tiempos de espera del equipo.</p>'}
    <div class="resource-total">Stand-by total: <strong>${num(standby)} h</strong></div>
  </section>`;
}
