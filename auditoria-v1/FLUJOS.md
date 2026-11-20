# Trazas de funcionamiento extremo a extremo

**Estado:** pendiente de investigación y consolidación por el Director.

Cada flujo debe tener: commit, versión/estado activo, disparador UI o proceso, secuencia de componentes y llamadas, endpoints/guardas, SQL/transacción, medio Telegram si aplica, respuesta a UI, estado/caché, casos de fallo/reintentos, pruebas y huecos no verificados. Referenciar informes de `runs/`.

## Flujos que deberán documentarse
Arranque y configuración Web/Cloud; registro/login/OAuth; restablecer contraseña; planes/checkout/pagos; provisión de biblioteca; subida/transferencia/commit/recuperación; edición de nombre/tags/BPM/Key/portadas; Gallery/listado/búsqueda/filtros/sort/scroll; reproducción/prefetch/descarga; papelera/restore/purge; sesiones/errores/reanudación y jobs/worker. Añadir cualquier flujo relevante encontrado.

No presumir que un endpoint existe o está conectado porque figure en documentación histórica. 
