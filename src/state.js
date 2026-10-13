// ============================================================================
// CLIKIUM TERRENO — ESTADO GLOBAL Y SINCRONIZACIÓN (ES MODULE)
// ============================================================================

import { $, esc, nameKey, today, toast, option } from './utils.js';

export const stateStore = {
  state: null,
  version: 0,
  media: [],
  catalog: { capataces: [], sectores: [] },
  view: 'today',
  selectedDayId: null,
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

export const foremanId = day => day.userId || stateStore.catalog.capataces.find(p => nameKey(p.nombre) === nameKey(day.user))?.id || '';

export const allActivities = () => (stateStore.state?.days || []).flatMap(day => day.activities.map(a => ({ ...a, day })));

export const selectedDay = () => {
  const days = stateStore.state?.days || [];
  const s = stateStore.state?.settings || {};
  if (stateStore.selectedDayId) {
    const found = days.find(d => d.id === stateStore.selectedDayId);
    if (found) return found;
  }
  const openDays = days.filter(d => !d.isDemo && !d.closedAt && (s.userId ? foremanId(d) === s.userId : d.user === s.user) && d.project === s.project);
  if (openDays.length) return openDays.sort((a, b) => b.date.localeCompare(a.date) || (b.startedAt || '').localeCompare(a.startedAt || ''))[0];
  const todayDay = days.find(d => d.date === today() && (s.userId ? foremanId(d) === s.userId : d.user === s.user) && d.project === s.project && !d.isDemo);
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

export const sectorSelect = value => {
  const groups = stateStore.catalog.gruposSectores || [{ grupo: 'Sectores', sectores: stateStore.catalog.sectores }];
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
    el.innerHTML = 'Guardando…';
  } else if (status === 'pending') {
    el.classList.add('status-pending');
    el.innerHTML = customHtml || `⚠️ Pendiente de enviar <button class="btn btn-sm btn-retry" data-action="retry-sync">Reintentar</button>`;
  } else if (status === 'saved') {
    el.classList.add('status-saved');
    el.innerHTML = 'Sincronizado';
  } else {
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
  if (stateStore.saving) return;
  stateStore.saving = true;
  updateSaveStatus('saving');
  try {
    await diffAndSave(stateStore.state, nextState);
    stateStore.state = nextState;
    stateStore.pendingSyncState = null;
    localStorage.removeItem('clikium_terreno_pending_state');
    updateSaveStatus('saved');
  } catch (error) {
    stateStore.state = nextState;
    stateStore.pendingSyncState = { state: nextState, at: new Date().toISOString() };
    localStorage.setItem('clikium_terreno_pending_state', JSON.stringify(stateStore.pendingSyncState));
    updateSaveStatus('pending');
    toast('Sin conexión: guardado como borrador local.');
  } finally {
    stateStore.saving = false;
  }
}

export async function retrySync(onSuccessRender = () => {}) {
  if (!stateStore.pendingSyncState || stateStore.saving) return;
  updateSaveStatus('saving');
  try {
    await diffAndSave(stateStore.state, stateStore.pendingSyncState.state);
    stateStore.pendingSyncState = null;
    localStorage.removeItem('clikium_terreno_pending_state');
    updateSaveStatus('saved');
    toast('Cambios pendientes sincronizados correctamente.');
    onSuccessRender();
  } catch (error) {
    updateSaveStatus('pending');
    toast('No se pudo sincronizar: ' + error.message);
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
