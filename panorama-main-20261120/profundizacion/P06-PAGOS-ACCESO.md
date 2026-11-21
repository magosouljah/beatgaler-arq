# P06 — Pagos, acceso y cuotas (BeatGaler V1)

**Diagnóstico de solo lectura — 2026-11-20.** Código fuente exclusivo: `magosouljah/BeatGaler`, rama `main`, HEAD **`ad8f8d0436bba5c3f663a301440ebf977200d953`**. Referencia del panorama: el mismo SHA; **delta = 0** al comienzo y en la comprobación final. Prelecturas: `magosouljah/beatgaler-arq/panorama-main-20261120/PANORAMA.md` y la parte pertinente de `INVENTARIO-C0.md`. **No se ha llamado a Polar, ejecutado tests, abierto navegador ni tocado AWS, PostgreSQL, Telegram, secretos o producción. No se cambió código.** Este documento es diagnóstico, no aprobación de implementación.

**Convención de evidencia.** `archivo:Linicio-Lfin@ad8f8d0` significa líneas observadas del commit completo indicado arriba. **VERIFICADO_EN_CÓDIGO** = lectura de declaraciones y llamadores del HEAD; **HIPÓTESIS** = resultado posible sin prueba del comportamiento completo; **VERIFICADO_EN_FUNCIONAMIENTO** = evidencia externa de ejecución para esta revisión, de la cual **no se dispone ninguna**. Los tests y workflows presentes son *contratos escritos*, no resultados PASS.

## Dictamen ejecutivo

**VERIFICADO_EN_CÓDIGO.** No existe una única *columna* con el plan efectivo. Existen **una política canónica de planes V1** (`BILLING_V1_ACCESS_CATALOG`), **dos entradas de autoridad** para decidir el acceso (`billing_subscription_state`, proyección de pagos confirmados, y `entitlements`, concesiones temporales), y **un resolvedor efectivo** (`resolveBillingAccess`) que elige el mayor nivel aplicable entre Free, cobertura abonada vigente y grants. Polar es autoridad externa sobre hechos comerciales; PostgreSQL es la autoridad consultada en cada autorización Web; la respuesta del navegador y el checkout no conceden acceso. `billing_payments` registra pedidos y periodos pagados; el estado proyectado `paid_through` es la prueba inmediata del periodo, no el simple estado `active` del proveedor. Referencias: `cloud-server/billing-access-resolver.js:L15-L67,L165-L196,L238-L249,L279-L347@ad8f8d0`; `cloud-server/access-runtime.js:L53-L76@ad8f8d0`; `cloud-server/billing-lifecycle.js:L461-L535@ad8f8d0`.

**VERIFICADO_EN_CÓDIGO.** Hay **catálogos distintos, pero no dos políticas comerciales Web activas**: `plans.js/PLAN_CATALOG` sobrevive para JSON/rollback y compatibilidad; `billing-access-resolver.js/BILLING_V1_ACCESS_CATALOG` rige PostgreSQL; `billing-commercial-catalog.js/OFFER_DEFINITIONS` describe productos/precio y sus mapeos Polar; `billing-web-runtime.publicPlanCatalog` es un DTO de los dos últimos. La diferencia numérica no es imaginaria: límites PROJECT Paid Entry **1 073 741 824 B** legacy frente a **1 000 000 000 B** Web PG; Highest **1 992 294 400 B** legacy frente a **1 900 000 000 B**; Free tiene 500 MiB legacy declarados pero sin `upload_project` efectivo frente a 0 B PG. La dualidad solo se vuelve inconsistencia operacional si se mezcla el modo de consulta/autoridad: hay que preservar la cerca PG/JSON, no unificar ciegamente. Referencias: `cloud-server/plans.js:L1-L60@ad8f8d0`; `cloud-server/billing-access-resolver.js:L15-L67@ad8f8d0`; `cloud-server/access-runtime.js:L73-L86@ad8f8d0`; `cloud-server/billing-web-runtime.js:L27-L49@ad8f8d0`; `cloud-server/server-core.js:L890-L897@ad8f8d0`.

## 1. Mapa de sistemas, funciones y estado

