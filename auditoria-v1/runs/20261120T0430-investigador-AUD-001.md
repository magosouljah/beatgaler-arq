# AUD-001 — Investigador — checkpoint 2026-11-20 04:30 America/Mexico_City

**Fuente fija:** `magosouljah/BeatGaler@4e66638051effe888e66a885010065d98fc7df17` (HEAD de `local/landing-gallery-unificada` comprobado con GitHub refs). **Método:** lectura estática; no tests ejecutados ni acceso a producción. **Estado:** AUD-001 EN_PROGRESO; continuación del informe 03:30, sin sustituirlo.

## Contrato Web → Cloud → PostgreSQL (observado en código)

`src/features/auth/AuthExperienceGate.tsx:79-161`: restaura sesión, actualiza cuenta en memoria y controla si se renderiza Gallery. `AuthExperienceGate.tsx:162-225`: login, MFA, registro y restauración de signup; la cuenta autenticada monta hijos con key de identidad. `AuthExperienceGate.tsx:270-330`: restablecimiento de contraseña mediante `/auth/password/reset/request` y `/complete`; OAuth inicia `/auth/oauth/start`, consulta `/poll` y sincroniza cookie+CSRF. Estos flujos no equivalen a verificación de handlers Cloud ni correo entregado.

`src/features/library/catalog/catalogApi.ts:126-218`: `createCatalogApi` añade cookie `credentials:include`, bearer opcional, CSRF para POST, timeout 20s, mapea errores HTTP a `CatalogApiError`. `resolveContext` hace GET `/catalog/v1/context`; únicamente ante `LIBRARY_NOT_PROVISIONED` hace POST `/catalog/v1/library/provision`; ante 401, 409, 503 o red fallida no aprovisiona. `catalogComposition.ts:12-25` decide LEGACY con flag off; CATALOG o BLOCKED con flag on.

`cloud-server/catalog/routes.js:42-86`: `createCatalogRouter` recibe `authenticate`, `authority`, `queries`, `transportProvisioner`; autenticación extrae `user.id` server-side y lo entrega a cada operación; sin authority/queries, API 503. GET context delega `authority.resolveContext({userId})`; POST provision delega `authority.provisionLibrary({userId})` y DESPUÉS `transportProvisioner.ensureForUser({userId})` si existe. El router solo devuelve éxito tras ambos. `cloud-server/catalog/authority.js:76-150,167-180`: la autoridad de biblioteca y su contexto se leen en PostgreSQL, con guardas de activación, usuario y cuarentena; `resolveContext` es lectura, no crea biblioteca. `cloud-server/catalog/native-transport-provisioning.js:12-61`: `ensureForUser` busca biblioteca+chat SQL, comprueba activación/bot, usa lock de membresía y exige prueba del gateway antes de marcar READY; errores mantienen membresía pendiente.

**Mapa textual:** `AuthExperienceGate` → cuenta/identidad → `WebGalleryWorkspace` → `catalogLibraryProvider` → `catalogApi.resolveContext` → GET `routes/context` → `authority.resolveContext` → PostgreSQL → respuesta; si 404 específico → POST `routes/provision` → `authority.provisionLibrary` (SQL) → `native-transport-provisioning.ensureForUser` (asignación SQL + prueba de membresía externa) → respuesta → Gallery o BLOCKED.

**Propiedad de estado:** identidad y sesión visual Web en AuthExperienceGate/activeWebAccount; contexto y composición Web en catalogLibraryProvider; autoridad duradera en tablas PostgreSQL vía authority; membresía del bot duradera en assignment store, con efecto Telegram externo separado de transacción SQL. Frontera Telegram no se ejecutó ni se inspeccionó en vivo.

## Riesgos y falsación

**R-001 — RIESGO con secuencia estática demostrada, impacto pendiente:** en `routes.js:76-82` primero se confirma `authority.provisionLibrary`, después se llama `ensureForUser`. Si la membresía falla, POST devuelve 503 pero la biblioteca SQL puede quedar creada. En el siguiente arranque GET `/context` devuelve 200 y `catalogApi.resolveContext` NO vuelve a llamar provision; por tanto esa ruta de arranque no reintenta `ensureForUser`. Hay otros puntos que sí lo invocan (`routes.js` operaciones/direct session), por lo que NO se puede afirmar biblioteca permanentemente bloqueada. Investigar si UX tiene reparación/reintento automático o si operaciones posteriores la recuperan. Causa potencial: provisioning SQL y efecto externo no atómicos; arquitectura deliberada, pero falta verificar mecanismo de recuperación al reingresar.

**H-002 — HIPÓTESIS de comparador con contraejemplo de orden, impacto no demostrado:** `catalogApi.ts:223-229` compara cadenas decimales de bytes (`TextEncoder().encode(tag).join(',')`) en lugar de comparar bytes numéricos. Para `'d'` (byte 100) y `'c'` (byte 99), comparación lexicográfica `'100' < '99'` da orden inverso al numérico. Es un defecto lógico de comparación estáticamente demostrable, pero antes de calificar bug de producto hace falta rastrear TODOS los usos de `filtersKey`, el canonicalizador servidor y si la diferencia afecta cache/consultas. No se ejecutaron pruebas.

**Verificación negativa:** `tests/component-dom/catalogApi.test.ts:19-65` especifica 404→provision una vez y 401/409/503/offline sin fallback; `cloud-server/tests/catalog/catalog-routes.test.cjs:99-149` especifica tenant por sesión, error JSON y provision 201/200 con fakes. Tests leídos, NO ejecutados; ninguno demuestra recuperación del escenario R-001 con transportProvisioner fallido.

## Cobertura propuesta, NO certificada

C2 estático parcial: `catalogApi.ts`, `AuthExperienceGate.tsx`, `routes.js` (solo context/provision), `authority.js` (entrada/contexto, no toda la implementación), `native-transport-provisioning.js`. C1: pruebas de cliente y rutas. Flujo F01: C2 estático Web→Cloud→autoridad SQL; falta C3, revisar queries concretas de provision, montaje real de router/autenticación y propagación de errores. No afirmar runtime ni funcionamiento LIVE.

## Checkpoint siguiente

1. Rastrear `authority.provisionLibrary` hasta SQL exacto, transacción y estado posterior al fallo de membresía.
2. Localizar montaje real de `createCatalogRouter` y middleware de sesión/CSRF en Cloud.
3. Seguir usos de `filtersKey` y comparar canonicalización servidor; buscar test que detecte inversión `c,d`.
4. Revisar pruebas de `native-transport-provisioning` sobre recuperación de PENDING y rutas de reintento.
5. Continuar AUD-001 hasta aceptación del Director. Sin nuevos bugs operativos confirmados.
