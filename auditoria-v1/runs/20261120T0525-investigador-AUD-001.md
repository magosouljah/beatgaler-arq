# AUD-001 — Investigador — checkpoint 2026-11-20 05:25 (America/Mexico_City)

**Fuente:** BeatGaler@4e66638051effe888e66a885010065d98fc7df17; archivos leídos por URL raw fijada al SHA. **Estado:** EN_PROGRESO; no sustituye checkpoints 03:30 y 04:30. Inspección estática solamente; ninguna prueba ejecutada ni contacto con producción. Leídos PROTOCOLO, PLAN, MAPA, INVENTARIO, FLUJOS, COBERTURA, HALLAZGOS y encabezados de las siete zonas históricas (5cb6ccc, solo hipótesis). HEAD remoto no reconfirmado por endpoint de rama en este turno; SHA de contenido sí fijo.

## Nuevo mapa verificable: provisionamiento SQL versus membresía externa

`src/features/library/catalog/catalogApi.ts:194-216`:
`GET /catalog/v1/context` → si responde 200: ready, **no POST**; solo error `LIBRARY_NOT_PROVISIONED` → `POST /catalog/v1/library/provision`; demás errores bloquean/offline.

`cloud-server/catalog/routes.js:71-79`:
GET → `authority.resolveContext`; POST → `authority.provisionLibrary` y después `transportProvisioner.ensureForUser`, si está configurado.

`cloud-server/catalog/authority.js:168-193`:
`resolveContext` abre transacción READ ONLY, comprueba cuarentena, lee `catalog_libraries`; si existe POSTGRES devuelve contexto sin verificar membresía; si no existe, evalúa elegibilidad del vault y puede devolver 404 específico. Estado duradero pertenece a PostgreSQL.

`cloud-server/catalog/authority.js:195-245`:
`provisionLibrary` ejecuta una sola transacción: `BEGIN` → lock `vaults` por user_id (`SELECT ... FOR UPDATE`, línea 208) → relectura de predicado y cuarentena → biblioteca existente: COMMIT y `created:false`; biblioteca nueva: INSERT `catalog_libraries` (222-224), `catalog_generations` (226-227), `catalog_library_chats` (228), revocación de direct capabilities (229-230), actualización de `vaults.index_bootstrap_pending` (231), COMMIT (233). Ante error dentro del bloque: ROLLBACK (235-237). Sin llamadas Telegram dentro de transacción.

`cloud-server/catalog/native-transport-provisioning.js:19-59`:
`ensureForUser` consulta biblioteca+chat, comprueba identidad chat/vault, obtiene lock de membresía, comprueba lista de bots activados, asigna bot si falta, rechaza bot en cuarentena/rotación; si `membershipState === 'ready'` retorna; si no, invoca `gateway.ensureCatalogBotMembership`, exige prueba `ready===true` y botId coincidente, luego `markMembershipReady`; fallo → `BOT_MEMBERSHIP_PENDING`. Propiedad de asignación duradera: `direct-vault-assignment`; efecto externo: gateway Telegram, no transaccional con SQL.

**Diagrama:** UI/auth → catalogApi.resolveContext → GET routes/context → authority.resolveContext → PostgreSQL; solo 404 específico → POST routes/provision → transacción SQL de authority → COMMIT → provisioner.ensureForUser → lock + asignación SQL → prueba gateway Telegram → READY o error. Operaciones de importación y direct/session llaman de nuevo `ensureForUser` en `routes.js:130-135,179-184`, por lo que existen puntos posteriores de recuperación, pero no se ha probado que siempre sean accesibles.

## R-001: prueba estática reforzada, NO bug operativo demostrado

Escenario: usuario sin biblioteca → POST provision inserta y COMMIT → gateway de membresía falla → POST devuelve error. Siguiente GET context devuelve 200 por biblioteca POSTGRES existente (authority:177-180), y el cliente no ejecuta POST (catalogApi:205-215). La ruta de arranque no reintenta la membresía. **Contraejemplo a 'nunca se recupera':** routes.js:133 y 181 invocan ensureForUser en operaciones posteriores. Queda sin probar si UI bloquea esas operaciones o si hay reintentos en otros handlers/background. Riesgo de UX de biblioteca creada pero almacenamiento no listo; causa: separación deliberada entre commit SQL y efecto externo, con recuperación diferida no garantizada en arranque.

## H-002: comparador de filtros

`catalogApi.ts:222-225` usa `TextEncoder().encode(tag).join(',')` y compara cadenas lexicográficamente; para 'd' → '100' y 'c' → '99', orden lexicográfico invierte el orden numérico de bytes. Demostración lógica, **impacto sin verificar**. No se identificaron consumidores de filtersKey ni canonicalización de servidor en este checkpoint: mantener HIPÓTESIS y no elevar a bug.

## Cobertura propuesta (sin certificar)

- `authority.js`: C2 parcial en resolveContext/provisionLibrary; C1 de resto.
- `native-transport-provisioning.js`: C2 estático del flujo completo, pendiente contrato del assignment store/gateway.
- `routes.js`: C2 parcial context/provision y reintentos direct/operations; montaje/middleware pendientes.
- `catalogApi.ts`: C2 parcial resolveContext y request; consumers filtersKey pendientes.
- F01: C2 parcial hasta SQL y frontera de membresía; C3 no alcanzado (sin pruebas de montaje, recuperación integral, tests ni runtime).

## Límites y siguiente checkpoint

1. Localizar y verificar montaje efectivo de `createCatalogRouter`, orden de middleware authenticate/CSRF, y manejo de error.
2. Seguir `direct-vault-assignment` (estados PENDING/READY, lock, reconciliación), `direct-transport-control` y todos los llamadores de `ensureForUser`.
3. Seguir referencias reales de `filtersKey`, comparar canonicalizador SQL/servidor y revisar tests relevantes.
4. Examinar tests escritos del escenario COMMIT SQL exitoso + membresía fallida + nueva carga; sin ejecutarlos.
5. Reconfirmar HEAD de rama LOCAL en próximo turno; no mezclar SHAs.

No se modificó código, documentación BeatGaler, producción ni registros canónicos.