| Sistema / submódulo | Función y datos | Estado en HEAD | Alcanzabilidad respaldada |
|---|---|---|---|
| `src/components/SettingsPanel.tsx`; `AccountGate.tsx`; `billingPortal.ts`; `billingPresentation.ts` | UI, transporte cookie/CSRF, catalogación/checkout/portal y textos; estados de pantalla, no entitlements | **ACTIVO Web** | `src/app/WebExperience.tsx:L1-L29` → `src/app/WebGalleryEntry.tsx:L1-L19` → shell; `src/features/library/catalog/CatalogAppShell.tsx:L14,L175-L179`; Settings imports `AccountGate/billing*` en L11-L18 |
| `server.js`, `server-core.js`, `billing-plan-catalog-route.js`, `access-consumer-handlers.js` | Montaje HTTP, autenticación por sesión, presentaciones /plans y /billing | **ACTIVO** | `server.js:L35-L42,L148-L188,L294-L326` y `server-core.js:L47-L58,L129-L135,L890-L914,L1028-L1029` |
| `billing-access-resolver.js`; `access-runtime.js` | Política Free/Paid Entry/Highest, periodo pagado/gracia/grants; lee PG por usuario | **ACTIVO** (legacy fallback COMPARTIDO en runtime) | `server.js:L148-L149`, `server-core.js:L890-L901`, `catalog/direct.js:L240-L250` |
| `billing-commercial-catalog.js`; `billing-web-runtime.js` | Ofertas USD mensual, adaptación pública, validación de product/price/environment con provider | **ACTIVO** | `server.js:L150-L158`, `billing-web-runtime.js:L3-L16,L58-L125` |
| `billing-polar-sandbox.js`; `billing-polar-lifecycle-adapter.js` | Adaptador SDK Polar sandbox **o producción**, create checkout/portal, firma, consulta de orders/subscriptions/refund/revoke | **ACTIVO, COMPARTIDO** | `billing-web-runtime.js:L5-L11,L68-L91`; `billing-polar-sandbox.js:L394-L472`; `billing-polar-lifecycle-adapter.js:L142-L229` |
| `billing-checkout-persistent.js`, `billing-web-checkout-{runtime,route}.js` | Checkout durable, locks, errores, recuperación `requestId`; tabla `billing_checkout_requests` | **ACTIVO**; wrapper **thin runtime** | `server.js:L153-L158` → `server-core.js:L903-L908` |
| `billing-web-portal-{runtime,route}.js` | Exposición y solicitud de portal para suscripción existente; sin mutar access | **ACTIVO**; wrapper **thin runtime** | `server.js:L159-L164` → `server-core.js:L909-L914` |
| `billing-webhook-{route,runtime}.js`, `billing-webhook-durable.js` | Ingesta firmada, inbox PG idempotente, claims con lease, aplicación transaccional | **ACTIVO**; route/runtime **thin**, durable **núcleo** | `server-core.js:L129-L132`, `server.js:L165-L175,L325-L326` |
| `billing-lifecycle.js`, `billing-lifecycle-runtime.js` | Proyectar orden/suscripción/refund; acciones Polar durables; poller | **ACTIVO**; lifecycle **núcleo**, runtime **thin** | `server.js:L171-L176,L325`; `billing-lifecycle-runtime.js:L29-L45` |
| `billing-reconciliation.js`, `billing-reconciliation-runtime.js` | Descubrimiento por usuario, reparación de proyección, excepciones y sweeps | **ACTIVO**; reconciliation **núcleo**, runtime **thin** | `server.js:L178-L184,L326`; `billing-reconciliation-runtime.js:L10-L94` |
| `access-grant-runtime.js` | Indicador mínimo PG/legacy para catálogo; no crea grants | **ACTIVO, COMPARTIDO** | `server.js:L148`; `server-core.js:L890-L896` |
| `catalog/operations.js`, `catalog/direct.js`, `catalog/worker.js` | Reservas de beats, importe/commit, PROJECT ticket, verificación de bytes | **ACTIVO**, condicionado a autoridad nativa y Direct | `server.js:L94-L134`, `catalog/routes.js:L121-L169` |
| `project-access.js` | Clase de error compartida y servicio de verificación para manifestos PROJECT antiguos | **COMPARTIDO/PARCIAL LEGACY** | Import runtime confirmado de **`ProjectAccessError`** desde `direct-transport-control.js:L10`. **INCIERTO** si `createProjectAccess()` se invoca en alguna ruta habilitada; no aparece como fábrica montada en el camino nativo inspeccionado |
| `plans.js`; `access-grant-store.js`; `postgres-cutover-preparation.js` | Proyección JSON legacy y migración/rollback de grants | **LEGACY/COMPARTIDO en frontera** | `access-runtime.js:L3-L4,L73-L80`, `server-core.js:L47`; `postgres-cutover-preparation.js:L3-L5` |
| `billing-checkout.js`, `billing-webhook.js`, `billing-entitlements.js` | Primeros contratos de checkout, webhook watermark, reserva de cuotas vía `entitlement_reservations` y status-only | **LEGACY, sin importador productivo encontrado** | Búsqueda de referencias exactas: sus factories `createCheckoutService`, `createWebhookProcessor`, `createEntitlementService` aparecen solo en sus módulos y tests. *No autoriza borrar sin búsqueda inversa completa de build y scripts* |
| `billing-polar-renewal-proof.js` | Probar renovación/SDK en preflight | **Solo TEST/SCRIPT, no runtime de servidor localizado** | Referencia encontrada en `cloud-server/scripts/polar-sandbox-e2e-guard.cjs`, test y workflow policy |

