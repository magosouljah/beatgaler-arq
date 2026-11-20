# AUD-001 — checkpoint investigador 2026-11-20 08:30

**Código:** magosouljah/BeatGaler `local/landing-gallery-unificada` @ `4e66638051effe888e66a885010065d98fc7df17` (ref fijado en lecturas). **Asignación:** AUD-001, EN_PROGRESO según PLAN leído. **Método:** lectura estática; ningún test ejecutado, sin acceso a servicios externos.

## Arquitectura: autenticación y persistencia
- `cloud-server/server-core.js:148-150`: archivo `accounts-data.json` local al proceso y TTL de sesión de 30 días. `:733`: mapas en memoria de usuarios por ID y sesiones por hash de token. `:855`: SHA-256 del token como clave.
- `server-core.js:1031-1048`: `loadAuthData` carga usuarios y únicamente sesiones no expiradas desde JSON. `:1051-1060`: `saveAuthData` escribe JSON a temporal y renombra; `:1063-1071`: `createAuthSession` crea token aleatorio, persiste hash y vencimiento. `:1073-1082`: `getAuthUserFromToken` busca hash, elimina expirados y devuelve usuario del mapa o null. `:1114-1121`: `authenticatedUser` toma bearer y responde 401 cuando no existe sesión vigente. `:1301`: carga inicial de auth.
- **Ownership:** `server-core.js` posee sesiones y usuarios de autenticación; NO PostgreSQL para esas sesiones. El router del catálogo recibe `authenticatedUser` como dependencia (contraste previo `:137-138`). **Límite:** no se verificó configuración de persistencia en despliegue, concurrencia entre procesos ni endpoints de login/logout. Riesgo arquitectónico a investigar: archivo JSON local puede requerir volumen compartido/sincronización en múltiples procesos; NO se demuestra que existan varios procesos.

## Arquitectura: asignación persistente de bots y prueba de membresía
- `cloud-server/catalog/native-transport-provisioning.js:13-17` crea store PostgreSQL y gateway `direct-transport-control` por inyección/default. `:19-30` exige catálogo POSTGRES y correspondencia entre chat actual y vault; `:32-59` adquiere lock por chat, valida activación, asigna bot si falta, rechaza bot no permitido/cuarentena/rotación, retorna si estado READY, o invoca gateway y marca READY solo con prueba.
- `cloud-server/direct-vault-assignment.js:1-49`: estados `pending/ready/repair`, selección de vault por ID o chat, proyección desde fila `vaults`. `:62-74`: `getAssignment` lee `vaults`. `:76-111`: `syncTransportBots` actualiza inventario `transport_bots` con transacción y advisory lock. `:115-170`: `assignIfMissing` serializa asignación global con `pg_advisory_xact_lock`, bloquea fila `vaults FOR UPDATE`, elige bot habilitado de menor carga y guarda `transport_bot_id` + estado PENDING. `:174-193`: `withMembershipLock` usa advisory lock de **sesión PostgreSQL** mientras se ejecuta operación externa (sin transacción SQL abierta), liberándolo en finally. `:195-229`: transición de estado mediante UPDATE guardado opcionalmente por ID de bot; `markMembershipReady` y `markMembershipRepairNeeded`.
- `cloud-server/direct-transport-control.js:425-461`: gateway resuelve credenciales/identidad, invita y promociona bot con MASTER, verifica participante y después prueba visibilidad con Bot API `getChat` hasta ocho intentos limitados; retorna `{ready:true,botId}` solo tras comprobación. No se invocó gateway ni se inspeccionaron secretos.
- **Diagrama:** Web bearer → Express authenticatedUser → catalog router → authority PostgreSQL COMMIT → native provisioner → vaults/transport_bots (asignación durable + advisory locks) → gateway MASTER/Bot API (efecto externo) → UPDATE vaults.membership_state=ready → respuesta HTTP. Si la red falla: estado pending, error 503; GET context posterior no fuerza ensure (R-001).
- **Invariante estática comprobada:** el camino de `ensureForUser` no marca READY antes de `proof.ready === true` y coincidencia `proof.botId`. **Límite:** no se ha demostrado ausencia de otras escrituras a `transport_membership_state` ni fiabilidad real de Telegram. `READY` persistido se devuelve sin revalidación remota en llamadas futuras; esto es una decisión de caché/estado, no bug confirmado.

## Hipótesis y falsación
- **R-001 (RIESGO ya registrado):** SQL COMMIT precede la red externa, y GET context no reintenta; el store confirma PENDING durable y `ensureForUser` puede reparar cuando lo invoquen otras rutas. No afirmar fallo permanente ni ausencia de recuperación.
- **H-002 (HIPÓTESIS de impacto):** `src/features/library/catalog/catalogApi.ts:223-226` define `filtersKey` con comparación lexicográfica de `TextEncoder().encode(...).join(',')`; no equivale a comparación de bytes. Contraejemplo conceptual: 100 vs 99 como texto. **Consumidores no comprobados**; no se eleva a defecto operativo.
- **Posible riesgo nuevo, NO_PROBADO:** sesiones en archivo JSON local pueden perder coherencia entre procesos; comprobar modelo de despliegue sin acceder a infraestructura real, solo documentación/código. No se afirma incidencia.
- **Posible complejidad:** dos persistencias distintas (JSON para auth; PostgreSQL para catálogo/bots). Arquitectura observada, no duplicación defectuosa demostrada.

## Pruebas y cobertura propuesta
Lecturas de implementación, no tests ejecutados. No se inspeccionó en este checkpoint un archivo de test concreto; no se declara PASS. Proponer **C2 parcial** para autenticación de sesión `server-core.js:1031-1082,1114-1121`, store `direct-vault-assignment.js` y provisioner/gateway hasta el retorno de prueba; **F02 C2 parcial** ampliado hasta persistencia de bot y prueba remota. **C3 no concedido**: faltan consumidores, tests y escenarios de concurrencia/recuperación completos. Director decide certificación.

## Checkpoint siguiente
1. Inspeccionar pruebas escritas de auth, assignment y membership; verificar invariantes y rutas alternativas de reparación.
2. Buscar consumidores reales de `filtersKey` en árbol LOCAL a SHA (no confiar en code search de main), o declarar límite exacto.
3. Rastrear desde UI la alcanzabilidad de IMPORT/REPLACE y direct/session tras PENDING, y documentar escenarios concretos.
4. Revisar semántica de lock de sesión si una conexión falla durante trabajo externo; no ejecutar servicios.

**Histórico:** siete zonas anteriores son hipótesis @ 5cb6ccc, no se han revalidado íntegramente aquí. No se modificó código ni registros canónicos.
