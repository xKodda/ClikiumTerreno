import { supabase } from './supabase.js';

export async function loadState() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay usuario autenticado.");

  const results = await Promise.all([
    supabase.from('foremen').select('*'),
    supabase.from('sectors').select('*').order('sort_order'),
    supabase.from('catalog_workers').select('*'),
    supabase.from('catalog_machines').select('*'),
    supabase.from('days').select('*').order('date', { ascending: false }),
    supabase.from('activities').select('*'),
    supabase.from('controls').select('*').order('at', { ascending: true }),
    supabase.from('crew_entries').select('*'),
    supabase.from('machine_entries').select('*'),
    supabase.from('activity_photos').select('*').order('position'),
    supabase.from('media').select('*'),
    supabase.from('project_members').select('*').eq('user_id', user.id)
  ]);

  const errors = results.map(r => r.error).filter(Boolean);
  if (errors.length > 0) {
    console.error("Supabase errors:", errors);
    throw new Error("Error cargando base de datos: " + errors[0].message);
  }

  const [
    { data: foremen }, { data: sectors }, { data: workers }, { data: machines },
    { data: days }, { data: activities }, { data: controls },
    { data: crew }, { data: machineEntries }, { data: photos }, { data: media },
    { data: members }
  ] = results;

  const member = members?.[0];
  const projectId = member?.project_id || 'tunel_lo_ruiz';
  let myRole = member?.role || 'admin';
  
  // Asociar capataz al usuario actual
  let myForemanId = 'christofer_godoy';
  let myForemanName = 'Christofer Godoy';

  const userForeman = (foremen || []).find(f => f.user_id === user.id);
  if (userForeman) {
    myForemanId = userForeman.id;
    myForemanName = userForeman.name;
  }

  // Para esta prueba concentramos el catálogo exclusivamente en Christofer Godoy
  const activeForemen = (foremen || []).filter(f => f.id === 'christofer_godoy');
  const catalogCapataces = activeForemen.length > 0 
    ? activeForemen.map(f => ({ id: f.id, nombre: f.name }))
    : [{ id: 'christofer_godoy', nombre: 'Christofer Godoy' }];

  // Maquinaria oficial de obra para la prueba
  const defaultMachines = [
    { name: 'Excavadora CAT 323 · I-36', operator: 'César Luncumilla' },
    { name: 'Bulldozer CAT D8T · I-86', operator: 'Óscar Quiroz' },
    { name: 'Camión Tolva · I-154', operator: 'Donosor Díaz' },
    { name: 'Rodillo 14T · I-59', operator: 'Daniel Contreras' }
  ];

  const dbMachines = (machines && machines.length > 0) 
    ? machines.map(m => ({ name: m.name, operator: m.operator }))
    : defaultMachines;

  const catalog = {
    capataces: catalogCapataces,
    gruposSectores: Array.from(new Set((sectors || []).map(s => s.group_name))).map(g => ({
      grupo: g,
      sectores: (sectors || []).filter(s => s.group_name === g).map(s => s.name)
    })),
    trabajadores: (workers || []).map(w => ({ name: w.name, role: w.role })),
    maquinarias: dbMachines.length > 0 ? dbMachines : defaultMachines
  };

  const formattedDays = (days || []).map(d => ({
    id: d.id,
    date: d.date,
    project: d.project_id,
    user: d.foreman_name || myForemanName,
    userId: d.foreman_id || myForemanId,
    startedAt: d.started_at,
    closedAt: d.closed_at,
    notes: d.notes,
    isDemo: d.is_demo,
    activities: (activities || []).filter(a => a.day_id === d.id).map(a => ({
      id: a.id, activity: a.activity, process: a.process, sector: a.sector, stage: a.stage,
      unit: a.unit, requiredControls: a.required_controls, pkStart: a.pk_start, pkEnd: a.pk_end,
      layer: a.layer, layerType: a.layer_type, quantity: a.quantity, mode: a.mode,
      trips: a.trips, capacity: a.capacity, description: a.description, notes: a.notes,
      isAnnulled: a.is_annulled, annulReason: a.annul_reason, annulledAt: a.annulled_at, createdAt: a.created_at,
      controls: (controls || []).filter(c => c.activity_id === a.id).map(c => ({
        id: c.id, type: c.type, status: c.status, author: c.author, note: c.note, at: c.at, attachmentId: c.attachment_id
      })),
      photoIds: (photos || []).filter(p => p.activity_id === a.id).map(p => p.media_id)
    })),
    crew: (crew || []).filter(c => c.day_id === d.id).map(c => ({
      id: c.id, name: c.name, role: c.role, assignment: c.assignment, hours: c.hours, extra: c.extra
    })),
    machines: (machineEntries || []).filter(m => m.day_id === d.id).map(m => ({
      id: m.id, name: m.name, operator: m.operator, assignment: m.assignment, hours: m.hours, standby: m.standby
    }))
  }));

  return {
    version: Date.now(),
    catalog,
    media: (media || []).map(m => ({ 
      id: m.id, 
      name: m.name, 
      mime: m.mime, 
      storagePath: m.storage_path, 
      createdAt: m.created_at 
    })),
    state: {
      settings: {
        project: projectId,
        user: myForemanName,
        userId: myForemanId,
        role: myRole
      },
      days: formattedDays
    }
  };
}