**Dependencia dinámica específica:** `server.js:L294-L302` instala el bridge de Auth condicionado y efectúa `require("./server-core")` en ese momento, por lo que los endpoints comerciales no se deben clasificar mirando solo `server-core`. `billing-polar-lifecycle-adapter.js:L70` carga SDK mediante `require(POLAR_SDK_ENTRY)`; los imports indirectos cuentan al intentar simplificar. `CatalogAppShell` sí monta Settings en Web PG; no confundirlo con `src/app/AppShell.tsx` alternativo/compartido.

## 2. Lifecycle del pago, camino feliz y ownership

```text
Web /Settings/Plan
   │ GET /plans/catalog, GET /plans/me, GET /billing/portal/availability
   │ Auth + cookie/CSRF desde AccountGate / billingPortal
   ▼
POST /billing/checkout {offerId, requestId}
   │ server-core → web-checkout-route → persistent-checkout
   │ PG: billing_checkout_requests CREATING [user advisory lock + unique unresolved]
   ├─ oferta mapeada → adaptador Polar createCheckout(external_customer_id=userId)
   └─ PG: OPEN (checkoutId,url) → HTTP 200 → navegador sale a Polar
                                  │
                         Polar confirma pago
                                  │
                        POST /webhooks/polar
                        raw body + firma validada
                                  │
                      PG billing_webhook_events
                      RECEIVED + 202 ACK
                                  │
                      lifecycle-runtime (poll)
                      claim lease / SKIP LOCKED
                                  │
               getOrder/getSubscription del proveedor
                                  │
                   transacción SQL por usuario:
                     billing_customers
                     billing_payments [orden/periodo]
                     billing_subscription_state
                        paid_through + plan_id
                     checkout_requests COMPLETED
                     webhook_events PROCESSED
                                  │
                  access-runtime + entitlements
                     resolveBillingAccess(now)
                                  │
                ┌─────────────────┴─────────────────┐
                │                                   │
        GET /plans/me/account                API catalog/v1
        Settings presentación                operaciones: cuota max_beats
                                              direct send-ticket: PROJECT bytes
```

`billing-webhook-route.js:L8-L28,L41-L46@ad8f8d0`; `billing-webhook-durable.js:L262-L352,L523-L603@ad8f8d0`; `billing-lifecycle.js:L367-L570@ad8f8d0`. **Nunca** interpretar URL de checkout, callback `?billing=success`, `checkout_available`, status `active`, o `entitlementGranted:false` como licencia. La landing/Settings solo refresca `/plans/me`: `SettingsPanel.tsx:L145-L175,L314-L337@ad8f8d0`.

**Portal y cambio de plan:** un usuario con suscripción viva no puede crear otro checkout inicial (`billing-checkout-persistent.js:L191-L205@ad8f8d0`). La UI invoca `POST /billing/portal` y navega fuera; la autorización comprueba suscripción/customer vinculado al usuario y el portal no concede plan (`billing-web-portal-route.js:L27-L76@ad8f8d0`). El SDK posee `scheduleSubscriptionChange(...proration_behavior:next_period)`, `cancelSubscriptionAtPeriodEnd` y otros métodos (`billing-polar-lifecycle-adapter.js:L232-L266@ad8f8d0`); **no hay ruta Web propia de actualización inmediata** trazada. Un cambio programado se muestra como `next_plan_id/next_plan_effective_at` y no incrementa access hasta un nuevo pedido pagado; `billing-lifecycle.js:L238-L272,L474-L535@ad8f8d0`.

