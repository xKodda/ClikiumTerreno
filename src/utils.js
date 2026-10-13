// ============================================================================
// CLIKIUM TERRENO — UTILIDADES Y FORMATO (ES MODULE)
// ============================================================================

export const $ = (selector, root = document) => root.querySelector(selector);

export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

export const uid = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export const now = () => new Date().toISOString();

export const today = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

export const num = value => new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 2
}).format(Number(value) || 0);

export const dateLabel = date => new Intl.DateTimeFormat('es-CL', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
}).format(new Date(`${date}T12:00:00Z`));

export const stamp = at => new Intl.DateTimeFormat('es-CL', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago'
}).format(new Date(at));

export const timeOnly = at => new Intl.DateTimeFormat('es-CL', {
  hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago'
}).format(new Date(at));

export const isBotaderoOrAcopio = sector => !!sector && (sector.toLowerCase().includes('botadero') || sector.toLowerCase().includes('acopio'));

export const sectorUsesPk = sector => !!sector && /^\s*(eje\b|camino)/i.test(sector);

export const pkNumber = pk => {
  if (pk === null || pk === undefined) return null;
  const str = String(pk).trim();
  if (!str) return null;
  if (str.includes('+')) {
    const [kmStr, mStr] = str.split('+');
    const km = Number(kmStr);
    const m = Number(mStr);
    return isNaN(km) || isNaN(m) ? null : km * 1000 + m;
  }
  const meters = Number(str);
  return isNaN(meters) || meters < 0 ? null : meters;
};

export const normalizePk = val => {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str) return '';

  // Si ya tiene '+', separar km y metros
  if (str.includes('+')) {
    const parts = str.split('+');
    const km = parseInt(parts[0], 10);
    const mRaw = parts[1];
    if (isNaN(km) || isNaN(parseFloat(mRaw))) return str;
    const mParts = mRaw.split('.');
    const mInt = mParts[0].padStart(3, '0');
    const mDec = mParts[1] ? `.${mParts[1].slice(0, 2)}` : '';
    return `${km}+${mInt}${mDec}`;
  }

  // Si se ingresó sólo número o decimal (ej: 0 -> 0+000, 5 -> 0+005, 200 -> 0+200, 800 -> 0+800, 1250 -> 1+250)
  const num = parseFloat(str);
  if (isNaN(num) || num < 0) return str;
  const km = Math.floor(num / 1000);
  const mRem = num % 1000;
  const mParts = String(mRem).split('.');
  const mInt = mParts[0].padStart(3, '0');
  const mDec = mParts[1] ? `.${mParts[1].slice(0, 2)}` : '';
  return `${km}+${mInt}${mDec}`;
};

export const statusClass = status => {
  if (status === 'Aprobado' || status === 'Registro completo') return 'approved';
  if (status === 'Rechazado') return 'rejected';
  if (status === 'No requiere control' || status === 'No requiere') return 'no-control';
  if (status === 'Anulado') return 'annulled';
  return 'pending';
};

export const requiredControlsLabel = req => {
  if (req === 'none') return 'Sin exigencia (Registro completo)';
  if (req === 'lab') return 'Solo Laboratorio';
  if (req === 'top') return 'Solo Topografía';
  return 'Laboratorio y Topografía';
};

export const layerLabel = a => {
  if (!a) return 'Sin capa';
  const lt = a.layerType;
  if (lt === 'sello_natural' || (lt === 'sello' && !a.layer) || a.layer === 'Sello natural') return 'Sello natural';
  if (lt === 'sello_mejorado') return 'Sello mejorado';
  if (lt === 'terraplen_4') return a.layer ? `Capa ${a.layer} · Terraplén (Bajo 4")` : 'Terraplén (Bajo 4")';
  if (lt === 'terraplen_6') return a.layer ? `Capa ${a.layer} · Terraplén (Bajo 6")` : 'Terraplén (Bajo 6")';
  if (lt === 'relleno_estructural_3' || (lt === 'relleno' && a.layer)) return a.layer ? `Capa ${a.layer} · Relleno estructural (Bajo 3")` : 'Relleno estructural (Bajo 3")';
  if (lt === 'marina') return a.layer ? `Capa ${a.layer} (Marina)` : 'Capa de marina';
  if (a.layer && Number(a.layer) > 0) return `Capa ${a.layer}`;
  return 'Capa';
};

export const activityLabel = a => {
  if (!a) return '';
  const layer = layerLabel(a);
  const layerStr = layer !== 'Sin capa' ? ` · ${layer}` : '';
  const pkStr = (sectorUsesPk(a.sector) && a.pkStart) ? ` (PK ${a.pkStart}${a.pkEnd && a.pkEnd !== a.pkStart ? '-' + a.pkEnd : ''})` : '';
  return `${a.sector} · ${a.activity}${layerStr}${pkStr}`;
};