export function getMediaUrl(mediaId) {
  if (!mediaId) return '';
  const projectId = 'tunel_lo_ruiz';
  const path = `${projectId}/${mediaId}`;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data?.publicUrl || '';
}

export async function uploadMedia(file) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado para subir archivo.");

  const projectId = 'tunel_lo_ruiz';
  const id = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)).replace(/-/g, '');
  const storagePath = `${projectId}/${id}`;

  const mime = file.type || 'image/jpeg';
  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(storagePath, file, {
      contentType: mime,
      upsert: true
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    throw new Error("Error subiendo foto al almacenamiento: " + uploadError.message);
  }

  const { error: dbError } = await supabase.from('media').insert({
    id,
    project_id: projectId,
    name: file.name || 'foto.jpg',
    mime,
    size_bytes: file.size,
    storage_path: storagePath,
    created_by: user.id
  });

  if (dbError) {
    console.error("Media DB error:", dbError);
    throw new Error("Error registrando multimedia: " + dbError.message);
  }

  return id;
}

export async function diffAndSave(oldState, newState) {
  for (const newDay of newState.days) {
    const oldDay = oldState.days.find(d => d.id === newDay.id);
    if (JSON.stringify(oldDay) === JSON.stringify(newDay)) continue;

    // Guardar Jornada
    const { error: dayErr } = await supabase.from('days').upsert({
      id: newDay.id,
      project_id: newDay.project,
      foreman_name: newDay.user,
      foreman_id: newDay.userId || null,
      date: newDay.date,
      started_at: newDay.startedAt,
      closed_at: newDay.closedAt,
      notes: newDay.notes || '',
      is_demo: newDay.isDemo || false
    });
    if (dayErr) throw new Error("Error jornada: " + dayErr.message);

    // Guardar Actividades
    for (const act of newDay.activities) {
      const { error: actErr } = await supabase.from('activities').upsert({
        id: act.id,
        day_id: newDay.id,
        activity: act.activity,
        process: act.process,
        sector: act.sector,
        stage: act.stage,
        unit: act.unit,
        required_controls: act.requiredControls,
        pk_start: act.pkStart || null,
        pk_end: act.pkEnd || null,
        layer: act.layer || 0,
        layer_type: act.layerType || null,
        quantity: act.quantity,
        mode: act.mode,
        trips: act.trips || 0,
        capacity: act.capacity || 22,
        description: act.description || '',
        notes: act.notes || '',
        is_annulled: act.isAnnulled || false,
        annul_reason: act.annulReason || '',
        annulled_at: act.annulledAt || null
      });
      if (actErr) throw new Error("Error actividad: " + actErr.message);

      // Guardar Fotos vinculadas
      if (act.photoIds && act.photoIds.length > 0) {
        await supabase.from('activity_photos').delete().eq('activity_id', act.id);
        const { error: pErr } = await supabase.from('activity_photos').insert(
          act.photoIds.map((mediaId, idx) => ({
            activity_id: act.id,
            media_id: mediaId,
            position: idx + 1
          }))
        );
        if (pErr) console.warn("Error guardando relación foto:", pErr.message);
      }

      // Guardar Controles
      if (act.controls && act.controls.length > 0) {
        const { error: cErr } = await supabase.from('controls').upsert(
          act.controls.map(ctrl => ({
            id: ctrl.id,
            activity_id: act.id,
            type: ctrl.type,
            status: ctrl.status,
            author: ctrl.author,
            note: ctrl.note || '',
            at: ctrl.at,
            attachment_id: ctrl.attachmentId || null
          }))
        );
        if (cErr) throw new Error("Error control: " + cErr.message);
      }
    }

    // Guardar Personal (limpiar y reinsertar)
    await supabase.from('crew_entries').delete().eq('day_id', newDay.id);
    if (newDay.crew && newDay.crew.length > 0) {
      const { error: crErr } = await supabase.from('crew_entries').insert(
        newDay.crew.map(c => ({
          id: c.id, day_id: newDay.id, name: c.name, role: c.role,
          assignment: c.assignment || '', hours: c.hours, extra: c.extra || 0
        }))
      );
      if (crErr) throw new Error("Error personal: " + crErr.message);
    }

    // Guardar Maquinaria
    await supabase.from('machine_entries').delete().eq('day_id', newDay.id);
    if (newDay.machines && newDay.machines.length > 0) {
      const { error: mErr } = await supabase.from('machine_entries').insert(
        newDay.machines.map(m => ({
          id: m.id, day_id: newDay.id, name: m.name, operator: m.operator || '',
          assignment: m.assignment || '', hours: m.hours, standby: m.standby || 0
        }))
      );
      if (mErr) throw new Error("Error máquina: " + mErr.message);
    }
  }
}