**Datos por dueño:**
- **Polar externo:** cliente, checkout, orders, estado actual de suscripción, refund y portal. Lecturas vía adaptador por `external_customer_id=userId`, sin consultar servicio real en esta revisión.
- **PG comercial durable:** `billing_customers` (vínculo proveedor-usuario), `billing_checkout_requests` (intentos), `billing_webhook_events` (inbox), `billing_payments` (periodos pagados/reembolsos), `billing_subscription_state` (proyección actual del usuario), `billing_provider_actions` (revocación después de reembolso), `billing_reconciliation_exceptions` (discrepancias). Claves únicas y vínculos: `migrations/0011_billing_v1_foundation.sql:L68-L75,L108-L160,L162-L201@ad8f8d0`, `0012_billing_webhook_durable_inbox.sql:L54-L105@ad8f8d0`, `0013_billing_lifecycle.sql:L15-L64@ad8f8d0`.
- **PG de grants:** `entitlements` con inicio/vencimiento/revocación y exclusividad de welcome (no confundir con pedidos). `migrations/0011_billing_v1_foundation.sql:L77-L106@ad8f8d0`.
- **PG catálogo:** `catalog_libraries.active_count/trash_count/purging_count/pending_count`, `catalog_reservations`, `catalog_transfer_operations`, `catalog_operation_parts` y jobs. Cuota de beats **no** depende de `library_beats` histórica o `entitlement_reservations`. `catalog/operations.js:L171-L185,L194-L246,L378-L387,L503-L543@ad8f8d0`.
- **Web local:** `currentPlan`, `planCatalog`, `portalAvailable`, `billingReturn` y `requestId` persistido en localStorage; son estado de UX, no autoridad. `SettingsPanel.tsx:L101-L110,L314-L337@ad8f8d0`.

## 3. Diagramas de fallo, reintento y concurrencia

```text
Doble clic / dos pestañas:
   mismo requestId → OPEN recuperado (recovered=true), sin nuevo create
   otro requestId → lock por usuario + índice único de checkout no resuelto → 409
Proveedor timeout / caída entre create remoto y UPDATE local:
   CREATING → AMBIGUOUS (o CREATING tras crash)
   → NO crear nuevamente; PG + reconciliación + evidencia remota
   → si hay order pagada vinculada, proyecta pago y checkout COMPLETED
   → si no hay estado inequívoco, excepción OPEN; bloqueo conservador

Webhook duplicado:
   firma OK → hash+id mismo proveedor/entorno → 202 duplicate=true
   id reutilizado con contenido distinto → 409
Webhook entra pero worker cae:
   RECEIVED → PROCESSING lease → lease vence → otro worker reclama
   handler prepara snapshot actual Polar → BEGIN → proyección + PROCESSED → COMMIT
   error → FAILED + backoff (máximo 12 intentos) / requeue manual

Webhook NO llega:
   no hay fila de inbox; pending sweep (checkout CREATING/OPEN/AMBIGUOUS)
   → listSubscriptionsForUser + listOrdersForUser por userId externo
   → si order + subscription inequívocas, reparar paid_through y checkout
   → si provider no responde, ambigüedad o falta de orden: NO conceder plan

Renovación fallida:
   evento/sweep detecta past_due → past_due_at
   → si había paid_through previo, grace_until = past_due_at + 7 días
   → mientras paid_through futuro: paid
   → si vence paid_through y sigue gracia: grace (plan anterior)
   → al expirar ambos: Free salvo grant independiente
   → posterior order abonada: nueva cobertura, quitar gracia
Refund total del periodo vigente:
   billing_payments refunded → invalidación commercial → acción durable
   billing_provider_actions REVOKE_SUBSCRIPTION → worker idempotente/lease
   → grants independientes siguen evaluándose; NO borrar medios
```

Referencias: `billing-checkout-persistent.js:L142-L172,L254-L395@ad8f8d0`, `migrations/0011_billing_v1_foundation.sql:L124-L157@ad8f8d0`; `billing-webhook-durable.js:L277-L340,L354-L400,L501-L614@ad8f8d0`; `billing-lifecycle.js:L275-L365,L538-L568,L651-L765@ad8f8d0`; `billing-reconciliation.js:L204-L277,L311-L375,L378-L434@ad8f8d0`. Pending sweep está programado cada **60 s** y commercial sweep cada **15 min**, **no** cada petición ni necesariamente cada día: `billing-reconciliation-runtime.js:L7-L8,L31-L40,L55-L83@ad8f8d0`.