export const getControlStatus = (activity, type) => {
  if (activity?.isAnnulled) return 'Anulado';
  const req = activity.requiredControls || 'both';
  const matching = (activity.controls || []).filter(c => c.type === type);
  if (matching.length > 0) return matching.at(-1).status;
  const isReq = (req === 'both') || (req === 'lab' && type === 'Laboratorio') || (req === 'top' && type === 'Topografía');
  return isReq ? 'Control pendiente' : 'No requiere';
};

export const getActivityStatus = activity => {
  if (activity?.isAnnulled) return 'Anulado';
  const req = activity.requiredControls || 'both';
  if (req === 'none') return 'Registro completo';
  const typesToCheck = [];
  if (req === 'both' || req === 'lab') typesToCheck.push('Laboratorio');
  if (req === 'both' || req === 'top') typesToCheck.push('Topografía');
  const statuses = typesToCheck.map(t => getControlStatus(activity, t));
  if (statuses.includes('Rechazado')) return 'Rechazado';
  if (statuses.includes('Control pendiente')) return 'Control pendiente';
  if (statuses.every(s => s === 'Aprobado')) return 'Aprobado';
  return 'Control pendiente';
};

export const activityStage = activity => {
  if (activity?.isAnnulled) return 'Anulado';
  if (getActivityStatus(activity) === 'Aprobado' || getActivityStatus(activity) === 'Registro completo') return 'Terminado';
  return activity?.stage || 'Terminado';
};

export const latest = activity => activity.controls.at(-1);

export const badge = status => `<span class="badge ${statusClass(status)}">${esc(status)}</span>`;

export const controlBadges = activity => {
  if (activity?.isAnnulled) return `<span class="badge annulled">Anulado</span>`;
  const req = activity.requiredControls || 'both';
  if (req === 'none') return `<span class="badge approved">Registro completo</span>`;
  const badges = [];
  if (req === 'both' || req === 'lab') {
    const sLab = getControlStatus(activity, 'Laboratorio');
    badges.push(`<span class="badge ${statusClass(sLab)}">Lab: ${esc(sLab)}</span>`);
  }
  if (req === 'both' || req === 'top') {
    const sTop = getControlStatus(activity, 'Topografía');
    badges.push(`<span class="badge ${statusClass(sTop)}">Topo: ${esc(sTop)}</span>`);
  }
  return badges.join(' ');
};

export const findAssignedActivity = (record, day) => {
  if (!record || !record.assignment || !day || !day.activities) return null;
  const asg = nameKey(record.assignment);
  return day.activities.find(a => {
    const lbl = nameKey(activityLabel(a));
    const simpleLbl = nameKey(`${a.sector} · ${a.activity}`);
    return lbl === asg || asg === simpleLbl || asg.startsWith(lbl) || asg.startsWith(simpleLbl);
  }) || null;
};

export const nameKey = name => String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export const paths = {
  day: 'M8 3v4m8-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1ZM8 14h3m-3 3h7',
  history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7m2-5v6l4 2',
  map: 'M4 5h16M4 12h16M4 19h16M7 3v4m10 3v4m-6 3v4',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4m-5-11a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  backup: 'M5 3h12l3 3v15H4V3h1Zm3 0v6h8V3M8 21v-8h8v8',
  plus: 'M12 5v14M5 12h14',
  shovel: 'm16 3 5 5-4 4-5-5 4-4Zm-2 7-9 9m-3-1 4 4 3-3-4-4-3 3Z',
  layers: 'm12 3 10 6-10 6L2 9l10-6Zm-10 12 10 6 10-6M2 12l10 6 10-6',
  check: 'm5 12 4 4L19 6',
  photo: 'M4 6h4l2-3h4l2 3h4v15H4V6Zm12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  report: 'M6 3h9l4 4v14H5V3h1Zm8 0v5h5M8 12h8m-8 4h8',
  truck: 'M2 7h12v10H2V7Zm12 3h4l4 4v3h-8V10ZM7 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
};

export const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.day}"/></svg>`;

export const option = (opt, current) => {
  const val = typeof opt === 'object' ? opt.value : opt;
  const lbl = typeof opt === 'object' ? opt.label : opt;
  return `<option value="${esc(val)}" ${val === current ? 'selected' : ''}>${esc(lbl)}</option>`;
};

export const input = (name, label, value = '', attributes = '') => `<label class="field"><span>${label}</span><input name="${name}" value="${esc(value)}" ${attributes}></label>`;

export const select = (name, label, options, value, attributes = '') => `<label class="field"><span>${label}</span><select name="${name}" ${attributes}>${options.map(x => option(x, value)).join('')}</select></label>`;

export const textarea = (name, label, value = '') => `<label class="field full"><span>${label}</span><textarea name="${name}">${esc(value)}</textarea></label>`;

export const primary = (action, text, id = '') => `<button class="btn btn-primary" data-action="${action}" ${id ? `data-id="${esc(id)}"` : ''}>${icon('plus')}${text}</button>`;

export const empty = (title, text, action = '') => `<div class="empty"><div class="empty-icon">${icon('day')}</div><h2>${title}</h2><p>${text}</p>${action}</div>`;

let toastTimer = null;
export function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 4500);
}
