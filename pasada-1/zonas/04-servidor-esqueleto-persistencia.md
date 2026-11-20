# Zona 04 — Servidor Cloud: esqueleto, arranque y plano de control/persistencia

**Origen:** informe de sub-agente de solo lectura, pasada 1. **Commit:** `5cb6ccc`. **Fecha:** 2026-11-11.
**Marcas:** FIRME = leído en código; PROVISIONAL = inferido. Nada se ejecutó; no se leyeron `.env` ni JSON de estado ignorados. Rutas relativas a `E:\777\app\BeatGaler\cloud-server\`.

## Arranque y procesos

- **FIRME — un proceso HTTP, Express 5** (`express ^5.2.1`, `pg 8.23.0`, `telegram` (gramjs), `@mtcute/web`, `multer`, `@polar-sh/sdk`). `package.json` no tiene script `start`; el arranque es `node server.js` (comentario en `server-core.js:12`).
- **FIRME — `server.js` (306 líneas) es el composition root**, en este orden:
  1. Parchea `express.application` (`:65-67`).
  2. Abre pool y aplica migraciones (`:75`, `postgres-bootstrap.js`).
  3. `prepareControlPlaneCutover` decide la autoridad `json|postgres` (`:89`).
  4. Configura los singletons de catálogo, billing y access (`:92-159`).
  5. Instala unas 17 capas más (`:197-263`).
  6. Hace `require("./server-core")` (`:270`), que crea `app`, registra rutas y llama `app.listen` como efecto de carga (`server-core.js:2932`, con rutas registradas después del listen).
  7. Arranca los timers.
- **FIRME — workers dentro del mismo proceso** (timers): `auth-delivery-worker.js`, el notice worker de `staged-email-change.js`, `billing-lifecycle-runtime` y `billing-reconciliation-runtime` (`server.js:301-304`).
- **FIRME — único proceso aparte: `catalog-worker.js`** (56 líneas, `require.main`, apagado por defecto con `BEATGALER_CATALOG_WORKER_ENABLED`). Reutiliza `prepareControlPlaneCutover`, así que carga todos los usuarios, descifra tokens OAuth/MFA e instala los parches de `fs` y Express solo para saber que la autoridad es `postgres`.
- **FIRME — `garbage-reconciliation-worker.js` no es un proceso**: es una librería que solo importan tests.
- **FIRME — `setup-master-account.js`** es un CLI interactivo suelto (login QR de la cuenta MASTER), sin importadores.

## Mapa de server-core.js e inventario de rutas

**Mapa por bloques (FIRME, rangos aproximados):**

| Líneas | Contenido |
| --- | --- |
| 1-155 | requires, `bot` como Proxy que rechaza todo (`:70`), middleware de request-id/métricas, CORS, montaje de webhook y router de catálogo (`:129-133`), multer, constantes OAuth |
| 157-715 | topics de Telegram por beat, tombstones, migración INDEX→topics, lectura de archivos por Bot API (casi todo muerto) |
| 719-796 | **estado global**: 11 `Map` (`pendingConnections`, `linkedAccounts`, `beatGalerUsers`, `beatGalerUsersById`, `authSessions`, `uploadedFiles`, `beatTopics`, `pendingTopicDeletes`, `messageRedirects`, `cloudEventClients`, más `eventTickets` en `:1092`) y SSE `/events` |
| 800-1300 | identidad: usernames, TOTP, OAuth Google/X, `loadAuthData`/`saveAuthData` (`:1027-1056`), sesiones, `authenticatedUser`/`authenticatedInstallation` (`:1108-1140`), binding instalación↔vault, `loadPersistentData`/`savePersistentData` (`:1265-1294`) |
| 1313-1506 | `/auth/health`, fetch de imágenes con guardas anti-SSRF, planes y billing |
| 1508-1822 | 14 rutas `/auth/*` con la lógica dentro |
| 1824-1918 | `/telegram/connect/*` |
| 1929-2433 | 18 rutas `/transport/*` |
| 2436-2756 | helpers del INDEX legacy (copy-on-write, backups) |
| 2758-3251 | rutas legacy de biblioteca/medios |
| 3257-3272 | error handler |

**Inventario (FIRME). `server-core.js` registra 60 rutas (grep); el reparto de abajo es clasificación manual y suma 58:**

- **Salud/operaciones:** `GET /healthz`, `GET /readyz` → `runtime-operability.js:94-97`; `GET /auth/health`, `GET /transport/status` → inline.
- **Cuentas (inline en core):** `POST /auth/register|login|session|email/change|password/change|mfa/setup|mfa/enable|mfa/disable|oauth/start|oauth/poll|oauth/disconnect|logout`, `GET /auth/oauth/:provider/callback`. `POST /auth/account` → `access-consumer-handlers`.
- **Cuentas (fuera de core, inyectadas por parche):** 10 en `account-lifecycle.js:827-846` (verificación de email, reset, reauth, export, delete…), 3 `/auth/signup/*` (`pending-signup-boundary.js:295`), 3 `/auth/email/change/*` (`staged-email-change-routes.js:57`), 3 `/auth/sessions*` (`session-security.js:625`).
- **Pagos:** `GET /plans/catalog`, `GET /plans/me`, `POST|GET /billing/checkout…`, `GET /billing/portal/availability`, `POST /billing/portal` → fábricas `billing-*-route`; `POST /webhooks/polar` → `billing-webhook-route.js:42`.
- **Transporte directo:** `/transport/session/start|activate|heartbeat|stop`, `/operation/begin|end|renew` → `direct-transport-control`; `/transport/capability/authorize` → `direct-capability-boundary.js:713`; `/transport/routing/reconcile` → `startup-routing-index.js:281`; `/transport/index/ensure` → `atomic-library-index.js:61`.
- **Biblioteca legacy/INDEX:** `/transport/index/bootstrap-state|commit|publish`, `/quota/reserve|renew|cancel`, `/project/authorize|upload`, `/trash/purge`, `/topic/ensure`, `/upload/confirm`, `/beats/delete-topic(s-batch)` → `library-index-publication`, `vault-index-pointer-store` y lógica inline; `/events/ticket`, `/events` (SSE) inline; `/image/fetch` inline.
- **Catálogo:** 45 rutas `/catalog/v1/*` en `catalog/routes.js`, montadas en una línea (`server-core.js:133`).
- **Reparto en core:**
  - unas 26 con lógica de negocio inline;
  - unas 12 finas (autentican, validan forma y hacen una llamada);
  - 8 delegadas a una fábrica de handlers;
  - 12 muertas o stub: 5 devuelven 410 en su cuerpo, 3 son sustituidas por 410 en `legacy-media-upload-disable.js`, 1 es no-op y 3 dependen del `bot` deshabilitado (`/metadata/artwork`, `/metadata/upsert`, `/library/artwork`).
- **FIRME — código muerto en core:** 11 funciones aparecen solo en su definición (`telegramJsonMethod`, `migrateCurrentLibraryToTopics`, `queueRemovedTrashTopics`, `mergeDeletedBeatTombstones`, `applyDeletedBeatTombstones`, `rebuildTopicMap`, `recoverLibraryIndexFromBackups`, `mergeCopyOnWriteGarbage`, `verifyTelegramFileOwnershipFromIndex`, `sendProjectPart`, `sendCloudPart`).
- **PROVISIONAL — volumen muerto:** unas 1.200-1.400 de las 3.272 líneas (falta trazar el grafo completo de llamadas).

## Persistencia: quién es autoridad de qué (hoy / tras cutover)

**Hay dos migraciones a PostgreSQL distintas que comparten pool, runner y ledger (FIRME):**

- **Control-plane** (`migrations/0001-0025`): cuentas, sesiones, OAuth/MFA cifrados, entitlements, vaults, billing, capacidades directas, cuota, puntero de INDEX. Se conmuta con `BEATGALER_CONTROL_PLANE_AUTHORITY` (por defecto `json`, `control-plane-authority.js:8`) más un marcador `control_plane_cutovers.state=READY` con SHA del snapshot.
- **Catálogo nativo** (`0026-0040`): metadatos de beats. Exige que el control-plane ya sea `postgres` (`server.js:92`); con autoridad `json` y catálogo activado el arranque se niega (`control-plane-cutover-runtime.js:22`).

**`control-plane-json-compat.js` es un adapter por monkey-patch global, no una capa de datos (FIRME):**

- `server-core` nunca dejó de persistir en `accounts-data.json` y `cloud-data.json` con `fs.writeFileSync` + `renameSync`.
- En modo `postgres`, este archivo reemplaza `fs.existsSync/readFileSync/writeFileSync/renameSync` del módulo `fs` del proceso para esas dos rutas: los archivos pasan a ser virtuales en memoria.
- El `rename` del `.tmp` dispara `runtime.saveAuthSnapshot` o `savePersistentSnapshot`.
- Además parchea `express.response.send`: toda respuesta espera `runtime.flush()` antes de salir (`:93-118`). Único bypass: `server-core.js:1997`.
- La "autoridad PostgreSQL" del control-plane es por tanto un espejo write-behind de los `Map` de `server-core`, cargados una sola vez al arrancar (`postgres-control-plane-runtime.js:271-277`).

| Dato | Autoridad con `json` | Con `postgres` |
| --- | --- | --- |
| Usuarios, sesiones, OAuth, MFA | `accounts-data.json` (Maps de core) | Tablas `users/auth_sessions/provider_identities/mfa_factors`, escritas por diff de snapshots (`postgres-auth-multiprocess-compat.js`); en ejecución mandan los Maps |
| `linkedAccounts`, `beatTopics`, `uploadedFiles`, `pendingTopicDeletes`, `messageRedirects` | `cloud-data.json` | **Una fila JSONB** `runtime_compat_state`, reemplazada entera en cada guardado (`postgres-control-plane-runtime.js:246-254`) |
| Planes/entitlements, pagos | `planState` dentro del usuario (`plans.js`); billing no se configura | Tablas `entitlements` y `billing_*` (`server.js:121-160`) |
| Vault (chat de Telegram por usuario) | `user.storageChatId` en JSON | Tabla `vaults` (espejo del mismo campo) |
| Pool de bots, asignaciones, registro de vaults | `transport-pool-state.json` (con lockfile), `vault-registry.json`, `transport-bots.local.json` | Igual en disco, más tablas de asignación persistente |
| Estado lateral: sesiones revocadas, tombstones de cuenta, bindings sesión↔instalación | `session-security-state.json`, `account-lifecycle-state.json`, `authz-session-bindings.json` | **Siguen en disco local** (el adapter solo virtualiza dos archivos), con borrados parciales en PG |
| Biblioteca legacy | Documento INDEX fijado en el chat de Telegram | Igual; PG guarda solo puntero y cuota (`server-core.js:1985` lo llama "pointer cache") |
| Biblioteca nativa | — | Tablas `catalog_*` |
| Bytes de audio/portadas/proyectos | Telegram | Telegram |

- **PROVISIONAL — autoridad en producción hoy:** no determinable sin leer el entorno. El código exige pool en producción (`server.js:162`) pero no exige autoridad `postgres`.

## La familia postgres-* / control-plane-* / cutover-* / secret-*

**Uso continuo en runtime (FIRME):**

- `postgres-runtime-config.js` — configuración y pool.
- `postgres-bootstrap.js` — pool, migraciones y cierre.
- `postgres-migrations.js` — runner con advisory lock, checksums y guarda "DB por delante del binario".
- `postgres-installation-claim-coordinator.js` — advisory lock por instalación.
- `control-plane-authority.js` — valida las variables de autoridad.
- `control-plane-cutover-runtime.js` — orquesta el arranque en modo json/postgres (nombre engañoso: se ejecuta en cada arranque).
- `control-plane-json-compat.js` — el adapter descrito arriba.
- `postgres-control-plane-runtime.js` — carga y guarda snapshots, cola serializada.
- `postgres-auth-multiprocess-compat.js` — diff de snapshot de auth y cuarentena de vaults.
- `secret-envelope.js` (AES-256-GCM), `secret-keyring.js`, `secret-envelope-provider.js` (claves de desarrollo o AWS Secrets Manager).
- `legacy-import-executor.js` — pese al nombre es runtime: `buildLegacyRows` traduce usuario JSON a filas en cada flush.

**De una sola vez o residuo (FIRME por `git grep`):**

- `postgres-cutover-preparation.js` — stage y commit del cutover; importadores: tests y `scripts/catalog-lab/lab-bootstrap.cjs`. No hay CLI versionado que lo ejecute.
- `postgres-rollback-preparation.js` — solo `assertJsonRollbackSnapshot` se usa en arranque json; export y commit de rollback solo en tests.
- `postgres-secret-rotation.js` — solo tests.
- `cutover-snapshot-bundle.js` — solo tests.
- `legacy-exporter.js` — solo rollback.
- `legacy-import-plan.js` — solo cutover y `tools/legacy-import-dry-run.cjs`.

## Agrupamiento de los archivos sueltos

Hay 115 `.js/.mjs` en la raíz (133 archivos contando json, md y ejemplos). Mapa de lectura:

| Grupo | Archivos |
| --- | --- |
| Esqueleto HTTP/arranque | 7 |
| Operaciones/trazas | 3 |
| Contratos de despliegue | 2 |
| Persistencia control-plane (`postgres-*`, `control-plane-*`, `cutover-*`, `legacy-*`) | 16 |
| Secretos | 3 |
| Cuentas/sesiones/alta | 23 |
| Access/planes | 5 |
| Billing | 23 |
| Transporte directo/Telegram/MASTER | 17 |
| Biblioteca legacy/INDEX/proyectos/basura | 13 |
| Pegamento de catálogo en raíz | 3 |

**Nombres que codifican fase y no responsabilidad:**

- `d8-ro-resolutions.js` — en realidad borrado inmediato de cuenta y reautenticación OAuth.
- `d10-backup-readiness-contract.mjs`.
- `stage1-critical-path-trace.js` — traza opcional incrustada en rutas de producción.
- `productive-temp-auth-boundary.js`.
- `scripts/step15-*.cjs`.
- `legacy-import-executor.js` es "legacy" de nombre pero vivo en runtime.
- Sufijos `-runtime/-authority/-boundary/-coordinator` sin significado estable.

## Fricción (ordenada por coste)

1. **FIRME — el seam de composición es monkey-patching ordenado de globales.**
   - 19 archivos reasignan `express.application.post/get/use/listen` (p. ej. `http-containment.js:420`, `session-security.js:614`, `direct-capability-boundary.js:709`).
   - 3 reasignan `fs.writeFileSync` (`control-plane-json-compat.js:55`, `account-lifecycle.js:473`, `auth-public-registration-hardening.js:422`).
   - 1 reasigna `globalThis.fetch`, 1 `express.response.send` y 1 `require.extensions['.js']`.
   - Cada capa intercepta por cadena literal de ruta: `POST /auth/login` aparece en 9 archivos.
   - El comportamiento real de una ruta es su handler más N envoltorios en N archivos, en un orden que solo existe en `server.js:197-263`. No hay ningún sitio donde leer la cadena efectiva: locality mínima.
   - `/metadata/upsert` y `/library/artwork` no autentican en su cuerpo (`server-core.js:2779`, `:2886`); su autorización vive en `http-containment.js:15`.

2. **FIRME — el código que corre no es el que se lee.**
   - `server-core-auth-bridge-loader.js` engancha el loader de CommonJS, sustituye por texto dos fragmentos de `server-core.js` (login solo por email; `saveAuthData` serializa desde otro Map, `:6-17`, `:51-57`) y añade un sufijo que exporta closures internas (`:59-306`).
   - Si alguien reformatea esas líneas, el arranque falla con `SERVER_CORE_AUTH_BRIDGE_INCOMPATIBLE`.
   - El `/auth/login` de `server-core.js:1553-1559` no es el que se ejecuta.
   - Varios scripts de regresión leen `server-core.js` como texto/AST (`scripts/regression-direct-manager-only.mjs:68`, `run-regressions.mjs:234`), así que su forma textual es parte de la interface.

3. **FIRME — los archivos JSON son el bus de integración.** `http-containment.js:60-76`, `account-lifecycle`, `session-security`, `direct-capability-boundary.js:100` y `startup-routing-index.js:83` obtienen el estado de core re-leyendo y re-parseando `accounts-data.json` y `cloud-data.json` en cada petición. La interface entre modules es la forma del JSON.

4. **FIRME — `server-core.js` no es un module**: no exporta nada, escucha al cargarse, lee disco al cargarse y su estado son Maps de closure. Solo se prueba como texto o arrancando el servidor entero. Autenticación, OAuth, TOTP, binding de instalación, topics de Telegram y SSE comparten esos Maps.

5. **FIRME — tres estilos de inyección coexisten**: singletons `configure()/current()` (23 archivos, incluidos todos los de catálogo, que core lee en `:133` y por tanto deben configurarse antes del `require`), fábricas con dependencias explícitas (billing routes, `user-storage-lifecycle`: los más probables de ser deep) y parches. Hay más de 35 slots `__beatgaler*` sobre `express.application`.

6. **FIRME — añadir un campo de usuario toca 5 sitios**: `buildLegacyRows`, `loadAuthSnapshot`, `replaceAuthSnapshot`, `mergeAuthSnapshotDelta` (SQL de providers/MFA duplicado entre los dos últimos) y `legacy-exporter`, más la migración.

7. **Coste de una ruta nueva con datos nuevos.**
   - Camino catálogo: migración + module + `routes.js` + `configure` en `server.js` (y en `catalog-worker.js` si aplica) ≈ 4-5 archivos, limpio.
   - Camino core: migración + handler en core + decidir a mano en qué listas de rutas entra + wiring en `server.js` + scripts de regresión textual.
   - Las listas son `INSTALLATION_POST_ROUTES`, CSRF/cookies de `session-security.js:16-38`, abuse-controls, la lista CORS de `server-core.js:123`, el no-store de `security-headers.js:17` y las alertas de `operations-runtime.js:44`.
   - PROVISIONAL: 6-10 archivos. El coste real no es el número sino que nada avisa si se olvida una lista; la ruta queda sin esa guarda en silencio.

8. **Prueba de borrado.**
   - Pass-through o shallow: `control-plane-authority.js` (48 líneas, una función y un re-export), `postgres-bootstrap.js` (40), `security-headers.js` (28), `legacy-media-upload-disable.js`, `authenticatedTransportAccount` (alias, `server-core.js:1920`).
   - Se ganan el sitio (deep): `postgres-migrations.js`, `secret-envelope*.js`, `postgres-installation-claim-coordinator.js`, `runtime-operability.js`.
   - `control-plane-json-compat.js` es pequeño pero su interface real es "todo el `fs` del proceso".

9. **FIRME — 132 variables de entorno distintas** leídas de forma dispersa en el código no-test de `cloud-server` (incluye `scripts/` y `catalog/`).

## Candidatos a retirar

**Sin importadores de runtime (FIRME):**

- `garbage-reconciliation-worker.js`, `index-reconciliation.js`, `garbage-journal-repository.js` — cadena que solo usan tests.
- `direct-operation-repository.js` — solo tests.
- `catalog-project-master-adapter.js` — solo tests (PROVISIONAL: puede estar reservado para T11/T12).
- `postgres-secret-rotation.js`, `cutover-snapshot-bundle.js` — solo tests.
- `d10-backup-readiness-contract.mjs` — cero importadores, solo lo cita un doc.
- `tools/legacy-import-dry-run.cjs` — nadie lo referencia.
- Tabla `direct_leases` de la migración 0001 — sin uso fuera de `postgres-migrations.js`.

**Artefactos versionados (FIRME):**

- `restart-audit-before.json` y `restart-audit-after.json` — salida de un diagnóstico local del 2026-09-06, con banner de dotenv incrustado (no son JSON válido).
- `restart-first-healthz.json`, `restart-first-readyz.json`, `restart-second-healthz.json`, `restart-second-readyz.json` — 0 bytes.
- `diagnostics/telegram-direct-control.txt` — log de runtime commiteado, 244 líneas con ids de chat e instalación de pruebas.

**Fases cerradas:**

- `scripts/step15-*.cjs` — solo los invocan `scripts/step15-*` de la raíz.
- `scripts/post-deploy-smoke.mjs` — solo su test.
- Tras el cutover y la activación nativa: `postgres-cutover-preparation.js`, `postgres-rollback-preparation.js`, `legacy-exporter.js`, `legacy-import-plan.js`.

**Dentro de `server-core.js`:** las 12 rutas muertas/stub, el Proxy `bot` y los helpers legacy de INDEX/topics sin llamadas.

**No retirar:** `scripts/polar-sandbox-*`, `auth-identity-preflight`, `billing-reconcile-user`, `catalog-native`, `import-legacy-email-verifications` tienen referencias en `package.json`, workflows o tests.

## Dudas y límites

- No se sabe qué autoridad ni cuántos procesos corren en producción.
- No se trazó el interior de los modules `account-*`, `billing-*`, `direct-*` ni `catalog/`; solo sus enganches.
- El recuento de líneas muertas es estimado.
- No se ejecutó nada: el orden efectivo de middlewares por ruta está inferido leyendo, no observado.

**Avisos aparte (riesgo para datos, no auditoría):**

- **FIRME en código, PROVISIONAL en impacto — pérdida de escrituras entre procesos.** En modo `postgres`, `runtime_compat_state` se reemplaza entero desde la memoria de cada proceso (last-writer-wins) y los snapshots solo se cargan al arrancar. Con dos o más procesos Cloud, uno puede pisar bindings instalación↔vault o topics escritos por otro. Auth sí usa deltas.
- **FIRME — un fallo de escritura deja el proceso inservible.** `PostgresControlPlaneRuntime.poisoned` nunca se limpia (`postgres-control-plane-runtime.js:286-294`); tras un fallo, todas las respuestas no exentas devuelven 503 hasta reiniciar.
- **FIRME — bloqueo de cabecera.** Todas las respuestas, incluidas las de `/catalog/v1`, esperan la cola global de flush.
- **FIRME — arrancar `node server-core.js` directamente** levanta el servidor sin ninguna de las capas de contención, autorización ni CSRF: todas viven en `server.js`.
