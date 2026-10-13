# Clikium Terreno · versión local 02

Sistema para registrar jornadas, avances y controles de terreno. Preparado para
Túnel Lo Ruiz, Eje 48 y OA6, con proyecto y capataz configurables.

## Inicio rápido en Windows

1. Extrae el ZIP completo; no ejecutes el sistema dentro del archivo comprimido.
2. Necesitas Python 3.11 o superior. No hay paquetes externos que instalar.
3. Haz doble clic en `Iniciar_Windows.bat`.
4. Cuando la consola indique que está listo, abre `http://localhost:8765` en tu navegador.
5. Pulsa **Iniciar jornada**, completa fecha, proyecto y selecciona tu capataz, y guarda.

También puedes iniciarlo en una terminal desde esta carpeta:

```sh
python server.py
```

En equipos donde Python se llama `python3`, usa `python3 server.py`.
La consola debe permanecer abierta. Para detenerlo, pulsa Ctrl+C en ella.
Abrir `public/index.html` directamente no funciona: la app necesita su servidor.

## Probarlo desde tu teléfono

1. El teléfono y tu computador deben estar conectados al mismo Wi-Fi.
2. Inicia `Iniciar_Red_Local.bat`, o ejecuta `python server.py --lan`.
3. En Windows, ejecuta `ipconfig` y busca la dirección IPv4 de tu conexión Wi-Fi.
4. Abre `http://IP_DEL_PC:8765` en el teléfono. Ejemplo: `http://192.168.1.20:8765`.
5. Si Windows consulta por el firewall, permite el acceso en tu red privada.

El PC debe permanecer encendido. Esta versión cuenta con almacenamiento local
y soporte de borrador sin conexión. El acceso local no tiene cuentas ni contraseña.
Para detalles técnicos, revisa [docs/ARQUITECTURA.md](file:///c:/Users/cris/Desktop/Clikium_Terreno/docs/ARQUITECTURA.md) primero.

## Qué puedes hacer

- Crear explícitamente una jornada por fecha, proyecto y capataz.
- Registrar actividad, proceso, sector, capa y PK inicial/final.
- Dejar la ejecución **En curso** o **Terminada**, independiente del control.
- Medir en m³, metros lineales, tubos, capas o porcentaje.
- Calcular volumen por viajes: por ejemplo, 5 viajes × 22 m³ = 110 m³.
- Adjuntar fotos JPG, PNG o WebP de hasta 12 MB por archivo.
- Registrar controles de laboratorio, topografía o generales como **Control
  pendiente**, **Rechazado** o **Aprobado**, con responsable y foto/PDF de protocolo.
- Conservar cada evento de control con fecha y hora de ingreso, sin sobrescribir
  los anteriores. Los colores muestran el último evento registrado.
- Registrar personal, asignación, horas normales y extras; sumar HH.
- Registrar maquinaria, operador, horas de operación y stand-by.
- Consultar jornadas anteriores y una monografía por sector, PK, proceso y capa.
- Copiar un resumen para WhatsApp. Las fotos se envían por separado.
- Abrir **Informe diario** y usar **Imprimir / guardar PDF** del navegador.

Las fotos aparecen en el informe; los PDF de protocolos aparecen como referencias
para abrirlos y deben adjuntarse por separado al compartirlo.

La jornada cerrada conserva sus avances y recursos. Después del cierre puedes
agregar controles nuevos. Se admite una jornada por fecha, proyecto y capataz.

## Recorrer el ejemplo

Desde la pantalla inicial pulsa **Ver una jornada de ejemplo**. Incluye tres
actividades, OA6 capa 7, un cálculo de 110 m³ y recursos demostrativos.
El ejemplo queda marcado como tal y no representa producción real.
Para iniciar tu jornada, entra en la configuración (engranaje) y pulsa
**Iniciar nueva jornada**. El ZIP se entrega sin registros reales ni de prueba.

## Dónde se guardan tus datos

El primer inicio crea `data/terreno.sqlite3`. Allí se guardan jornadas, controles,
fotografías y protocolos. El navegador no es el almacenamiento principal.

Para mover el sistema a otro PC, detén el servidor y copia la carpeta completa,
incluida `data`. No elimines ni reemplaces esa carpeta al actualizar el código.

En **Respaldo**, pulsa **Descargar respaldo**. El ZIP contiene la base de datos
completa, incluidos los adjuntos. Para restaurarlo:

1. Detén el servidor.
2. Conserva una copia de la base actual.
3. Extrae `terreno.sqlite3` del respaldo y reemplaza `data/terreno.sqlite3`.
4. Inicia el sistema de nuevo.

## Alcance de esta entrega

Esta es una primera versión funcional para probar el flujo con un equipo. El
capataz se selecciona de un catálogo registrado; todavía no es una sesión autenticada.
El proyecto incluye su código; no se publicó ni se modificó clikium.cl.

El volumen de la pantalla suma actividades: si registras descarga y extendido
del mismo material, no representa un volumen neto. La monografía muestra cada
registro, no calcula porcentajes acumulados de obra ni una liberación oficial.
El estado de control corresponde al último evento ingresado.

No incluye aún carcheck con entrada/salida individual por camión, sincronización
sin conexión, cuentas de varios capataces ni panel comercial. Estos módulos son
una siguiente etapa y no están simulados como si ya funcionaran.

## Verificación del código

```sh
python verificar.py
```

Las pruebas de integración usan una base temporal y no modifican tus registros reales.

## Capataces y ejes registrados

El selector incluye Christofer Godoy, Julio Gutiérrez, Eric Teatino, Cristian Puebla
y Ricardo Ávalos. Ya no se escribe libremente el nombre al iniciar una jornada
ni al elegir al capataz en la configuración. La API también valida el ID y el
nombre del catálogo.

El catálogo está en `public/catalogos.json`. Para registrar otro capataz, agrega
un objeto con `id` único y `nombre` a `capataces`; después vuelve a cargar la app.
No cambies los IDs existentes: las jornadas nuevas conservan ese identificador.
Los nombres históricos se conservan como fueron registrados.

Los ejes se escriben como **Eje 48**, sin separar sus dígitos. Puedes registrar
más sectores en `sectores` del mismo catálogo. Al iniciar esta versión se
normalizan los nombres de ejes antiguos en sector y asignación de recursos;
no se cambian controles, fechas, fotografías ni protocolos.
Las referencias a muros, como **Muros TEM 9-10**, mantienen su guion.

## Actualizar desde la versión anterior

1. Descarga un respaldo y detén el servidor.
2. Extrae el paquete nuevo en otra carpeta.
3. Copia allí tu carpeta `data` anterior completa.
4. Inicia la nueva versión y vuelve a cargar el navegador.

## Usarlo desde la obra con datos móviles

Sí se puede dejar el PC encendido y acceder desde tu teléfono o tablet con otra conexión.
La opción de piloto está descrita en [docs/ACCESO_DESDE_TERRENO.md](file:///c:/Users/cris/Desktop/Clikium_Terreno/docs/ACCESO_DESDE_TERRENO.md): usa una conexión
privada con Tailscale. El acceso remoto aún debes configurarlo en tus dispositivos.
