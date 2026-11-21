# AUD-009 — Recuperación de membresía PENDING (investigación estática)
Fecha: 2026-11-20 19:30 CST. Fuente exclusiva: magosouljah/BeatGaler @ `b52649f04a1f7166763c7d26f40ac4b3337828c8` (SHA fijado por PLAN; no se afirma que sea HEAD vigente). Alcance: provisioner, router y provider; fronteras auxiliares Gate, composición y authority. Sin ejecución de código, pruebas, AWS ni Telegram.

## Mapa de responsabilidades y recorrido
1. **Web** `catalogLibraryProvider.tsx` (aprox. 159–207): `useLibraryComposition` invoca `chooseLibraryComposition` dentro de efecto por cuenta; elige servicios solo cuando `resolveContext` devuelve ready; si blocked, no instancia servicios. No hay bucle de reintento automático del contexto en este hook. El efecto puede volver a ejecutarse al cambiar dependencias (cuenta/API/flag).
2. **Gate** `LibraryCompositionGate.tsx` (9–38): blocked solo muestra mensaje; no hay botón de reparación ni POST de provisión. `catalogComposition.ts` distingue ready de offline/quarantined/reset/unauthenticated.
3. **HTTP** `cloud-server/catalog/routes.js` (aprox. 66–80): GET /context llama únicamente `authority.resolveContext`; POST /library/provision llama `authority.provisionLibrary` y **después** `transportProvisioner.ensureForUser`. La ruta POST es idempotente a nivel de creación de biblioteca; GET no ejecuta ensure. `routes.js` (aprox. 130–150) ejecuta ensure antes de crear operaciones IMPORT/REPLACE; es una vía posterior condicionada a acción de usuario y servicios montados.
4. **SQL** `authority.js` (168–245): GET consulta biblioteca existente y retorna contexto POSTGRES sin consultar membresía; POST confirma transacción SQL y devuelve `created:false` si ya existía. La operación externa ocurre después del COMMIT, fuera de la transacción.
5. **Provisioner** `native-transport-provisioning.js` (17–59): exige biblioteca/chats coherentes, toma lock por chat, valida activación y asignación, comprueba bot no cuarentenado, retorna inmediatamente si `membershipState==='ready'`; si no, llama `gateway.ensureCatalogBotMembership`, exige prueba de bot y marca READY. Error de gateway/prueba/mark se transforma en `CATALOG_UNAVAILABLE` con reason `BOT_MEMBERSHIP_PENDING`; otros errores (activación, bot, chat) tienen razones distintas. La implementación del gateway no fue inspeccionada en este microlote.

## Escenarios y falsación de R-001
| Situación | GET context | POST provision | Resultado estático |
| --- | --- | --- | --- |
| Biblioteca ausente y elegible | 404 LIBRARY_NOT_PROVISIONED | crea SQL y ejecuta ensure | camino feliz: 201 y READY si gateway prueba membresía |
| Biblioteca creada, membresía pendiente | contexto POSTGRES existente | created:false; vuelve a ejecutar ensure | **recuperable por API POST**, sin recrear SQL |
| POST crea SQL pero falla ensure | posterior GET devuelve contexto existente | POST repetido intenta ensure | no hay rollback SQL ni reparación automática por GET |
| Bot ya READY | GET no verifica membresía | ensure devuelve ready sin invitar de nuevo | contraejemplo a reintentos siempre costosos |
| Estado blocked en Gate | no hay servicios POSTGRES montados | no se ofrece POST en Gate | no demuestra que el usuario esté atrapado: otros callers UI o flujos posteriores pueden existir |

**R-001 — RIESGO, no bug confirmado:** una biblioteca puede estar SQL-ready pero con membresía PENDING; GET y montaje Gallery no reparan automáticamente. **Contraejemplo importante:** POST provision repetido reintenta bajo lock, y operaciones IMPORT/REPLACE invocan ensure. No se ha probado si el usuario puede activar esas rutas desde UI en el estado concreto, ni si una operación distinta ofrece reparación.

## Contratos, errores, cambios y cobertura
Owner SQL: `authority`; owner de estado de membresía: assignment store inyectado; owner de verificación externa: gateway inyectado; router orquesta ambos; Web provider posee ciclo de vida de servicios, no membresía. La frontera de cambio para recuperación explícita sería un caller Web autorizado hacia POST provision o endpoint de reparación, con idempotencia y control de errores; **propuesta, no implementación**. No inferir que `context.ready` signifique `membership.ready`.

**Pruebas escritas:** no inspeccionadas en esta ejecución; su existencia/alcance y casos PENDING→READY permanecen pendientes. **Cobertura propuesta:** C2 parcial en tres módulos principales, C1 en Gate/composición/authority auxiliares; C3 pendiente por gateway real, accesibilidad UI, tests y efectos runtime. HECHO: mapa SQL→ensure y reintento idempotente, camino feliz/error y contraejemplo. PENDIENTE: caller UI de POST provision, gateway actual y pruebas escritas, respuesta de cliente ante error. Microlote siguiente separable: localizar caller real de provision en `catalogApi.ts` y pantalla de registro; contrastar tests del provisioner/gateway y rutas Direct; no prolongar AUD-009 sin decisión del Director.

No se editaron registros canónicos ni código. Evidencia: archivos leídos con ref explícito SHA mediante GitHub.