**Límite y fallo pendientes a falsar.** `billing_checkout_requests` declara estados terminales `EXPIRED/FAILED`, pero entre las escrituras productivas rastreadas no se encontró transición automática `OPEN → EXPIRED` al alcanzar `expires_at`. `OPEN` cuenta como unresolved tanto en servicio como en índice único, y la reconciliación con cero subs/órdenes devuelve estado sin escribir cierre del checkout. **HIPÓTESIS de impacto:** checkout abandonado puede bloquear un nuevo intento indefinidamente hasta evidencia/acción específica. **No declarar incidencia funcional sin reproducción controlada.** Evidencia de la pregunta: `billing-checkout-persistent.js:L8-L9,L285-L325,L398-L415@ad8f8d0`, `billing-reconciliation.js:L262-L277,L413-L425@ad8f8d0`, `migrations/0011_billing_v1_foundation.sql:L130-L156@ad8f8d0`.

## 4. Qué ocurre cuando el plan cambia durante una subida

**Beat nuevo (IMPORT): VERIFICADO_EN_CÓDIGO.** La admisión crea reserva bajo lock, cuenta el slot `pending_count` y compara la cuota **vigente**: `active+trash+purging+pending < max_beats`. Si baja el plan mientras los bytes están en tránsito, en `commitOperation` se vuelve a consultar `resolveAccess`, se exige reserva HELD válida y se comprueba de nuevo la plaza descontando su reserva. El commit puede devolver **409 QUOTA_EXCEEDED** o `RESERVATION_EXPIRED`; los bytes verificados no se convierten forzosamente en beat ACTIVE ni se eliminan por el fallo de pago. Readmisión vuelve a comprobar cuota. `catalog/operations.js:L178-L185,L194-L246,L360-L388,L503-L543@ad8f8d0`. Nota: `max_beats=null` es ilimitado *por plan*, no licencia de saltarse otros límites.

**PROJECT: ventana específica a revisar.** Se exige `upload_project=true` y tamaño declarado `<=max_project_zip_bytes` antes de emitir **send-ticket**; tamaño remoto debe coincidir con declarado en verificación del worker. `catalog/direct.js:L135-L170,L240-L250@ad8f8d0`, `catalog/operations.js:L326-L355@ad8f8d0`, `catalog/worker.js:L60-L73@ad8f8d0`. **VERIFICADO_EN_CÓDIGO:** el camino `catalog/operations.commitOperation` revalida `Access` para cuota **IMPORT**, pero no muestra una segunda comprobación `upload_project/max_project_zip_bytes` al confirmar una operación con parte PROJECT, sea IMPORT o REPLACE. **HIPÓTESIS:** si baja de plan **después del ticket y antes del commit**, podría completarse una PROJECT previamente autorizada; definir primero política de V1 (ticket como permiso capturado o revocación estricta al commit) y probar secuencia antes de calificarlo bug. No hay razón aquí para borrar bytes o PROJECT existentes tras downgrade. `catalog/operations.js:L360-L425@ad8f8d0`; `catalog/direct.js:L149-L184@ad8f8d0`.

**Efecto de caída del pago sobre datos existentes:** resolver disminuye autorizaciones nuevas por expiración; las rutas de pagos no contienen lógica para purgar archivos de catálogo. La integridad de Telegram/Direct y la limpieza de partes huérfanas pertenecen al diagnóstico de medios; **no afirmar que un pago desencadena borrado**. También se debe validar con pruebas el caso de cambio de tier durante `REPLACE` y downgrade cuando `used>max_beats`.

## 5. Contratos HTTP, SQL y eventos (y Telegram)

