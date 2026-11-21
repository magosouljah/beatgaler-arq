# C07 · Inventario y evidencia

Rama `local/noche-c07`, base `500cd74dae82f0a6df1fd9bb577cb94a99d95e0c`. Las líneas del inventario corresponden a HEAD antes del cambio.

Inventario con `git grep -n -I -E 'LIBRARY_INDEX_|LIBRARY_INDEX'`, coincidencia exacta por identificador (`-w -E`) y búsqueda literal (`-F`) de los valores distintivos. Se revisaron fuente, pruebas de texto, fixtures, scripts, workflows, documentación y Desktop (`src/app`, `src-tauri`). No existe un árbol versionado `Desktop/` en esta rama. Se excluyeron por pathspec los nombres de archivos sensibles.

| Símbolo o literal | Archivo:línea | Usos y referencias | Decisión |
|---|---|---|---|
| `LIBRARY_INDEX_CAPTION` (Cloud) | `cloud-server/server-core.js:1377` | 0 usos de esta declaración. El Worker declara su propio símbolo. Desktop, Cloud Direct y pruebas reutilizan el valor como literal independiente (filas siguientes). | QUITAR declaración Cloud. |
| `LIBRARY_INDEX_BACKUP_POINTER_PREFIX` | `cloud-server/server-core.js:1378` | 0 usos del símbolo o de `BG_BACKUPS_V1=` fuera de la declaración. | QUITAR. |
| `LIBRARY_INDEX_COW_PREFIX` | `cloud-server/server-core.js:1379` | 0 usos del símbolo o de `BG_COW_V1=` fuera de la declaración. | QUITAR. |
| `LIBRARY_INDEX_BACKUP_LIMIT` | `cloud-server/server-core.js:1380` | 0 usos del binding o de `INDEX_BACKUP_COUNT`. Una mención histórica en `docs/plans/catalogo-postgresql/contract-map.json:2571` apunta a la antigua línea L2554. No se encontró lector de ese mapa en scripts, workflows o pruebas. | QUITAR declaración y CONSERVAR registro histórico. |
| `LIBRARY_INDEX_CAPTION_MAX` | `cloud-server/server-core.js:1381` | 0 usos, incluidas pruebas de texto. El número `1000` por sí solo no identifica el binding. | QUITAR. |
| `LIBRARY_INDEX_CAPTION` (Worker) | `src/features/cloud/webTransport.worker.ts:1392` | Tres usos en el mismo módulo, líneas 2399 y 2464 (validación de captions) y 2550 (envío). | CONSERVAR. Tiene usos y pertenece a webTransport. |
| Literal `BEATGALER_LIBRARY_INDEX_V1` (Cloud Direct) | `cloud-server/direct-transport-control.js:1803` | Comprueba el caption completo y el prefijo con salto de línea. Fixture del mismo valor en `cloud-server/tests/master-index-flood-wait.test.cjs:69,115`. | CONSERVAR. Direct excluido. |
| `INDEX_CAPTION` (Desktop) | `src-tauri/direct-transport/transport-helper.source.mjs:30`, `transport-helper.cjs:64097` | Validación y dos envíos en líneas 271,314,410 de la fuente y 64421,64466,64634 del bundle. `scripts/regression-direct-manager-only.test.mjs:64` comprueba en su mutación el envío que usa `INDEX_CAPTION`. | CONSERVAR. Desktop/Tauri excluido. |
| Literal `BEATGALER_LIBRARY_INDEX_V1` (pruebas y documentación) | `tests/component-dom/webTransportWorker.test.ts:73,119,362`, `tests/component-dom/webTransportWorkerScheduler.behavior.test.ts:56`, `tests/direct-persistent-data-plane.test.mjs:17`, `cloud-server/TELEGRAM-DIRECT.md:14`, `cloud-server/TELEGRAM-DIRECT-V5-BOTAPI.md:31`, `docs/plans/catalogo-postgresql/contract-map.json:1746` | Dobles, aserciones, datos de prueba y referencias a la mecánica Direct. Ninguna lee la declaración Cloud retirada. | CONSERVAR. |
| `WEB_LIBRARY_INDEX_PROCESS_BEGIN` y `_DONE` | `src/features/library/webLibrary.ts:276,289` | Literales de telemetría usados en `tests/e2e-web/phase2-task1-attribution.test.mjs:36–37` y `tests/e2e-web/stage1-real-multi-account.e2e.mjs:1183–1184,1243–1244,6063,6131`. | CONSERVAR. Tienen consumidores. |

