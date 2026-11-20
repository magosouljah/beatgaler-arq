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
