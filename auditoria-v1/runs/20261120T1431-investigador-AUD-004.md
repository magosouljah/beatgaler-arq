# AUD-004 — recuperación de membresía PENDING (2026-11-20 14:31 CST)

**Fuente:** BeatGaler `local/landing-gallery-unificada` @ `4e66638051effe888e66a885010065d98fc7df17`. **Método:** lectura estática; no se ejecutaron tests, Cloud, Telegram ni producto. **Asignación:** PLAN.md, Dirección 14:00, AUD-004. **Estado:** HECHO tramo central, PENDIENTE falsación de accesibilidad de acciones de recuperación desde UI.

## Mapa de responsabilidades y flujo verificado estáticamente
1. `src/features/library/catalog/catalogApi.ts:176-178,194-216`: `resolveContext` hace GET `/catalog/v1/context`; **solo** ante `LIBRARY_NOT_PROVISIONED` (404) llama POST `/library/provision`. Un 503 `CATALOG_UNAVAILABLE` se clasifica `unavailable`, sin nuevo POST. Owner: API cliente; no almacena membresía.
2. `src/features/library/catalog/catalogComposition.ts:18-22`: `chooseLibraryComposition` convierte `ready` en modo catalog y cualquier otra resolución en blocked.
3. `src/features/library/catalog/catalogLibraryProvider.tsx:159-207`: el hook es dueño de `state` y `services`. El `useEffect` consulta una vez por montaje/cambio de `enabled,api,accountId`; desmontaje aborta y libera servicios. No hay temporizador ni retry automático de `resolveContext` en este tramo. Un contexto `ready` monta servicios sin inspeccionar `membershipState`.
4. `src/features/library/catalog/LibraryCompositionGate.tsx:9-17,29-38`: resolving muestra main vacío; blocked muestra mensaje, sin botón de retry en este componente y sin fallback legacy. El gate solo recibe estado y árbol, no posee función para reintentar.
5. `cloud-server/catalog/routes.js:48-79`: router autentica con `authenticate`; GET context llama `authority.resolveContext` **sin** `transportProvisioner.ensureForUser`. POST provision ejecuta primero `authority.provisionLibrary` y luego `ensureForUser` si hay provisioner; si falla, responde error sin devolver el contexto de la transacción ya confirmada.
6. `cloud-server/catalog/authority.js:168-191,196-245`: GET consulta biblioteca PostgreSQL; si existe autoridad POSTGRES retorna contexto; POST provision confirma transacción SQL y devuelve contexto incluso para biblioteca existente. No hay llamada Telegram en authority.
7. `cloud-server/catalog/native-transport-provisioning.js:19-59`: `ensureForUser` exige biblioteca y chat actual, valida activación/bot, consulta asignación durable y, bajo lock de membresía, intenta `ensureCatalogBotMembership`; solo marca READY con prueba positiva. Ante fallo de prueba lanza 503 `CATALOG_UNAVAILABLE` con `detail.reason=BOT_MEMBERSHIP_PENDING`. Es owner de la transición PENDING→READY mediante store; no de la composición Web.
8. `cloud-server/catalog/routes.js:130-135,179-184`: rutas POST IMPORT/REPLACE y POST direct/session también invocan `ensureForUser`; son **rutas alternativas condicionadas a que la UI efectivamente las llame**. No se demuestra aquí su alcanzabilidad en todos los estados de UI.

**Diagrama:** Web hook → resolveContext GET → Cloud authority SQL → [biblioteca ausente: POST provision → COMMIT SQL → ensureForUser → Telegram membership proof → READY o 503] → Web clasifica error → Gate blocked/catalog. Tras POST fallido con SQL ya creado: siguiente GET encuentra biblioteca y devuelve contexto sin asegurar membresía → Gallery catalog; posterior IMPORT/REPLACE o direct/session podría reintentar ensureForUser.

## Escenarios y contraejemplos
- **Camino feliz observado en código:** POST provision crea biblioteca; ensureForUser obtiene prueba, marca READY; devuelve 201 y Web monta catalog.
- **Contraejemplo de fallo recuperable:** invitación falla después de COMMIT SQL; POST devuelve 503; siguiente GET context puede devolver `ready` porque no comprueba membresía. Una operación posterior que llegue a `direct/session` o IMPORT/REPLACE vuelve a invocar `ensureForUser`. Por tanto es incorrecto afirmar que PENDING sea permanentemente irrecuperable.
- **RIESGO R-001 (no bug confirmado):** GET context y Gate no proporcionan retry explícito de membresía. Recuperación depende de operaciones posteriores o remontaje + acción. No está probado si la UI expone esas acciones en todos los estados ni si son accesibles sin Direct listo.
- **NO_VERIFICABLE:** disponibilidad real de Telegram, configuración runtime de `transportProvisioner`, éxito de retry, y accesibilidad real de controles UI tras el error.

## Cobertura propuesta
`catalogApi.resolveContext`, `catalogComposition`, `LibraryCompositionGate`, `catalogLibraryProvider.useLibraryComposition`, `routes.context/provision/direct-session`, `authority.resolveContext/provisionLibrary`, `native-transport-provisioning.ensureForUser`: **C2 estático parcial** para esta interacción. **C3 pendiente:** contrato de membresía en contexto, pruebas escritas pertinentes y demostración de alcanzabilidad de botones/acciones desde UI. Ningún test ejecutado.

## Qué modificar y límites
- Para exponer retry deliberado, evaluar `catalogLibraryProvider.tsx` (disparador de nueva resolución) y `LibraryCompositionGate.tsx` (control visible), pero GET context por sí solo **no** reintenta membresía: cualquier solución requiere endpoint/flujo explícito en `routes.js` o uso controlado de ruta que llame `ensureForUser`. No implementar sin decisión.
- Si se quiere representar PENDING en UI, estudiar contrato `authority.contextOf` y estado de asignación; hoy la separación SQL/Telegram permite contexto PostgreSQL listo con transporte pendiente. No equiparar ambos readiness.

## Pendientes separables
1. Rastrear llamadas UI concretas a `direct/session` y `operations` y guards cuando el Gate está blocked vs catalog (AUD futuro).
2. Inspeccionar tests escritos de provision/transport y confirmar estados PENDING, sin ejecutarlos.
3. Verificar configuración/montaje del provisioner en Cloud a este SHA y diferencias entre flag y runtime.

**Clasificación:** CONFIRMADO estáticamente: separación COMMIT SQL/ensureForUser, GET sin ensure, rutas de retry condicionado, Gate sin botón. RIESGO: recuperación no autónoma. HIPÓTESIS: usuario atrapado en PENDING. No se afirma fallo operativo.