| Comentario o afirmación | Archivo:línea | Comprobación en código o contexto | Decisión |
|---|---|---|---|
| Flag apagado por defecto, LEGACY monta pager/App o carga su chunk | `src/app/WebGalleryWorkspace.tsx:6–11` | El flag viene activo por defecto. El prop `legacy` recibe `LegacyRetired`; no se importa el chunk retirado. | QUITAR el bloque obsoleto. |
| T25: PostgreSQL es la autoridad y el flag forzado a false muestra un aviso | `src/app/WebGalleryWorkspace.tsx:12–13`, `src/features/library/catalog/catalogComposition.ts:15`, `cloud-server/server.js:146` | Vigente en la composición y el arranque actuales. | CONSERVAR. |
| Composición apagada hasta T16, LEGACY sigue intacto | `src/features/library/catalog/catalogComposition.ts:1–4` | El flag apagado sigue devolviendo `mode: legacy` sin petición. Desde T25 la Web monta el aviso. | QUITAR las afirmaciones obsoletas y mantener la descripción de `/context`. |
| Flag apagado por defecto | `src/features/library/catalog/catalogLibraryProvider.tsx:2` | `enabled` usa `isCatalogClientEnabled`, que devuelve true por omisión. | QUITAR el valor por defecto falso. |
| LEGACY conserva su árbol, prop recibe pager + App | `src/features/library/catalog/LibraryCompositionGate.tsx:2,23` | Gate renderiza un `ReactNode` que recibe de quien lo llama. En la Web contiene el aviso. | QUITAR la descripción anterior del contenido. |
| Composición apagada, componente limitado a fixtures hasta T16 | `src/features/library/catalog/CatalogVirtualGallery.tsx:3–4` | `CatalogAppShell` usa el componente en la Gallery de producto. | QUITAR el estado de T08. |
| T-Library INDEX como autoridad universal y transacción INDEX por renderer | `src/lib/libraryStateManager.ts:18–19` | El gestor delega en `platform.library`; el catálogo Web tiene su propio workspace. Los consumidores Desktop conservan las operaciones de su adaptador. | QUITAR la atribución global al INDEX, mantener la regla de serialización. |
| Flag apagado y árbol LEGACY de prueba | `tests/component-dom/catalogLibraryComposition.test.tsx:2–5,24–32,47` | Describe el fixture, que pasa un árbol simulado al gate. La composición de producto se comprueba en `webGalleryWorkspaceComposition.behavior.test.tsx`. | CONSERVAR. |
| «sigue apagada hasta T16» y nota similar | `scripts/catalog-suites.json:580,957` | Notas de T08/T13 dentro de un descriptor protegido. | CONSERVAR por zona. |
| `FLAG_OFF` de sesión, worker y montaje catalog nativo en Cloud | `cloud-server/catalog/session-guard.js:17,30`, `cloud-server/catalog-worker.js:28`, `cloud-server/server.js:93,145`, `cloud-server/catalog/api-manifest.json:887–889` | Interruptores de Cloud y cercado que todavía intervienen en el flujo. | CONSERVAR. Sesión y legacy-fence también están excluidos. |
| Flags de Vite en LAB, deploy y CI | `scripts/catalog-lab/lab.cjs:73,75`, `scripts/catalog-lab/v09-run.mjs:343–353`, `scripts/catalog-lab/README.md:21`, `scripts/aws/deploy.sh:18`, `.github/workflows/ci.yml:53` | Selección de escenarios LAB y configuración de compilación. La evidencia V09 del caso histórico no describe un fallback vigente. | CONSERVAR. |
| INDEX de Direct, prewarm y autoridad del pin en piezas excluidas | `cloud-server/direct-transport-control.js:1444`, `cloud-server/tests/postgres-live.integration.cjs:200`, `src/platform/webAdapter.ts:47`, `src/features/cloud/webGalerCloudTransport.ts:264,314,531,548–550,563–565` | Comentarios de rutinas antiguas o específicas del escenario; no establecen autoridad del catálogo Web. | CONSERVAR por zona, prueba PG prohibida y piezas C01 excluidas. |
| Estado histórico T07/T08 («apagada hasta T16») | `docs/plans/catalogo-postgresql/ESTADO.md:101`, `docs/plans/catalogo-postgresql/EVIDENCIA.md:390` | Registros fechados de evidencia previa a T25. | CONSERVAR. |

## Pruebas focalizadas