| Contrato | Entrada/salida, autenticación y fallo | Autoridad |
|---|---|---|
| `GET /plans/catalog` | Público; `plans` + `code_policy`. PG usa catálogo comercial validado; JSON legacy usa `plans.js`. `checkout_available` depende de checkout listo. | `server-core.js:L890-L897`, `billing-plan-catalog-route.js:L3-L11@ad8f8d0` |
| `GET /plans/me`, `POST /auth/account` | Usuario autenticado, respuesta del resolvedor `commercialPlanId`, `effective_plan_id`, sources, paidThrough/gracia/cambio previsto. | `server-core.js:L899-L901,L1028-L1029`; `access-consumer-handlers.js:L3-L47`; `access-runtime.js:L6-L76@ad8f8d0` |
| `POST /billing/checkout` | Cookie/bearer de auth, cuerpo **solo** `{offerId,requestId}`; 200 con checkout OPEN o 400/401/409/503. `GET /billing/checkout/:requestId` lee solo propio. | `billing-web-checkout-route.js:L5-L54@ad8f8d0` |
| `GET /billing/portal/availability`, `POST /billing/portal` | Autenticado; portal validado/solo si subscription y customer coinciden; sin derecho nuevo. | `billing-web-portal-route.js:L27-L106@ad8f8d0` |
| `POST /webhooks/polar` | **No** sesión de usuario; cuerpo RAW firmado verificado por adapter. 202 tras persistencia; duplicado 202, firma inválida 403, colisión 409, body grande 413, storage caído 503. Montada antes de `express.json`. | `server-core.js:L129-L132`; `billing-webhook-route.js:L8-L49@ad8f8d0` |
| Eventos | `subscription.{created,updated,active,canceled,uncanceled,past_due,revoked}`, `order.{created,updated,paid,refunded}`; evento guarda payload validado mínimo y worker obtiene snapshot actual proveedor. Los no soportados quedan `IGNORED`. | `billing-lifecycle.js:L12-L27,L591-L616`; `billing-webhook-durable.js:L123-L189,L523-L573@ad8f8d0` |
| SQL | UNIQUE user/request y un checkout no resuelto; webhook identity por provider/env/event; order único por provider/env/order; transacción `apply + PROCESSED`, `FOR UPDATE SKIP LOCKED`, advisory lock por usuario y lease; exceptions no auto-reparables bloquean proyección. | `0011_billing_v1_foundation.sql:L108-L201`, `0012_billing_webhook_durable_inbox.sql:L54-L105`, `0013_billing_lifecycle.sql:L22-L64`; `billing-webhook-durable.js:L354-L400,L523-L603@ad8f8d0` |
| Catálogo/Telegram | `POST /catalog/v1/operations` (IMPORT/REPLACE), `POST /operations/:id/parts/:partKey/send-ticket`, recibo/commit; en modo Direct B **navegador envía bytes a Telegram** y Cloud solo valida ticket, metadata y evidencia. No hay evento de Telegram usado para cobrar o decidir plan. | `catalog/routes.js:L121-L169`; `catalog/direct.js:L2-L12,L135-L184`; `catalog/worker.js:L60-L83@ad8f8d0` |

El puente con Auth es **identidad autenticada `user.id`** y coordinación de cookie/CSRF; la ruta de webhook se identifica por firma y bindings PG, no por cookie. `server-core.js:L903-L914`; `AccountGate.tsx:L225-L241,L400-L460`; `billingPortal.ts:L1-L37@ad8f8d0`. El orden de instalación de middlewares está en `server.js:L273-L302@ad8f8d0`. **P03 no se reaudita**.

## 6. Pruebas escritas, CI ya existente y huecos

**VERIFICADO_EN_CÓDIGO (existencia de pruebas, NO PASS):**
- `cloud-server/tests/billing-access-resolver.test.cjs:L19-L186`: cuotas, paidThrough vs `active`, grants, expiraciones, first failed payment, tier más alto.
- `cloud-server/tests/billing-checkout-persistent.integration.cjs:L103-L350`: same-request double click, dos pestañas, timeout ambiguo, restart, rechazo de cambios de oferta, no grant por abrir checkout. Test PG condicionado a variable de entorno; su mera presencia no implica que corrió.
- `cloud-server/tests/billing-webhook-durable.integration.cjs:L104-L321`: cuerpo RAW/firma, ACK tras persistir, identidad duplicada, caída antes de COMMIT, leases/restart, aislamiento usuario.
- `cloud-server/tests/billing-lifecycle.integration.cjs:L226-L450`: pedido pagado primero en conceder, replays, cancelación, cambio siguiente periodo, gracia de 7 días, reembolsos.
- `cloud-server/tests/billing-reconciliation.integration.cjs:L208-L375,L396-L528`: webhook perdido con recuperación, proveedor caído, suscripciones múltiples, refund, sweep, binding contradictorio y excepción durable; `tests/component-dom/billingSettings.test.tsx:L54-L140` y `billingPortalSettings.test.tsx:L47-L76`: retorno de checkout no concede y UI fail-closed.
- Workflow aislados existentes: `.github/workflows/billing-v1-policy.yml:L28-L50`, `billing-v1-persistent-checkout.yml:L20-L67`, `billing-v1-durable-webhook.yml:L22-L85`, `billing-v1-lifecycle.yml:L27-L96`, `billing-v1-reconciliation.yml:L27-L102`, `billing-v1-migrations.yml:L14-L53@ad8f8d0`. Describen `npm run test:billing-v1`, pruebas PG y Node, no son evidencia de ejecuciones actuales.

