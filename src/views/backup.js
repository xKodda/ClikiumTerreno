// ============================================================================
// CLIKIUM TERRENO — VISTA: CONFIGURACIÓN Y SINCRONIZACIÓN CLOUD v3.0
// ============================================================================

import { input, icon, esc, toast, projectDisplayName } from '../utils.js';
import { stateStore, capatazField } from '../state.js';

export function renderBackup() {
  const s = stateStore.state?.settings || {};
  const daysCount = stateStore.state?.days?.length || 0;
  const mediaCount = stateStore.media?.length || 0;
  const savedPhone = localStorage.getItem('clikium_phone_matias_ramos') || '';
  const isPending = !!stateStore.pendingSyncState;

  return `<div class="heading">
    <div>
      <div class="eyebrow">CLIKIUM TERRENO · VERSIÓN BETA</div>
      <h1>Configuración de obra y nube</h1>
      <p>Sincronización directa con Supabase y destinatarios de informes de terreno.</p>
    </div>
  </div>
  ${isPending ? `
    <div style="background:#fffbeb;border:1px solid #fde68a;padding:14px 18px;border-radius:10px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div style="font-size:0.88rem;color:#92400e;line-height:1.4">
        <strong>Tienes cambios guardados en este dispositivo pendientes de sincronizar con Supabase.</strong>
        <br><span style="font-size:0.8rem;color:#b45309">Se guardaron de forma segura en la memoria de tu teléfono.</span>
      </div>
      <button class="btn btn-sm btn-retry" data-action="retry-sync" style="background:#f59e0b;color:white;padding:8px 14px;border-radius:8px">Sincronizar ahora</button>
    </div>` : ''}
  <div class="backup-grid">
    <section class="panel">
      <h2>Equipo de terreno y destinatario</h2>
      <form id="matias-config-form" style="margin-bottom:20px">
        <div class="form-grid">
          <label class="field">
            <span>Proyecto activo</span>
            <input type="text" value="${esc(projectDisplayName(s.project))}" readonly>
          </label>
          ${capatazField()}
          <label class="field">
            <span>Secretario Técnico (Receptor)</span>
            <input type="text" value="Matías Ramos" readonly>
          </label>
          <label class="field">
            <span>WhatsApp de Matías Ramos</span>
            <input type="tel" id="config-matias-phone" placeholder="Ej: +56912345678" value="${esc(savedPhone)}">
          </label>
        </div>
        <div class="form-footer">
          <button type="button" class="btn btn-primary" onclick="window.saveMatiasPhone()">Guardar contacto de Matías</button>
        </div>
      </form>
      <button class="btn btn-secondary" data-action="start-day">${icon('plus')}Iniciar nueva jornada</button>
    </section>

    <section class="panel">
      <h2>Sincronización Cloud (Supabase)</h2>
      <p>Todos los registros, controles y fotos se sincronizan directamente con la base de datos de faena en Supabase.</p>
      
      <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:8px;margin-bottom:18px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span>Estado del servidor:</span>
          <strong style="color:${isPending ? '#d97706' : '#16a34a'}">${isPending ? 'Pendiente de sincronizar' : 'Conectado a la nube'}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span>Jornadas en la nube:</span>
          <strong>${daysCount} jornadas</strong>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span>Archivos en Storage:</span>
          <strong>${mediaCount} fotografías/protocolos</strong>
        </div>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-secondary" data-action="retry-sync">Forzar sincronización</button>
        <button class="btn btn-danger-outline" data-action="logout">Cerrar sesión de capataz</button>
      </div>
      <p class="hint" style="margin-top:14px">Si no hay señal en el túnel, el sistema guarda en memoria local y sincroniza al recuperar cobertura.</p>
    </section>
  </div>`;
}

// Handler para guardar el teléfono de Matías Ramos desde la configuración
window.saveMatiasPhone = () => {
  const el = document.getElementById('config-matias-phone');
  if (el) {
    const val = el.value.trim();
    localStorage.setItem('clikium_phone_matias_ramos', val);
    toast('WhatsApp de Matías Ramos guardado correctamente.');
  }
};
