# AUD-001 — checkpoint 06:30 — Investigación estática

**Fuente:** magosouljah/BeatGaler rama local/landing-gallery-unificada, SHA de asignación 4e66638051effe888e66a885010065d98fc7df17. Archivos abiertos mediante GitHub fetch_file con ref SHA explícito. No se ejecutaron pruebas ni se accedió a producción.

## Hallazgo estructural: recuperación de membresía y frontera HTTP

- `cloud-server/catalog/routes.js:48-69`: `createCatalogRouter` construye router Express, exige callback `authenticate`, pone `Cache-Control: no-store`, responde 503 si faltan authority/queries. Cada handler ejecuta autenticación, delega a servicio, responde JSON y normaliza excepciones. **Esto no demuestra todavía montaje en servidor**: la factory no está llamada directamente desde `cloud-server/server.js` (inspección de ese archivo); falta seguir cargador/puente de servidor y middlewares globales.
- `routes.js:71-79`: GET context solo resuelve autoridad; POST provision ejecuta SQL primero y `transportProvisioner.ensureForUser` después. `routes.js:130-135,179-184`: IMPORT/REPLACE y direct/session son dos caminos de reparación indirecta de membresía, condicionados a estar montados y a que el cliente pueda invocarlos.
- `native-transport-provisioning.js:19-58`: obtiene chat de `catalog_libraries`, `vaults`, `catalog_library_chats`; valida chat; adquiere lock de membresía; lee activación y estado de bot; asigna bot si falta; si estado ready retorna sin invitar; si pending invoca gateway y solo marca ready con prueba positiva. Fallo del gateway deja pending y lanza CATALOG_UNAVAILABLE/BOT_MEMBERSHIP_PENDING. La transacción SQL de creación de biblioteca NO engloba esta llamada externa.
- `server.js:1-123`: arranque carga dependencias de catálogo, prepara pool/cutover y configura autoridad/queries/commands/operations/guard; es composición de servicios, no prueba por sí sola del montaje de rutas.

Diagrama parcial: `Web resolveContext → GET context → authority/PG → [404] POST provision → authority/PG COMMIT → ensureForUser → assignment store lock → Telegram membership gateway → ready/pending → HTTP → Web`. Caminos alternos: `POST operations IMPORT|REPLACE` y `POST direct/session` llaman ensureForUser antes de sus operaciones.

## Pruebas escritas, NO ejecutadas

- `cloud-server/tests/catalog/catalog-native-transport-provisioning.test.cjs:1-76`: cubre asignación, llamada única al gateway cuando ready, rechazo de bot no permitido/no disponible y fallo de gateway que no marca ready. Fakes de pool/store/gateway, no prueba recuperación del GET context ni montaje HTTP real.
- `tests/component-dom/catalogApi.test.ts:1-79`: comprueba 404→POST una sola vez, GET posterior listo, 401/503/reset/quarantine/offline sin POST ni fallback legacy. Usa fetch simulado; no modela fallo del gateway después de COMMIT.

## Evaluación adversarial

**R-001 sigue RIESGO, no bug operativo confirmado.** Secuencia posible: POST provision hace commit, ensureForUser falla, Web ve unavailable; siguiente GET context encuentra biblioteca y Web devuelve ready sin asegurar membresía. Contraejemplo: operaciones IMPORT/REPLACE y direct/session reintentan ensureForUser. No está probado si la UI puede alcanzar esas rutas desde ese estado, ni si un mecanismo externo repara PENDING.

**H-002 pendiente.** `catalogApi.ts:222-225` contiene comparador lexicográfico de bytes serializados en decimal; `100` y `99` ilustran orden distinto del numérico. No se pudo establecer consumidor ni impacto: NO elevar a bug. Es posible que el comparador nunca sea utilizado en rutas activas; buscar referencias sobre árbol LOCAL en próxima ejecución.

## Cobertura propuesta

C2 parcial estático: `routes.js` (auth/handler y rutas de reparación), `native-transport-provisioning.js` (lifecycle de membresía), `server.js` (composición inicial), `catalogApi.ts` (resolución). C1 para tests citados. Flujo F02 C2 parcial. **Ningún C3**: falta montaje, middleware superior, store, gateway y recuperación real. No certificar porcentajes.

## Checkpoint siguiente

1. Seguir desde `server.js` al cargador de server-core y localizar invocación efectiva de `createCatalogRouter` y cadena de middlewares.
2. Revisar `direct-vault-assignment.js`, gateway y tests de integración para caminos PENDING→READY.
3. Buscar consumidores reales de `filtersKey` usando árbol LOCAL y archivos SHA, y comparar orden con servidor.
4. Reconciliar siete informes históricos por tema, sin asumir validez de SHA 5cb6ccc.

**Límites:** solo inspección estática de archivos citados; no se ejecutaron tests, no se afirmó comportamiento productivo ni ausencia de defectos.