**Huecos P06 concretos (HIPÓTESIS hasta prueba):** (a) transición y política de recuperación de checkout OPEN expirado sin pagos y AMBIGUOUS sin subscription; (b) downgrade/grant-expiry entre emisión de ticket PROJECT y commit, IMPORT y REPLACE; (c) ausencia de webhook con proveedor que devuelve listas vacías o truncadas; (d) determinismo de "gracia" con reembolsos y eventos fuera de orden en **producción**; (e) compatibilidad al migrar definitivamente legacy a modo PG y no exponer `plans.js` en rutas equivocadas. No se recomienda ejecutar estas pruebas en este diagnóstico; son precondiciones del plan posterior. **VERIFICADO_EN_FUNCIONAMIENTO: no evaluado / ninguna evidencia externa nueva**.

## 7. Duplicaciones demostradas y simplificación responsable

1. **Candidato de mayor claridad, riesgo de eliminación bajo condicionado:** aislar `billing-checkout.js` y `billing-webhook.js` **LEGACY** del mapa productivo, no reutilizarlos ni mezclar sus repositorios `billing_webhook_subjects`/watermark con el inbox durable. La vieja `billing-webhook.js:L42-L99` usa la forma previa `event_id` única y `IGNORED_OUT_OF_ORDER`, mientras la actual exige `(provider, environment, event_id)`, lease y payload validado; no son implementaciones intercambiables. `billing-checkout.js:L83-L129` es otro servicio diferente del `billing-checkout-persistent.js:L107-L155,L230-L395`. Las búsquedas de sus factories identificaron solo módulos/tests, y los entrypoints vivos usan la versión durable. **No borrar antes** de cobertura de imports dinámicos, scripts de cutover y CI, especialmente migraciones históricas.
2. **Candidato de mediano valor:** retirar *del recorrido mental de cuotas nativas* `billing-entitlements.js`/`entitlement_reservations`: esa implementación evalúa `status in active/trialing` y usa `PLAN_CATALOG`, mientras Web PG usa `paid_through + grants` y `catalog_reservations`. La factory `createEntitlementService` no fue localizada en entrypoint de servidor: `billing-entitlements.js:L3-L51`; `catalog/operations.js:L178-L185,L229-L235`. Conservar tabla y tests hasta evaluar compatibilidad/migración; **no reemplazar** el resolver correcto por el viejo.
3. **Mantener compatibilidad explícita, no suprimirla a ciegas:** `plans.js` sirve de fallback JSON, `CODE_POLICY` y importaciones cutover; `access-grant-runtime.js` es una cerca de modo realmente usada; `project-access.js` comparte al menos `ProjectAccessError` con transporte legado y su `createProjectAccess` queda **INCIERTO** fuera del camino Web nativo. Precondición: acordar si V1 aún necesita arranque JSON/rollback, probar todas las rutas autorizadas e imports indirectos y demostrar inalcanzabilidad de cada export antes de retirar.
4. **Núcleo durable que NO borrar ni fusionar superficialmente:** `billing-checkout-persistent` (idempotencia externa), `billing-webhook-durable` (ACK durable), `billing-lifecycle` (orden/proyección), `billing-reconciliation` (webhooks ausentes), `billing-access-resolver` (derechos), `billing_provider_actions` (refund revocation), `billing_customers`/binding, `entitlements` (grants) y los índices/constraints de 0011–0013. Son separaciones necesarias de integridad, no simple sobreingeniería.
5. **Wrappers thin de muy poco ahorro:** `billing-web-{checkout,portal,webhook}-runtime`, `billing-lifecycle-runtime`, `billing-reconciliation-runtime`, `billing-plan-catalog-route` y `access-grant-runtime` solo crean/configuran/inyectan runtimes o HTTP. Consolidarlos podría ahorrar archivos, **no** simplifica los fallos de idempotencia, SQL y contratos; solo considerar después de cerrar puntos de integridad, preservando startup order.
6. **Unificación de DTOs y plan policy, no de ofertas:** preferir imports desde `BILLING_V1_ACCESS_CATALOG` y el mapeo comercial existente en modo PG; evitar replicar valores numéricos en UX. El DTO `publicPlanCatalog` sí deriva del catálogo V1. No fusionar `PLAN_CATALOG` legacy mientras `access-runtime` conserve el fallback y `CODE_POLICY` se publique.

**Costo de cambiar un límite PROJECT** en Web PG: al menos **cuatro responsabilidades** con evidencia, no número de archivos: (i) definición canónica `billing-access-resolver.js` L34-L65, (ii) autorización de ticket `catalog/direct.js` L135-L146/L240-L250, (iii) representación HTTP/UI (`billing-web-runtime.js` L27-L49, `billingPresentation.ts` L31-L38), (iv) contratos/tests (`billing-access-resolver.test.cjs` L19-L39 + catalog Direct). El valor en Web PG no debe modificarse en `plans.js` legacy salvo decisión separada; Polar configura **precio/oferta**, no tamaño PROJECT.

