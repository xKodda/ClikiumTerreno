# Cómo funciona y cómo podrías alojarlo

## Esta entrega

El navegador carga HTML, CSS y JavaScript de `public/`. La interfaz llama a una
API local en `server.py`. El servidor usa la biblioteca estándar de Python y
SQLite; no necesita Node, npm ni paquetes adicionales.

Rutas:

| Ruta | Operación |
| --- | --- |
| `GET /api/catalogs` | Leer capataces registrados y sectores |
| `GET /api/state` | Leer jornadas, configuración, versión y metadatos de adjuntos |
| `PUT /api/state` | Guardar el estado validado con control de versión |
| `POST /api/media` | Guardar una fotografía o protocolo |
| `GET /api/media/{id}` | Abrir un adjunto |
| `GET /api/backup` | Descargar un respaldo consistente de toda la base |

El estado se almacena como JSON en la tabla `state`. La tabla `media` conserva
los adjuntos como BLOB. El guardado usa una transacción y una versión para impedir
que otra pestaña sobrescriba cambios silenciosamente. Ante un conflicto, la
interfaz pide recargar y volver a intentar.

El backend protege los controles existentes contra sobrescrituras, impide borrar
jornadas o actividades y bloquea cambios en los avances y recursos de una
jornada cerrada; permite anexar controles posteriores. Esto es validación del
prototipo, no un sistema de auditoría autenticada.

## Alojamiento que queda a tu cargo

No se creó alojamiento, dominio ni despliegue. Tampoco se modificó tu web actual.

Como la interfaz necesita estas API, subir solo `public/` a un alojamiento
estático no entrega un sistema funcional. Esta implementación necesita ejecutar
Python y conservar la carpeta `data` entre reinicios y actualizaciones.

Para un piloto remoto, una opción es un servidor que ejecute Python detrás de
un proxy HTTPS, con almacenamiento persistente. Antes de exponer esta versión a
Internet, debe incorporarse autenticación, autorización por proyecto y usuario,
y una política de respaldos. `--lan` está pensado para la prueba en una red local.

Para convertirlo en SaaS, primero elegiríamos la infraestructura. Se puede
conservar el frontend y sustituir estas API por un backend en Python o .NET,
según tu decisión, y trasladar el estado a tablas normalizadas. Esa evolución
necesitaría usuarios reales, roles, aislamiento entre empresas/proyectos,
registros de autoría y almacenamiento de archivos separado.

Ninguno de esos servicios se contrató ni configuró en esta entrega.

## Datos y trazabilidad

- Jornada: `id`, fecha, proyecto, nombre registrado, `userId`, inicio, cierre y observaciones. Las jornadas anteriores pueden conservarse sin `userId`.
- Actividad: actividad, proceso, sector, capa, PK, ejecución, unidad, cantidad,
  viajes/capacidad, descripción, fotos y lista de controles.
- Control: tipo, resultado, responsable escrito, observación, protocolo y hora
  de ingreso. La hora es la del registro, no una inspección retroactiva.
- Recursos: personal con HH y maquinaria con operación/stand-by.

Los controles son una lista de eventos. El último es el estado visible actual;
la interfaz permite consultar los anteriores. Las fotos conservan su relación
con la actividad y aparecen acompañadas por su descripción, PK y capa.

## Archivos

| Archivo | Función |
| --- | --- |
| `server.py` | API, validación, SQLite y servidor local |
| `public/index.html` | Estructura de la aplicación |
| `public/app.js` | Flujos y presentación de registros |
| `public/styles.css` | Estilos de escritorio, móvil e impresión |
| `Iniciar_Windows.bat` | Inicio local en Windows |
| `Iniciar_Red_Local.bat` | Inicio para dispositivos de la misma red |
| `verificar.py` | Pruebas con datos temporales |
| `data/terreno.sqlite3` | Se crea al usar el sistema; conserva datos y adjuntos |

## Versión 02: catálogo y acceso mediante proxy privado

`public/catalogos.json` es el catálogo de capataces y sectores. El frontend
selecciona un ID; el backend exige un ID existente y su nombre correspondiente
para una jornada nueva. Esto evita variantes escritas a mano. Registrar personas
no autentica su identidad: el acceso privado al dispositivo se controla por
Tailscale durante el piloto; los roles por proyecto siguen siendo una etapa SaaS.

Al arrancar, `migrate_state` normaliza las etiquetas de eje en sectores y
asignaciones, y reconoce al capataz guardado cuando aparece en el catálogo.
La migración incrementa la versión solo cuando cambian datos, y conserva los
controles, fechas, IDs de adjuntos y archivos existentes.

`--public-origin` permite indicar un único origen HTTPS de confianza para un
proxy privado. La API conserva el rechazo de orígenes ajenos. No usa comodines
ni acepta cualquier cabecera de proxy. Con Tailscale Serve, conserva el servidor
escuchando en `127.0.0.1` y registra la URL exacta que Serve te haya asignado.
Consulta `ACCESO_DESDE_TERRENO.md`.
