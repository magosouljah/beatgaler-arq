# AUD-012 — Registro de uploads legacy y cerco SQL (Investigador, 2026-11-20 22:33 CST)

**Fuente única:** magosouljah/BeatGaler, rama main, SHA fijo `ad8f8d0436bba5c3f663a301440ebf977200d953`. Compare contra el SHA del último lote AUD-011: **identical, 0 commits, 0 archivos**. Lectura estática exclusivamente; no se ejecutaron tests ni se consultaron sistemas externos. Asignación vigente leída en PLAN.md: AUD-012; protocolo v2.1 leído. Los informes LOCAL son históricos.

## HECHO — mapa del tramo

1. **Bootstrap y owner del registro HTTP:** `cloud-server/server.js:4-6,64-66` importa Express e instala `installLegacyMediaUploadDisable(express)` antes de cargar el core; `server-core.js:81-105` detecta `POST /beats/upload`, `/projects/upload`, `/cloud-files/upload` **solo para logging**, no los registra. `server-core.js:131-135` monta el router PostgreSQL `/catalog/v1`; `server-core.js:136-144` construye middleware Multer, sin que ello pruebe un handler de subida.
2. **Desactivación de rutas antiguas:** `cloud-server/legacy-media-upload-disable.js:3-22` parchea `express.application.post` a nivel de registro. Si otro módulo llama `app.post` con uno de los tres paths exactos, sustituye todos los handlers por una respuesta HTTP **410** con texto de desactivación, antes de Multer. Para otros paths delega al `originalPost`. La instalación es idempotente mediante propiedad del prototype. **Contraejemplo:** el path `/catalog/v1/operations` no está en ese set, por tanto el parche no lo bloquea.
3. **Ruta activa de transferencia, distinta del upload legacy:** `cloud-server/catalog/routes.js:48-81,121-169` registra operaciones nativas; `POST /catalog/v1/operations` llama a `operations.createOperation` o al comando de operación, según kind. Su frontera de auth es `handle`/authenticate; las operaciones de transferencia exponen receipt, commit, reservation y send-ticket cuando los servicios correspondientes están inyectados. La API HTTP de control no demuestra que Cloud transporte bytes.
4. **Cerco INDEX por usuario/chat:** `cloud-server/catalog/legacy-fence.js:8-29,36-69` construye consultas SQL a `catalog_libraries`, `vaults.catalog_native_eligible` y `catalog_library_chats`. `assertLegacyEntryAllowed` verifica usuario y chat presentes y lanza `CatalogLegacyFenceError` con código `LEGACY_CLIENT_UNSUPPORTED`/410 ante coincidencia. `respondLegacyFence` convierte ese error en JSON HTTP 410 (`:74-82`). **Contraejemplo:** ausencia de usuario/chat o de filas coincidentes permite pasar la guarda; esto NO implica que exista endpoint legacy registrado ni que la operación sea autorizada por otra capa.
5. **Pruebas escritas, no ejecutadas:** `scripts/regression-legacy-media-upload-disable.mjs:19-38` registra rutas en un fake Express y comprueba sustitución antes de Multer y 410; `:40-49` verifica que artwork conserve middleware de containment y orden de instalación. `cloud-server/tests/catalog/catalog-fence.integration.cjs:56-82` define matriz de entradas C10 y prueba con PostgreSQL de laboratorio que usuarios/chats nativos quedan cercados y legacy no; `catalog-fence.test.cjs:19-42,65-90` cubre guard de sesión y montaje del router con fakes. Son intenciones/afirmaciones de tests escritos, no resultados de esta auditoría.

**Secuencia feliz nativa (estática):** Web solicita operación nativa → router `/catalog/v1/operations` → autenticación de `handle` → servicio de operaciones PostgreSQL → contrato de transferencia; la subida de bytes y las garantías del gateway quedan fuera del tramo.

**Secuencia de rechazo:** registro hipotético `app.post('/beats/upload', multer, handler)` → wrapper del bootstrap sustituye handlers → petición devuelve 410 sin invocar Multer. Si un helper C10 recibe usuario/chat nativo → consulta SQL → error 410 antes del efecto, **siempre que ese helper invoque efectivamente el fence**. Son dos barreras distintas; no confundirlas.

## Clasificación y límites

- **CONFIRMADO estáticamente:** existen los dos mecanismos de rechazo (parche de registro HTTP y fence SQL); el router de operaciones nativas está registrado; las tres rutas legacy aparecen en el logger, lo cual no prueba montaje.
- **RIESGO / pendiente:** la garantía «todos los caminos INDEX están cercados» requiere trazar cada caller real de `assertLegacyEntryAllowed` y wrappers dinámicos. El parche de `app.post` solo cubre coincidencia exacta de tres paths y registros realizados por esa API; no equivale a un bloqueo universal de Express.
- **NO_VERIFICABLE aquí:** respuesta runtime de rutas no registradas (404 vs 410), rutas montadas por otros routers, auth efectiva en producción, Telegram/bytes, despliegue, disponibilidad real, pruebas ejecutadas. No se demuestra bug operativo nuevo.
- **Estado:** `server.js`, `server-core.js`, `catalog/routes.js`: ACTIVO como bootstrap/router estático; `legacy-media-upload-disable.js`: ACTIVO como bloqueo de compatibilidad; `legacy-fence.js`: módulo de defensa presente, alcanzabilidad completa de sus callers INCIERTA; handlers INDEX antiguos no demostrados activos.

**Cobertura propuesta:** C2 parcial para instalación del parche, contrato de fence y montaje de operaciones nativas; C1 de tests escritos examinados; C3 pendiente por trazabilidad completa de rutas/callers, errores de auth y ausencia de ejecución. No inferir cobertura de toda Cloud.

**Dónde modificar:** política de desactivación de tres uploads → `legacy-media-upload-disable.js` y orden en `server.js`; política por pertenencia SQL → `catalog/legacy-fence.js` y sus callers; transferencias nativas → `catalog/routes.js` + servicio `catalog/operations.js` (no analizado a profundidad).

## PENDIENTE / siguiente microlote sugerido (sin autoasignación)

Rastrear `assertLegacyEntryAllowed` y `respondLegacyFence` desde cada endpoint/helper legacy, junto con `installHttpContainment`, para probar alcance efectivo del cerco; contrastar el montaje de `/metadata/artwork` y posibles routers externos. Verificar si hay registro real de los tres uploads, no solo el parche que los interceptaría. El Director decide cerrar AUD-012 PARCIAL o dividir esos huecos.

**Persistencia:** informe creado exclusivamente en `auditoria-v1/runs/`; verificar lectura GitHub posterior a la escritura.
