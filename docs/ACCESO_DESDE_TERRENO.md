# Usarlo desde la obra con tu plan de datos

Puedes dejar el PC de casa encendido y usar la aplicación desde tu iPhone con
datos móviles. Hace falta una conexión privada entre ambos: estar encendido no
vuelve accesible al PC desde Internet.

Para tu primer piloto, proponemos Tailscale con Serve. La app y los datos siguen
en tu PC. El acceso remoto se configura en tus dispositivos; no se activó ni
se publicó ningún servicio en esta entrega.

## Preparación

1. Instala Tailscale en Windows y en tu iPhone desde sus canales oficiales.
2. Entra con la misma cuenta para que tus dos dispositivos pertenezcan a tu red
   privada. Mantén Tailscale conectado en ambos.
3. Abre Clikium con `Iniciar_Windows.bat`, sin `--lan`.
4. Comprueba en el PC que `http://localhost:8765` funciona.

La documentación oficial contiene las instrucciones por plataforma:
[Instalar Tailscale](https://tailscale.com/docs/install).

## Crear la dirección privada

En otra terminal del PC ejecuta:

```sh
tailscale serve --bg http://127.0.0.1:8765
```

Si Tailscale te solicita habilitar HTTPS, completa su pantalla de configuración.
El resultado mostrará una dirección de tu equipo, con este formato:
`https://NOMBRE-DEL-PC.NOMBRE-DE-TU-RED.ts.net`.

Usa la URL exacta mostrada; el texto anterior es solo un ejemplo. Serve restringe
el acceso a tu red Tailscale y sus reglas de acceso. Configúralo para tus
propios dispositivos durante el piloto.

Para que el guardado también funcione si el proxy modifica la cabecera Host,
detén Clikium con Ctrl+C y reinícialo así, con tu URL real:

```sh
python server.py --public-origin https://TU-URL-REAL.ts.net
```

Conserva la terminal de Python abierta. Si usas el iniciador Windows, puedes
pasarle los mismos argumentos desde una terminal:

```sh
Iniciar_Windows.bat --public-origin https://TU-URL-REAL.ts.net
```

Abre esa dirección HTTPS en Safari con Tailscale conectado. No necesitas estar
en el Wi-Fi de tu casa.

## Comprobarlo antes de llevarlo a la obra

1. Apaga el Wi-Fi del iPhone y conserva los datos móviles y Tailscale activos.
2. Abre tu dirección privada y selecciona tu capataz.
3. Guarda una jornada, un avance de prueba y una foto.
4. Revisa el mismo registro desde el navegador del PC.

Durante el uso, el PC debe mantener Internet y el servidor Python iniciado.
Evita que se suspenda; apagar la pantalla es distinto de suspender el equipo.
Si reinicias Windows, vuelve a iniciar Clikium. Esta versión requiere conexión
para guardar y no tiene sincronización sin señal.

Para consultar la configuración privada:

```sh
tailscale serve status
```

Para dejar de servir esta dirección por HTTPS:

```sh
tailscale serve --https=443 off
```

Estas instrucciones usan **Serve**. **Funnel** publica servicios hacia Internet
abierto y no forma parte de este piloto.

La selección del capataz organiza las jornadas; no es un inicio de sesión
personal. Antes de compartir con varios capataces se deberán definir permisos
y autenticación. Una versión alojada permitiría después prescindir de tu PC.

Referencias oficiales:

- [Tailscale Serve](https://tailscale.com/docs/features/tailscale-serve)
- [Comandos de Serve](https://tailscale.com/docs/reference/tailscale-cli/serve)
