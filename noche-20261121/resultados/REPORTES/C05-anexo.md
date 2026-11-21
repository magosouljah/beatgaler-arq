# C05 · Anexo de rutas y evidencia

Las referencias apuntan al worktree `local/noche-c05@f8e39bb`. Las rutas del cuadro comparten el prefijo `/catalog/v1`. El router está montado en `cloud-server/server-core.js:135` y serializa el cuerpo como JSON en `cloud-server/catalog/routes.js:64`.

| Estado | Escritura y exposición del servidor (lectura de código) | Consumidores del cliente |
| --- | --- | --- |
| `RELEASED` | `cloud-server/migrations/0026_catalog_core.sql:345,393` admite el estado y la transición. `cloud-server/catalog/routes.js:101` POST `/query-sets/:id/release` invoca `queries.releaseQuerySet`; `cloud-server/catalog/queries.js:633–647,653` actualiza, elimina leases y devuelve el DTO. GET `/query-sets/:id` en `routes.js:99` lee esa fila en `queries.js:624–631`. `setDto` copia `s.status` en `queries.js:519`. POST de creación reutiliza solo `BUILDING` y `READY` (`queries.js:550`). | `src/features/library/catalog/catalogCommandsApi.ts:98–101` devuelve el JSON. En el código productivo hay dos consumidores de preparación: el store de selección (`catalogInteractionStore.ts:110–145`) y el resolutor del reproductor (`catalogPlaybackSets.ts:11–22`, `catalogLibraryProvider.tsx:123`). El proveedor elimina la promesa fallida de la caché. No se encontraron llamadas productivas a `releaseQuerySet` en el cliente; el GET es el punto de consumo tras una liberación concurrente. |
| `BLOCKED` | `cloud-server/migrations/0029_catalog_commands.sql:21,53–57` permite el estado y su transición a `CANCELLED`. GET `/operations/:id` para bulk (`cloud-server/catalog/routes.js:143–147`) entrega la fila a través de `cloud-server/catalog/commands.js:479–485,662–676`. Si la fila ya está bloqueada, también puede salir por replay de POST (`routes.js:137–139`, `commands.js:525`). Cancelar la lleva a `CANCELLED` (`commands.js:684–693`); reanudar solo admite `CONFLICT` (`commands.js:696–707`). Los escritores de bulk revisados no asignan `BLOCKED` a esa fila: `worker.js:122–131,173–176` delega fallos a `operations.js:608–622`, que actualiza únicamente `catalog_jobs.state`. No se demostró una fila bulk bloqueada en un entorno real. | GET de bulk en `src/features/library/catalog/catalogCommandsApi.ts:113–119`. `catalogInteractionStore.ts:73,85,250–274,315–322` sondea para bulk y renombrado sin incluir `BLOCKED` como terminal. `useCatalogGalleryScope.ts:284,287,299` consume el resultado para avisos; las pruebas ejercitan el store y el resolutor, y el flujo hasta los avisos se rastreó en código. `catalogMutations.ts:172–175` expone `bulkOverSelection` sin llamadas productivas encontradas, y la cola de referencias para recuperaciones (`:125–126`) consulta solo transferencias. |

## Prueba focalizada

`catalogFakeApi` proporciona el puerto de lectura del store. `catalogFakeCommands` proporciona HTTP en memoria. El test sobreescribe el estado del GET de query-set tras un `BUILDING` inicial y simula una fila de operación `BLOCKED` después del primer lote, antes del siguiente GET. Se prueban los consumidores y la deserialización real del cliente. El reloj inyectado comprueba el límite sin espera real.

Se fijaron `TEMP`, `TMP` y `DIRECT_DIAGNOSTICS_DIR` en E: y se precargaron el guard de red del catálogo (loopback para el runner) y `no-dotenv.cjs`. El chequeo TypeScript usó `npm_config_offline=true` y cerrojo exclusivo. El status de Git emitió el aviso del ignore global inaccesible; una variante con `core.excludesFile=NUL` falló y se repitió con `git status --short --untracked-files=all`.

## Mutación en memoria

Se ejecutó `node --input-type=module` por stdin con `startVitest("test", ["tests/component-dom/catalogStatusContract.behavior.test.ts"], { run: true, environment: "jsdom" }, { plugins: [plugin] })`. El plugin Vite `enforce: "pre"` cambió temporalmente estos predicados en la transformación de sus módulos. Cada ancla debía aparecer exactamente una vez.

| Módulo | Cambio temporal | Fallo observado |
| --- | --- | --- |
| `catalogInteractionStore.ts` | `setState.status !== "READY"` → `setState.status !== "READY" && setState.status !== "RELEASED"` | La promesa de selección se resolvió en vez de rechazar. |
| `catalogPlaybackSets.ts` | `state.status !== "READY"` → `state.status !== "READY" && state.status !== "RELEASED"` | La promesa del reproductor devolvió el conjunto en vez de rechazar. |
| `catalogInteractionStore.ts` | `TERMINAL.has(op.status)` → `TERMINAL.has(op.status) \|\| op.status === "BLOCKED"` | Bulk y renombrado hicieron 2 GET en vez de los 3 esperados. |

El proceso terminó con código 1 y cuatro fallos de aserción. La repetición con el runner normal terminó con código 0 y cuatro pruebas verdes. La mutación nunca se escribió al worktree.
