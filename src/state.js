// ============================================================================
// CLIKIUM TERRENO — ESTADO GLOBAL Y SINCRONIZACIÓN (ES MODULE)
// ============================================================================

import { $, esc, nameKey, today, toast, option, normalizeProjectId } from './utils.js';

export const LOCAL_CACHE_KEY = 'clikium_terreno_state_cache';
export const PENDING_SYNC_KEY = 'clikium_terreno_pending_state';
export const SELECTED_DAY_KEY = 'clikium_selected_day_id';

export const stateStore = {
  state: null,
  remoteState: null,
  version: 0,
  media: [],
  catalog: { capataces: [], sectores: [] },
  view: 'today',
  selectedDayId: typeof localStorage !== 'undefined' ? (localStorage.getItem(SELECTED_DAY_KEY) || null) : null,
  historySearch: '',
  historyMonth: '',
  mapSector: 'Eje 48',
  mapLayer: '',
  mapProcess: '',
  mapDate: '',
  pendingSyncState: null,
  pendingTabFilter: 'all',
  pendingScope: 'today',
  saving: false
};

export function persistLocalState(state) {
  if (!state) return;
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Error guardando caché local:", e);
  }
}

export function mergePendingWithRemote(remoteState, pendingState) {
  if (!remoteState) return pendingState;
  if (!pendingState) return remoteState;

  const resultState = structuredClone(remoteState);
  resultState.settings = { ...remoteState.settings, ...pendingState.settings };
  
  const remoteDays = resultState.days || [];
  const pendingDays = pendingState.days || [];

  for (const pDay of pendingDays) {
    const existingIndex = remoteDays.findIndex(d => d.id === pDay.id);
    if (existingIndex === -1) {
      remoteDays.unshift(structuredClone(pDay));
    } else {
      const rDay = remoteDays[existingIndex];
      if (pDay.notes && !rDay.notes) rDay.notes = pDay.notes;
      if (pDay.closedAt && !rDay.closedAt) rDay.closedAt = pDay.closedAt;

      const rActivities = rDay.activities || [];
      const pActivities = pDay.activities || [];
      for (const pAct of pActivities) {
        const actIndex = rActivities.findIndex(a => a.id === pAct.id);
        if (actIndex === -1) {
          rActivities.push(structuredClone(pAct));
        } else {
          const rAct = rActivities[actIndex];
          const rCtrlIds = new Set((rAct.controls || []).map(c => c.id));
          for (const c of pAct.controls || []) {
            if (!rCtrlIds.has(c.id)) {
              rAct.controls.push(structuredClone(c));
              rCtrlIds.add(c.id);
            }
          }
          const allPhotos = new Set([...(rAct.photoIds || []), ...(pAct.photoIds || [])]);
          rAct.photoIds = Array.from(allPhotos);
          rAct.quantity = pAct.quantity;
          rAct.trips = pAct.trips;
          rAct.stage = pAct.stage;
          if (pAct.isAnnulled) {
            rAct.isAnnulled = true;
            rAct.annulReason = pAct.annulReason;
            rAct.annulledAt = pAct.annulledAt;
          }
        }
      }
      rDay.activities = rActivities;

      if (pDay.crew && pDay.crew.length > 0) {
        rDay.crew = structuredClone(pDay.crew);
      }
      if (pDay.machines && pDay.machines.length > 0) {
        rDay.machines = structuredClone(pDay.machines);
      }
    }
  }

  resultState.days = remoteDays;
  return resultState;
}

export const foremanId = day => day.userId || stateStore.catalog.capataces.find(p => nameKey(p.nombre) === nameKey(day.user))?.id || '';

export const allActivities = () => (stateStore.state?.days || []).flatMap(day => day.activities.map(a => ({ ...a, day })));

export const selectedDay = () => {
  const days = stateStore.state?.days || [];
  const s = stateStore.state?.settings || {};
  if (stateStore.selectedDayId) {
    const found = days.find(d => d.id === stateStore.selectedDayId);
    if (found) return found;
  }
  const sProj = normalizeProjectId(s.project);
  const openDays = days.filter(d => !d.isDemo && !d.closedAt && (s.userId ? foremanId(d) === s.userId : nameKey(d.user) === nameKey(s.user)) && normalizeProjectId(d.project) === sProj);
  if (openDays.length) return openDays.sort((a, b) => b.date.localeCompare(a.date) || (b.startedAt || '').localeCompare(a.startedAt || ''))[0];
  
  const anyOpen = days.filter(d => !d.isDemo && !d.closedAt);
  if (anyOpen.length) return anyOpen.sort((a, b) => b.date.localeCompare(a.date) || (b.startedAt || '').localeCompare(a.startedAt || ''))[0];

  const todayDay = days.find(d => d.date === today() && (s.userId ? foremanId(d) === s.userId : nameKey(d.user) === nameKey(s.user)) && normalizeProjectId(d.project) === sProj && !d.isDemo);
  if (todayDay) return todayDay;
  const sorted = [...days].filter(d => !d.isDemo).sort((a, b) => b.date.localeCompare(a.date));
  return sorted[0];
};

export const metadata = id => stateStore.media.find(m => m.id === id);

export const amount = activity => `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(Number(activity.quantity) || 0)} ${activity.unit}`;

import { loadState, diffAndSave, uploadMedia, getMediaUrl } from './data/sync.js';
export { getMediaUrl };

