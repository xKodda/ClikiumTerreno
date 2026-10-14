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

export const normalizeProjectId = proj => {
  if (!proj) return 'tunel_lo_ruiz';
  const clean = String(proj).trim().toLowerCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (clean.includes('tunel') || clean.includes('ruiz')) return 'tunel_lo_ruiz';
  return clean || 'tunel_lo_ruiz';
};

export const projectDisplayName = projId => {
  if (!projId || projId === 'tunel_lo_ruiz') return 'Túnel Lo Ruiz';
  return projId;
};

export const isBotaderoOrAcopio = sector => !!sector && (sector.toLowerCase().includes('botadero') || sector.toLowerCase().includes('acopio'));

export const sectorUsesPk = sector => !!sector && /^\s*(eje\b|camino)/i.test(sector);

export const PROJECT_MATERIALS = [
  'Base',
  'Marina',
  'Escarpe',
  'Excavación TCN',
  'Material inadecuado',
  'Material no competente',
  'Terraplén bajo 4"',
  'Terraplén bajo 6"',
  'Relleno estructural bajo 3"',
  'Material de relleno'
];

export const TRANSFER_DESTINATIONS = [
  'Centro de acopio',
  'Botadero',
  'Camino de servicio',
  'Acceso al túnel',
  'Plataforma de trabajo',
  'Frente de avance',
  'Otro destino'
];

export const TRANSFER_PURPOSES = [
  'Mejoramiento de camino',
  'Mejoramiento de condiciones de terreno',
  'Centro de acopio',
  'Mejoramiento de acceso',
  'Disposición en botadero',
  'Terraplén de acceso',
  'Cama de apoyo',
  'Otra finalidad'
];

export const CIVIL_WORKS_PROCESSES = [
  'Cierre perimetral',
  'Colocación de pantallas acústicas',
  'Sumideros',
  'Instalación de cámaras tipo A',
  'Instalación de soleras/aceras tipo A',
  'Instalación de soleras/aceras tipo B',
  'Instalación y colocación de moldaje',
  'Hormigonado',
  'Trabajos enfierradura',
  'Corte de asfalto con cortadora de asfalto',
  'Otro'
];

export const STANDARD_PROCESSES = [
  'Movimiento de tierra',
  'Relleno estructural',
  'Terraplén',
  'Subrasante',
  'Base estabilizada',
  'Bajo 4 pulgadas',
  'Obra de arte',
  'Muros TEM',
  'Otro'
];

export const isLoadingActivity = act => {
  if (!act) return false;
  const a = String(act).toLowerCase();
  return a.includes('cargu') || a.includes('excav') || a.includes('escarpe');
};

export const isLoadingOnlyActivity = act => {
  if (!act) return false;
  const a = String(act).toLowerCase();
  return (a.includes('cargu') || a.includes('traslado')) && !a.includes('extendido') && !a.includes('descarga');
};

export const isTransferActivity = act => {
  if (!act) return false;
  const a = String(act).toLowerCase();
  return a.includes('traslado') || a.includes('transporte');
};

export const isLayerActivity = act => {
  if (!act) return false;
  const a = String(act).toLowerCase();
  // El carguío puro o traslado de material no trabaja sobre capas de compactación
  if ((a === 'carguío' || a === 'carguio' || a.includes('traslado')) && !a.includes('extendido')) {
    return false;
  }
  // Cama de apoyo, tubos, obras civiles, escarpe y excavaciones no usan capa de compactación
  if (a.includes('cama de apoyo') || a.includes('tubo') || a.includes('obras civiles') || a.includes('escarpe') || (a.includes('excav') && !a.includes('sello'))) {
    return false;
  }
  return true;
};

export const isDirectMeasurementActivity = (act, process = '') => {
  if (!act) return false;
  const a = String(act).toLowerCase();
  if (a.includes('tubo') || a.includes('cama de apoyo') || a.includes('obras civiles')) {
    return true;
  }
  const p = String(process).toLowerCase();
  if (p.includes('cierre') || p.includes('pantalla') || p.includes('sumidero') || p.includes('cámara') || p.includes('camara') || p.includes('solera') || p.includes('moldaje') || p.includes('enfierradura') || p.includes('corte de asfalto')) {
    return true;
  }
  return false;
};

export const getDefaultUnit = (act, process = '') => {
  const a = String(act || '').toLowerCase();
  const p = String(process || '').toLowerCase();
  if (a.includes('tubo') || a.includes('cama de apoyo')) return 'ml';
  if (p.includes('cierre') || p.includes('solera') || p.includes('corte de asfalto') || p.includes('pantalla')) return 'ml';
  if (p.includes('sumidero') || p.includes('cámara') || p.includes('camara')) return 'un';
  if (p.includes('moldaje')) return 'm²';
  if (p.includes('enfierradura')) return 'kg';
  if (p.includes('hormigonado')) return 'm³';
  return 'm³';
};

export const pkNumber = pk => {
  if (pk === null || pk === undefined) return null;
  let str = String(pk).trim().replace(/^pk\s*:?\s*/i, '').trim();
  if (!str) return null;
  if (str.includes('+')) {
    const [kmStr, mStr] = str.split('+');
    const km = parseFloat(kmStr);
    const m = parseFloat(mStr);
    return isNaN(km) || isNaN(m) ? null : Math.round((km * 1000 + m) * 100) / 100;
  }
  const meters = parseFloat(str);
  return isNaN(meters) || meters < 0 ? null : Math.round(meters * 100) / 100;
};