El arnés corrió los archivos individualmente en el orden de la tabla. `E:/777/tmp/c07-seleccion.json` contiene la selección temporal y `E:/777/tmp/c07-focal/summary.txt` la salida literal del arnés, con los comandos de cada caso en `summary.json` y las salidas en `logs/`. Los casos Vitest usan el envoltorio existente, que invoca `node node_modules/vitest/vitest.mjs run <archivo> --environment jsdom --reporter verbose`. El arnés registra cada invocación Vitest exitosa como un caso; la tabla muestra el recuento interno.

La red se limitó al loopback del arnés para IPC y HTTP con dobles. Los demás casos usaron `deny`. Sin PostgreSQL ni proveedores reales. Los descriptores versionados se conservaron.

Baseline del único FAIL, con las dos precargas de aislamiento y la precarga temporal `c07-base-core.cjs` que devuelve en memoria el blob de `git show HEAD:cloud-server/server-core.js`:

```powershell
$env:CATALOG_NET_POLICY='deny'
node --require ./cloud-server/tests/helpers/catalog-net-guard.cjs --require ./cloud-server/tests/helpers/no-dotenv.cjs --require E:/777/tmp/c07-base-core.cjs --test --test-reporter=tap scripts/regression-direct-manager-only.test.mjs
```

Resultado **FAIL** (exit 1, 0/1). El ancla de `scripts/regression-direct-manager-only.test.mjs:24` espera `indexPinAuthority` en la llamada de `cloud-server/server.js:317`; el argumento ya no estaba en HEAD. La verificación estática `scripts/regression-direct-manager-only.mjs` sí pasó. De `scripts/run-regressions.mjs` se ejecutaron solo las cinco aserciones aplicadas a `cloudServer` (PASS), sin el agregador completo.

| Caso | Tipo | Resultado |
|---|---|---|
| `t03-catalog-contract` | Mixto, contratos puros y fuente | PASS 8/8 |
| `access-runtime-consumers` | Mixto, HTTP local con dobles y fuente | PASS 10/10 |
| `plan-dev-switch-removed` | Fuente | PASS 2/2 |
| `direct-persistent-membership-runtime` | Mixto, dobles y fuente | PASS 1/1 script |
| `master-storage-recovery` | Mixto, dobles y fuente | PASS 1/1 script |
| `password-kdf` | Mixto, operaciones locales y fuente | PASS 1/1 script |
| `signup-activation-safety` | Mixto, dobles y marcadores de fuente | PASS 1/1 script |
| `regression-direct-manager-only` | Fuente (AST) | PASS 1/1 script |
| `regression-task-5-1-hardening` | Fuente | PASS 1/1 script |
| `regression-web-startup-bridge` | Fuente | PASS 1/1 script |
| `regression-direct-manager-only-tests` | Fuente y mutaciones en memoria | FAIL 0/1 |
| `v1-deploy-preflight` | Mixto, fixtures de configuración e inspección de fuente | PASS 5/5 |
| `activeuploadauthority-test-ts` | Comportamiento con dobles | PASS 6/6 |
| `t08-catalog-api` | Comportamiento con dobles | PASS 3/3 |
| `e70-catalog-direct-client` | Comportamiento con dobles | PASS 25/25 |
| `cataloge83-test-tsx` | Comportamiento DOM con dobles | PASS 4/4 |
| `catalogfirstblockcache-test-tsx` | Comportamiento con dobles | PASS 16/16 |
| `cataloghttpcontracts-behavior-test-ts` | Comportamiento con dobles | PASS 10/10 |
| `t16-catalog-composition` | Comportamiento DOM con dobles | PASS 4/4 |
| `t08-catalog-gallery` | Comportamiento DOM con dobles | PASS 6/6 |
| `libraryreload-test-tsx` | Comportamiento DOM con dobles | PASS 3/3 |
| `startupbootstrap-test-tsx` | Comportamiento DOM con dobles | PASS 7/7 |
| `webgallerydirectauthboundary-test-tsx` | Comportamiento DOM con dobles | PASS 3/3 |
| `webgalleryworkspacecomposition-behavior-test-tsx` | Comportamiento DOM con dobles | PASS 5/5 |
| `appstartupbootstrapextraction-test-ts` | Fuente | PASS 3/3 |
| `coreintegration-test-tsx` | Comportamiento con dobles | PASS 11/11 |
| `issue97playbackoptimization-test-ts` | Fuente | PASS 17/17 |
| `issue97resilience-test-ts` | Comportamiento con dobles | PASS 3/3 |
| `issue97runtimewebfollowup-test-ts` | Mixto, dobles y fuente | PASS 7/7 |