export const capatazField = () => {
  const capataces = stateStore.catalog?.capataces || [{ id: 'christofer_godoy', nombre: 'Christofer Godoy' }];
  return `<label class="field"><span>Capataz</span><select name="userId" required>${capataces.map(p => `<option value="${esc(p.id)}" selected>${esc(p.nombre)}</option>`).join('')}</select></label>`;
};

const FALLBACK_SECTOR_GROUPS = [
  { grupo: 'Ejes', sectores: ['Eje 48'] },
  { grupo: 'Otros', sectores: ['Botadero', 'Acopio'] }
];

/** Grupos de sectores del catálogo, con respaldo si el catálogo aún no carga (offline). */
export const catalogSectorGroups = () => {
  const cat = stateStore.catalog || {};
  if (Array.isArray(cat.gruposSectores) && cat.gruposSectores.some(g => g.sectores?.length)) {
    return cat.gruposSectores.filter(g => g.sectores?.length);
  }
  if (Array.isArray(cat.sectores) && cat.sectores.length) return [{ grupo: 'Sectores', sectores: cat.sectores }];
  return FALLBACK_SECTOR_GROUPS;
};

/** Lista plana de sectores del catálogo. */
export const catalogSectors = () => catalogSectorGroups().flatMap(g => g.sectores);

export const sectorSelect = value => {
  const groups = catalogSectorGroups();
  const known = new Set(groups.flatMap(g => g.sectores));
  const extra = value && !known.has(value) ? `<option value="${esc(value)}" selected>${esc(value)}</option>` : '';
  const optgroups = groups.map(g => `<optgroup label="${esc(g.grupo)}">${g.sectores.map(s => option(s, value)).join('')}</optgroup>`).join('');
  return `<label class="field"><span>Sector</span><select name="sector">${extra}${optgroups}</select></label>`;
};

export function updateSaveStatus(status, customHtml = null) {
  const el = $('#save-status');
  if (!el) return;
  el.className = 'save-status';
  if (status === 'saving') {
    el.classList.add('status-saving');
    el.innerHTML = '🔄 Guardando…';
  } else if (status === 'pending') {
    el.classList.add('status-pending');
    el.innerHTML = customHtml || `⚠️ Pendiente <button class="btn btn-sm btn-retry" data-action="retry-sync">Reintentar</button>`;
  } else if (status === 'saved') {
    el.classList.add('status-saved');
    el.innerHTML = '● Sincronizado';
  } else if (status === 'offline') {
    el.classList.add('status-offline');
    el.innerHTML = customHtml || '⚡ Copia local';
  } else {
    el.classList.add('status-error');
    el.innerHTML = customHtml || 'Sin conexión';
  }
}

export function editDay(dayId) {
  const nextState = structuredClone(stateStore.state);
  const day = nextState.days.find(d => d.id === dayId);
  if (!day) throw new Error('Jornada no encontrada.');
  return { nextState, day };
}

export async function save(nextState) {
  stateStore.state = nextState;
  persistLocalState(nextState);

  if (stateStore.saving) {
    stateStore.pendingSyncState = { state: nextState, at: new Date().toISOString() };
    try { localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(stateStore.pendingSyncState)); } catch (e) {}
    updateSaveStatus('pending');
    return;
  }

  stateStore.saving = true;
  updateSaveStatus('saving');
  try {
    const baseState = stateStore.remoteState || { days: [] };
    await diffAndSave(baseState, nextState);
    stateStore.remoteState = structuredClone(nextState);
    stateStore.pendingSyncState = null;
    localStorage.removeItem(PENDING_SYNC_KEY);
    persistLocalState(nextState);
    updateSaveStatus('saved');
  } catch (error) {
    console.error("Error al sincronizar con Supabase:", error);
    stateStore.pendingSyncState = { state: nextState, at: new Date().toISOString() };
    try { localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(stateStore.pendingSyncState)); } catch (e) {}
    updateSaveStatus('pending');
    toast('Guardado en teléfono. Pendiente de sincronizar.');
  } finally {
    stateStore.saving = false;
  }
}

export async function retrySync(onSuccessRender = () => {}) {
  if (!stateStore.pendingSyncState || stateStore.saving) return;
  updateSaveStatus('saving');
  try {
    const targetState = stateStore.pendingSyncState.state || stateStore.state;
    const baseState = stateStore.remoteState || { days: [] };
    await diffAndSave(baseState, targetState);
    stateStore.remoteState = structuredClone(targetState);
    stateStore.pendingSyncState = null;
    localStorage.removeItem(PENDING_SYNC_KEY);
    persistLocalState(stateStore.state);
    updateSaveStatus('saved');
    toast('Cambios pendientes sincronizados correctamente.');
    onSuccessRender();
  } catch (error) {
    console.error("Error en retrySync:", error);
    updateSaveStatus('pending');
    toast('Pendiente: ' + (error.message || 'Sin conexión'));
  }
}

async function compressImage(file) {
  if (!file.type || !file.type.startsWith('image/')) return file;
  return new Promise(resolve => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = e => {
      img.onload = () => {
        const maxDim = 1600;
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => {
          if (!blob) return resolve(file);
          const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
            type: 'image/webp'
          });
          resolve(compressed);
        }, 'image/webp', 0.82);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export async function upload(file) {
  if (!file) return null;
  const processed = await compressImage(file);
  const mediaId = await uploadMedia(processed);
  return mediaId;
}