## 8. Prioridad, riesgos y preguntas abiertas

| Prioridad | Veredicto | Por qué / requisito antes de editar |
|---|---|---|
| **P0 integridad** | **VERIFICADO_EN_CÓDIGO**: preservar inbox+locks+SQL paidThrough+reconciliación. | Cualquier limpieza que rompa dedupe, callback, customer binding o atomicidad puede conceder al usuario incorrecto, revocar cobertura pagada o hacer doble checkout. Exigir tests existentes y trazado de rutas antes de diffs. |
| **P1 consistencia de cobro** | **HIPÓTESIS**: checkout OPEN que expira sin closure. | Revisar todos los productores de cambios de estado y regla de conciliación para abandono, con prueba aislada de expiración y de no doble checkout. Nunca reintentar creación Polar a ciegas tras AMBIGUOUS. |
| **P1 integridad de subida** | **HIPÓTESIS**: permiso PROJECT cambia durante una transferencia ya autorizada. | Definir si la autorización se fija al ticket o se revalida al commit; prueba controlada multi-etapa. Mantener bytes existentes y jobs recuperables. |
| **P2 simplificación alta** | **VERIFICADO_EN_CÓDIGO**: legacy checkout/webhook/entitlements paralelos, sin llamada productiva localizada. | Confirmar imports de entrypoints, tests, scripts, migrations y compat de rollback; hacer propuesta de *retirada* separada, no borrar en P06. |
| **P3 simplificación baja** | **VERIFICADO_EN_CÓDIGO**: wrappers finos. | Posponer: beneficio principalmente cosmético y riesgo de alterar orden de inicialización. |

**Preguntas abiertas que permiten falsar conclusiones:**
1. ¿Quién, si alguien, cierra `OPEN` como `EXPIRED` cuando `expires_at<now()` y no hay pedido/suscripción? Búsqueda de escritores `billing_checkout_requests` en `billing-checkout-persistent.js`, `billing-lifecycle.js`, `billing-reconciliation.js` no halló transición; confirmar contra la totalidad de deploy/scripts antes de elevar a defecto.
2. ¿La regla de producto permite completar un PROJECT cuyo ticket fue autorizado antes de un downgrade? Verificar alcance real de `catalog/operations.commitOperation`, `catalog/direct.issueSendTicket` y pruebas del worker para ambas clases de operación.
3. ¿Algún entrypoint de migración, flags o script aún invoca `createProjectAccess`, `createCheckoutService`, `createWebhookProcessor` o `createEntitlementService`? La búsqueda estática de factories no halló consumidores de las tres últimas fuera de tests, pero falta validar completamente empaquetado/flags para su eliminación.
4. ¿Qué alerta/operación humana resuelve excepciones `MULTIPLE_SUBSCRIPTIONS_UNEXPECTED`, mapping ambiguo o `FAILED` de 12 intentos? Reconciliación registra y preserva pero no inventa prueba de pago.
5. ¿Con qué garantía operacional se verifica que los sweeps están **corriendo** en todos los procesos, y que los workflows PG realmente pasaron con este SHA? Código de `start` sí confirmado; ejecución/telemetría no disponible bajo las restricciones.

### Dictamen final

**`COMPRENSION_SUFFICIENTE_PARA_PLAN` — Sí, exclusivamente para preparar un plan de simplificación V1 con límites de riesgo, no para borrar ni cambiar comportamiento todavía.** La propiedad de los datos, el orden de arranque y registro, los flujos Web→checkout→Polar→webhook→PG→Access→catálogo/PROJECT, idempotencia, fallos y vías de recuperación están cartografiados con llamadas/imports y SQL actuales. **Pendiente de validación antes de ejecutar el plan:** política y transición de checkouts expirados, semántica del permiso PROJECT entre ticket y commit, revisión inversa definitiva de consumidores legacy y evidencia de pruebas aisladas/CI al SHA fijado. Esas incógnitas no impiden formular el plan, **sí impiden afirmar funcionamiento en producción o autorizar eliminación**.

---
_Fuente única de código: `magosouljah/BeatGaler@ad8f8d0436bba5c3f663a301440ebf977200d953`; no se reprodujo ningún flujo. Este informe no modifica la app ni las suscripciones._
