# Trazas de funcionamiento extremo a extremo

**Estado:** pendiente de investigación y consolidación por el Director.

Cada flujo debe tener: commit, versión/estado activo, disparador UI o proceso, secuencia de componentes y llamadas, endpoints/guardas, SQL/transacción, medio Telegram si aplica, respuesta a UI, estado/caché, casos de fallo/reintentos, pruebas y huecos no verificados. Referenciar informes de `runs/`.

## Flujos que deberán documentarse
Arranque y configuración Web/Cloud; registro/login/OAuth; restablecer contraseña; planes/checkout/pagos; provisión de biblioteca; subida/transferencia/commit/recuperación; edición de nombre/tags/BPM/Key/portadas; Gallery/listado/búsqueda/filtros/sort/scroll; reproducción/prefetch/descarga; papelera/restore/purge; sesiones/errores/reanudación y jobs/worker. Añadir cualquier flujo relevante encontrado.

No presumir que un endpoint existe o está conectado porque figure en documentación histórica. 

## F01 — Arranque Web a composición de Gallery (C2 parcial, estático @ 4e66638051effe888e66a885010065d98fc7df17)
`main.tsx` → `WebExperience.tsx` → `WebGalleryEntry.tsx` / auth gate → `WebGalleryWorkspace.tsx` → `useLibraryComposition` → `chooseLibraryComposition` → (flag off: `WebLegacyWorkspace`; flag on: API `/catalog/v1/context` y posible provisión) → `LibraryCompositionGate` → Gallery catálogo o bloqueo visible. **Comprobado por el Director:** ramificación de flag, lazy legacy y render de gate en código. **Pendiente:** confirmar Cloud handlers/SQL, contratos de sesión/provisión, rutas de error y tests escritos; el informe [AUD-001](runs/20261120T0330-investigador-AUD-001.md) es checkpoint, no flujo C3.

## F02 — Provisión de biblioteca y membresía (C2 parcial estático @ 4e66638051effe888e66a885010065d98fc7df17)
Web `catalogApi.resolveContext` → GET `/catalog/v1/context` → `authority.resolveContext` → PostgreSQL. Solo `LIBRARY_NOT_PROVISIONED` → POST `/catalog/v1/library/provision` → `authority.provisionLibrary` (lock + SQL INSERT + COMMIT) → `transportProvisioner.ensureForUser` (asignación/lock + gateway Telegram + marcar READY) → respuesta. Si el gateway falla **después del COMMIT**, POST puede fallar dejando biblioteca SQL creada; siguiente GET devuelve 200 y no dispara POST, aunque otras rutas (`operations` IMPORT/REPLACE y `direct/session`) sí vuelven a llamar `ensureForUser`. No está demostrado que UI pueda acceder a ellas en todos los estados. Fuente: [05:25](runs/20261120T0525-investigador-AUD-001.md), `authority.js:168-245`, `routes.js:71-79,130-135,179-184`, `catalogApi.ts:194-216`, `native-transport-provisioning.js:19-59`. Pendientes: middleware, assignment store, gateway y tests escritos; no C3.

### F02 — contraste adicional 07:00 (estático @ 4e66638051effe888e66a885010065d98fc7df17)
En `routes.js:48-69` la factory exige callback de autenticación por handler y establece `no-store`; sin autoridad/queries responde 503. En `native-transport-provisioning.js:19-59` un estado pending puede pasar a ready tras gateway con prueba positiva; fallo permanece pending y produce error. `routes.js:130-135,179-184` ofrece reintento condicionado desde IMPORT/REPLACE o direct/session. **No se ha seguido aún el montaje real del router**, ni la alcanzabilidad UI de dichas rutas en todos los estados. Evidencia [checkpoint 06:30](runs/20261120T0630-investigador-AUD-001.md) y contraste directo del Director; F02 sigue C2 parcial, no C3.

### F02 — montaje Express comprobado (Director 08:00; estático @ 4e66638051effe888e66a885010065d98fc7df17)
Bootstrap `server.js:304-313` → carga `server-core.js` → middleware CORS y parsers `server-core.js:115-136` → `app.use(createCatalogRouter(...))` en `:138` → wrapper `routes.js:48-69` autentica bearer vía `authenticatedUser` (`server-core.js:1114-1121`) → contexto o provisión `routes.js:71-79`. El montaje elimina el anterior hueco NO_VERIFICABLE, pero faltan sesión/token, stores, gateway y comprobación de caminos de recuperación. F02 sigue C2 parcial. Fuente [07:32](runs/20261120T0732-investigador-AUD-001.md) y contraste independiente; sin ejecución.