export const normalizePk = val => {
  if (val === null || val === undefined) return '';
  let str = String(val).trim().replace(/^pk\s*:?\s*/i, '').trim();
  if (!str) return '';

  // Si ya tiene '+', separar km y metros respetando decimales exactos
  if (str.includes('+')) {
    const parts = str.split('+');
    const km = parseInt(parts[0], 10);
    const mRaw = parts[1];
    if (isNaN(km) || isNaN(parseFloat(mRaw))) return str;
    const mNum = Math.round(parseFloat(mRaw) * 100) / 100;
    const mInt = Math.floor(mNum);
    const dec = Math.round((mNum - mInt) * 100);
    const mDec = dec > 0 ? '.' + String(dec).padStart(2, '0').replace(/0+$/, '') : '';
    return `${km}+${String(mInt).padStart(3, '0')}${mDec}`;
  }

  // Si se ingresó solo número de metros (ej: 1179.42 -> 1+179.42, 800 -> 0+800, 1600 -> 1+600)
  const num = parseFloat(str);
  if (isNaN(num) || num < 0) return str;
  const rounded = Math.round(num * 100) / 100;
  const km = Math.floor(rounded / 1000);
  const mRem = Math.round((rounded - km * 1000) * 100) / 100;
  const mInt = Math.floor(mRem);
  const dec = Math.round((mRem - mInt) * 100);
  const mDec = dec > 0 ? '.' + String(dec).padStart(2, '0').replace(/0+$/, '') : '';
  return `${km}+${String(mInt).padStart(3, '0')}${mDec}`;
};

export const formatActivityMeta = (desc, { material, destination, purpose } = {}) => {
  const tags = [];
  if (material) tags.push(`Material: ${material}`);
  if (destination) tags.push(`Destino: ${destination}`);
  if (purpose) tags.push(`Finalidad: ${purpose}`);
  const prefix = tags.length ? `[${tags.join(' | ')}]` : '';
  const clean = String(desc || '').replace(/^\[[^\]]+\]\s*/, '').trim();
  if (prefix && clean) return `${prefix} ${clean}`;
  return prefix || clean;
};

export const parseActivityMeta = (desc = '') => {
  const str = String(desc || '').trim();
  if (!str.startsWith('[')) return { material: '', destination: '', purpose: '', cleanDescription: str };
  const match = str.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (!match) return { material: '', destination: '', purpose: '', cleanDescription: str };
  const tokens = match[1].split('|').map(s => s.trim());
  let material = '', destination = '', purpose = '';
  for (const t of tokens) {
    if (/^material\s*:/i.test(t)) material = t.replace(/^material\s*:\s*/i, '').trim();
    if (/^destino\s*:/i.test(t)) destination = t.replace(/^destino\s*:\s*/i, '').trim();
    if (/^finalidad\s*:/i.test(t)) purpose = t.replace(/^finalidad\s*:\s*/i, '').trim();
  }
  return { material, destination, purpose, cleanDescription: match[2].trim() };
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
  if (!record || !day || !day.activities) return null;
  if (record.activityId) {
    const direct = day.activities.find(a => a.id === record.activityId);
    if (direct) return direct;
  }
  if (!record.assignment) return null;
  const asg = nameKey(record.assignment);
  return day.activities.find(a => {
    const lbl = nameKey(activityLabel(a));
    const simpleLbl = nameKey(`${a.sector} · ${a.activity}`);
    return lbl === asg || asg === simpleLbl || asg.startsWith(lbl) || asg.startsWith(simpleLbl);
  }) || null;
};

export const getMachineForOperator = (operatorName, day, catalog = []) => {
  if (!operatorName) return null;
  const k = nameKey(operatorName);
  const mDay = (day?.machines || []).find(m => nameKey(m.operator) === k);
  if (mDay) return { name: mDay.name, operator: mDay.operator };
  const catList = Array.isArray(catalog) ? catalog : [];
  const mCat = catList.find(m => nameKey(m.operator) === k);
  if (mCat) return { name: mCat.name, operator: mCat.operator };
  return null;
};

export const isLayerPlacement = a => {
  if (!a || !a.activity) return false;
  const act = a.activity.toLowerCase();
  const proc = (a.process || '').toLowerCase();
  // Strictly exclude carguío and traslado
  if (act.includes('cargu') || act.includes('traslado') || proc.includes('cargu') || proc.includes('traslado')) {
    return false;
  }
  // Must be real layer / compaction progress
  const keywords = ['descarga', 'extend', 'perfil', 'compact', 'capa', 'terrapl', 'subrasante', 'base', 'subbase', 'relleno', 'suelo'];
  const hasKeyword = keywords.some(k => act.includes(k) || proc.includes(k));
  const hasLayer = Number(a.layer) > 0;
  return hasKeyword || hasLayer;
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

/** Comparador descendente seguro ante valores nulos (fechas ISO / strings). */
export const cmpDesc = (a, b) => String(b ?? '').localeCompare(String(a ?? ''));

/**
 * Tabla responsiva: en escritorio es una tabla normal; en móvil cada fila
 * se convierte en una tarjeta con etiquetas (data-label), sin scroll horizontal.
 * @param {string[]} headings
 * @param {string[][]} rows  celdas ya escapadas (HTML)
 * @param {string} [footer]  fila <tr> opcional para <tfoot>
 */
export const dataTable = (headings, rows, footer = '') => `<div class="table-wrap"><table class="data-table">
  <thead><tr>${headings.map(h => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(cells => `<tr>${cells.map((c, i) => `<td data-label="${esc(headings[i] || '')}">${c}</td>`).join('')}</tr>`).join('')}</tbody>
  ${footer ? `<tfoot>${footer}</tfoot>` : ''}
</table></div>`;

let toastTimer = null;
export function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 4500);
}
