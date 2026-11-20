# Zona 02 — Cuentas y pagos de punta a punta (navegador + servidor)

**Origen:** informe de sub-agente de solo lectura, pasada 1. **Commit:** `5cb6ccc`. **Fecha:** 2026-11-11.
**Marcas:** FIRME = leído en código; PROVISIONAL = inferido. Nada se ejecutó.
Abreviaturas: `CS\` = `cloud-server\`, `SRC\` = `src\`, `WF\` = `.github\workflows\` (todo bajo `E:\777\app\BeatGaler\`).

## Sistemas

**A. Cuentas (servidor).** FIRME.
- **Núcleo legacy dentro de `CS\server-core.js`**: usuarios y sesiones en `Map` en memoria, guardados con `saveAuthData()` en `accounts-data.json` (l.1027-1056). Ahí viven `/auth/register|login|session|account|email/change|password/change|mfa/*|oauth/*|logout` (l.1508-1809).
- **Autoridad hoy**: con `authority=postgres`, `CS\control-plane-cutover-runtime.js` (l.44-51) llama a `installLegacyJsonCompatibility`, que parchea `fs.existsSync/readFileSync/writeFileSync/renameSync` (`CS\control-plane-json-compat.js` l.41-86). `accounts-data.json` y `cloud-data.json` pasan a ser archivos virtuales cuyo "rename" hace `runtime.saveAuthSnapshot()` a PostgreSQL (tablas `users`, `auth_sessions`, `provider_identities`, `mfa_factors`, `vaults`, `runtime_compat_state`). PostgreSQL es la autoridad, pero el código sigue escrito como "JSON en disco". En modo `json` (desarrollo) es disco real.
- **Estado que sigue en JSON real por proceso** (no virtualizado):
  - `account-lifecycle-state.json`: tokens de verificación y reset, recovery codes de MFA, grants de reauth, `password_overrides`, tombstones, notificaciones (`CS\account-lifecycle.js` l.160-179).
  - `session-security-state.json`: sesiones revocadas o rotadas y metadatos (`CS\session-security.js` l.162-188). Los alias de sesión rotada solo viven en memoria (l.168).
- **Estado nativo en PostgreSQL**:
  - `pending_signups`, `auth_delivery_outbox`, `auth_provisioning_ledger` (registro).
  - `user_email_verifications` (`CS\email-verification-authority.js`).
  - `auth_email_changes` (`CS\staged-email-change.js`).
  - `auth_rate_limit_buckets` (`CS\auth-durable-abuse-controls.js`).
- **Responsabilidades y archivos**:
  - Registro con verificación: `pending-signup-boundary.js` (HTTP), `pending-signup-service.js`, `pending-signup-runtime.js` (SQL, código, outbox cifrado), `auth-delivery-worker.js`, `signup-activation-coordinator.js` (crea usuario, vault e instalación con ledger idempotente).
  - Email saliente: `account-email-ses.js`, Amazon SES v2 con SigV4 hecho a mano.
  - Login: handler de server-core más middlewares antepuestos por otros archivos (ver Fricción 1).
  - Sesión Web por cookie + CSRF, rotación y listado/revocación: `session-security.js`.
  - Cambio de email: `staged-email-change.js` + `staged-email-change-routes.js`. La ruta legacy `/auth/email/change` queda bloqueada por `sensitive-auth-containment.js` (l.53, 138).
  - Cambio y reset de contraseña, reauth, export y borrado: `account-lifecycle.js`, más `account-lifecycle-password-authority.js`.
  - OAuth Google/X: server-core + `provider-identity-authority.js` + `d8-ro-resolutions.js` (reauth por proveedor) + `auth-public-registration-hardening.js`.
  - Anti-abuso: `auth-abuse-controls.js` (memoria) y `auth-durable-abuse-controls.js` (PostgreSQL).
  - KDF: `password-kdf.js` (scrypt).
  - Vault de Telegram por usuario: `user-storage-lifecycle.js`.
- `productive-temp-auth-boundary.js` no es de cuentas: transforma respuestas de `/transport/session/start` (auth temporal MTProto). El nombre confunde.

**B. Pagos (servidor).** FIRME. Proveedor: Polar (`@polar-sh/sdk`, sandbox o producción según `BILLING_PROVIDER_ENVIRONMENT`). Solo se monta con autoridad postgres (`CS\server.js` l.119-157).
- Catálogo de acceso y resolver puro: `billing-access-resolver.js`.
  - `BILLING_V1_ACCESS_CATALOG`: free = 20 beats; paid_entry = 100 beats y PROJECT hasta 1 GB; highest_paid = beats ilimitados y PROJECT hasta 1,9 GB.
  - `resolveBillingAccess({subscription, grants, now})` (l.279) decide el plan efectivo.
- Ofertas y precios: `billing-commercial-catalog.js`.
- Adapter de Polar: `billing-polar-sandbox.js` (config, cliente, checkout, verificación de webhook; pese al nombre también cubre producción) y `billing-polar-lifecycle-adapter.js`, que lo extiende (l.158-185).
- Checkout: `billing-checkout-persistent.js` (tabla `billing_checkout_requests`, idempotente por `requestId`).
- Webhook: `billing-webhook-durable.js` (inbox `billing_webhook_events`: firma, dedupe, lease, reintentos).
- Proyección: `billing-lifecycle.js` escribe `billing_subscription_state`, `billing_payments`, `billing_customers`, `billing_provider_actions`.
- Reconciliación: `billing-reconciliation.js` (+ `billing_reconciliation_exceptions`, `audit_events` vía `billing-safe-log.js`).
- Portal: `billing-web-portal-route.js`.
- Lectura de acceso: `access-runtime.js` consulta `billing_subscription_state` + `entitlements` en cada petición (l.56-68). No hay tabla de "plan aplicado": el entitlement se calcula al leer.
- **Dónde se aplica la cuota**:
  - Catálogo nativo: `CS\catalog\operations.js` l.177-180 y 377, vía `resolveAccess` inyectado en `CS\server.js` l.97.
  - Ruta legacy: `CS\library-beat-quota.js` l.114 y `CS\library-index-publication.js` l.324.
  - PROJECT: `CS\project-access.js` l.60-61.
- `plans.js` es el catálogo legacy para modo JSON; difiere del V1 (free permite 500 MB de zip frente a 0, y añade límites de dispositivos).

**C. Cliente.** FIRME.
- `SRC\components\AccountGate.tsx` es de facto el cliente HTTP de cuentas y pagos; 18 archivos de `src` lo importan, incluido el catálogo.
- Puerta de entrada Web: `SRC\features\auth\AuthExperienceGate.tsx`. El componente `AccountGate` solo se monta en Desktop (`SRC\app\BeatGalerApp.tsx` l.11-14).
- `SRC\features\session\` y `SRC\features\startup\` no son sesión de cuenta: son estado de conexión, ajustes y arranque de la biblioteca legacy (INDEX). Solo los usa `SRC\app\useBeatGalerComposition.ts`.

## Flujos

**(a) Registro y verificación**
1. Página: `registerBeatGalerAccount` (`AccountGate.tsx` l.302) hace `POST /auth/register`.
2. Servidor: `pending-signup-boundary.js` antepone su handler `register` (l.172, 319-320) y responde 202 sin llamar a `next`. El handler legacy de server-core nunca corre.
3. `service.begin` inserta `pending_signups` y una fila de outbox cifrada. Web recibe una cookie de continuación.
4. `auth-delivery-worker` envía el código por SES.
5. Página: `POST /auth/signup/verify` con el código. `runtime.verify` valida; `signup-activation-coordinator.activate` (l.134-298) ejecuta los pasos `user`, `vault` (crea el grupo de Telegram vía bridge) e `installation`, marca `ACTIVE`, crea sesión y devuelve la cuenta.
6. `POST /auth/signup/status` reintenta la activación tras una caída.
- Requiere `BEATGALER_PENDING_SIGNUP_ENABLED=1` y `BEATGALER_PUBLIC_REGISTRATION=1`; sin ellos responde 503.

**(b) Login hasta la Gallery (Web)**
1. `SRC\main.tsx` instala `installWebCsrfFetchCoordinator` (parchea `window.fetch`). Al importarse, `AccountGate.tsx` instala un segundo parche (l.45-65).
2. `WebExperience.tsx` enruta `/login|/signup|/gallery` a `AuthExperienceGate`, que llama a `restoreBeatGalerSession` (`POST /auth/session`).
3. Sin sesión: `loginBeatGalerAccount` hace `POST /auth/login`. Pasa por la cadena de middlewares (abuso, gate de signup pendiente, email-only, recovery code), luego el handler de server-core (verifica contraseña y MFA, `ensureUserStorage`, vincula instalación, crea sesión). `session-security` (l.409-435) cambia el token por una cookie `__Host-` y devuelve `csrf_token`.
4. Cliente: marca de sesión en `localStorage`, CSRF en `sessionStorage`, `setActiveWebAccountId`.
5. `WebGalleryWorkspace.tsx`: `useLibraryComposition` resuelve el contexto del catálogo y elige `CatalogGalleryWorkspace` (PostgreSQL) o `LegacyWorkspace` (INDEX). Solo en legacy corren `useStartupBootstrap` y `useLibraryReveal`.

**(c) Pagar**
1. Ajustes: `GET /plans/catalog` y `GET /plans/me`.
2. `startCheckout` (`SettingsPanel.tsx` l.296-307) guarda un `requestId` en `localStorage` y hace `POST /billing/checkout {offerId, requestId}`.
3. `billing-web-checkout-route.js` llama a `createSession` (`billing-checkout-persistent.js` l.230): lock por usuario, rechaza si hay suscripción viva, inserta `CREATING`, llama a Polar, pasa a `OPEN` y devuelve la URL.
4. El navegador va a Polar y vuelve a `/?billing=success`.
5. Polar hace `POST /webhooks/polar` (`billing-webhook-route.js`); `inbox.receive` verifica la firma, persiste y responde 202.
6. El worker `billing-lifecycle-runtime.js` (cada 1 s) llama a `inbox.processNext`. El handler vuelve a pedir el pedido y la suscripción a Polar (`prepare`) y `upsertOrderProjection` (`billing-lifecycle.js` l.367) fija `paid_through` y `plan_id`.
7. La siguiente lectura de `resolveUserAccess` ya devuelve las cuotas nuevas.
- Red de seguridad: `billing-reconciliation-runtime.js` barre pendientes cada 60 s y el resto cada 15 min.
- El cliente no llama a `GET /billing/checkout/:requestId` (sin referencias en `src`).

**(d) Portal**
1. `GET /billing/portal/availability`.
2. `POST /billing/portal` (`SRC\components\billingPortal.ts`): `createPortalService.create` (`billing-web-portal-route.js`) comprueba que el cliente de Polar coincide con el usuario y devuelve una URL validada (`polar.sh` o `sandbox.polar.sh`).
3. El navegador va al portal y vuelve con `?billing=portal-return`.
- Los cambios de plan llegan por webhook. En Web, un suscriptor no puede cambiar de plan con checkout: solo por portal.

## Fricción (por coste)

1. **Cuentas: el comportamiento de una ruta no está donde está la ruta.** FIRME.
   - Once instaladores de esta zona (más dos vecinos intercalados en el mismo arranque, `http-containment` y `direct-capability-boundary`) parchean `express.application.post/get/use` antes de cargar server-core (`CS\server.js` l.187-260).
   - Tres capas apiladas sobre `fs.writeFileSync` para `accounts-data.json.tmp`: `control-plane-json-compat.js`; `account-lifecycle.js` l.466-487; `auth-public-registration-hardening.js` l.419-444.
   - `CS\server-core-auth-bridge-loader.js` reescribe el texto fuente de server-core al cargarlo (l.51-57, 326-331): cambia la búsqueda de usuario en login a solo-email y añade un bridge. El `/auth/login` que se lee en server-core (l.1555-1559) no es el que se ejecuta. (Verificado por el arquitecto leyendo l.1-70 del loader.)
   - Módulos que mutan a otros: `account-lifecycle-password-authority.js`, `d8-ro-resolutions.js` y `staged-email-change.js` usan y sobrescriben `runtime._test.*` (p. ej. `d8-ro-resolutions.js` l.39 sustituye `deleteAccount`). `auth-public-registration-hardening.js` l.412-417 reemplaza `createAccountHandler` en el módulo exportado.
   - Para saber qué pasa en `/auth/login` hay que abrir unos 10 archivos y conocer el orden de instalación. No hay seam: la interface real es "el orden de `server.js` + marcadores de texto". Locality mínima.
   - Prueba de borrado: cada `-boundary/-containment/-guard` aporta una regla real (la complejidad reaparecería), pero el mecanismo de parcheo no se gana el sitio: un router explícito concentraría lo mismo.
2. **Tres almacenes para una cuenta.** FIRME. Snapshot virtual hacia PostgreSQL, tablas nativas y dos JSON locales por proceso. Reset de contraseña, recovery codes, reauth y alias de rotación dependen de disco o memoria local. Con varios procesos no se comparten (PROVISIONAL; `postgres-auth-multiprocess-compat.js` cubre el snapshot, no se leyó si cubre esos JSON).
3. **Pagos: núcleo deep con cáscara shallow.** FIRME.
   - Deep, se ganan el sitio: `billing-access-resolver`, `billing-checkout-persistent`, `billing-webhook-durable`, `billing-lifecycle`, `billing-reconciliation`, y el par de adapters de Polar.
   - Shallow: `billing-web-checkout-runtime` (49 l.), `billing-web-portal-runtime` (23), `billing-webhook-runtime` (34), `billing-plan-catalog-route` (14), `access-grant-runtime` (14, un booleano). Los cinco `*-runtime` repiten el mismo singleton `configure/status/current`; borrarlos mueve unas 20 líneas a `server.js`.
   - Inconsistencia: `billing-web-portal-route.js` contiene el servicio del portal, y su `-runtime` importa del `-route`.
   - Entender "qué pasa cuando alguien paga" exige abrir unos 12 archivos: `SettingsPanel`, `AccountGate`, checkout-route, checkout-runtime, checkout-persistent, polar-sandbox, webhook-route, webhook-durable, lifecycle-runtime, lifecycle, access-resolver, access-runtime.
4. **`AccountGate.tsx` (894 l.) mezcla seis cosas.** FIRME.
   - Parche global de `window.fetch` (l.45-65); solapa con `webCsrfFetchCoordinator.ts`. Son dos parches y dos lecturas del CSRF (`billingPortal.ts` l.11-14 lo reimplementa a mano).
   - Descubrimiento de la URL de Cloud (l.188-213).
   - Almacenamiento de sesión (l.219-260).
   - Cliente API completo: unas 35 funciones exportadas, incluidos planes y checkout (l.302-575).
   - Tipos de cuenta y plan.
   - `XUnlockOverlay` y el formulario de login/registro/verificación de Desktop (l.583-894).
   - `AuthExperienceGate.tsx` (553 l.) duplica ese formulario para Web, con su propio `publicAuthRequest` y `storeWebCookieSession`.
5. **Dos catálogos de planes** (`plans.js` y `BILLING_V1_ACCESS_CATALOG`) con valores distintos; se elige según haya pool (`access-runtime.js` l.73, 79). FIRME.
6. **Nombres que despistan.** FIRME. `billing-polar-sandbox.js` sirve a producción; `features/session` no es sesión de cuenta; `productive-temp-auth-boundary` es transporte; los prefijos `d8-`, `f3-` son fases históricas.

## Pruebas (mapa breve)

- **Cuentas** (`CS\tests\`): `account-lifecycle*`, `session-security`, `sensitive-auth-*`, `abuse-controls`, `auth-public-registration-hardening`, `auth-identity-*`, `pending-signup-safety`, `signup-activation-*`, `staged-email-change*`, `provider-identity-authority`, `email-verification-authority`, `password-kdf`, `d8-ro-resolutions`, `user-storage-lifecycle`. Workflow: `WF\auth-public-registration-hardening.yml`.
- **Pagos**: unitarias `billing-*.test.cjs` (resolver, catálogo, Polar, runtimes, portal); integración PostgreSQL `billing-checkout-persistent`, `billing-webhook-durable`, `billing-lifecycle`, `billing-reconciliation`, `billing-v1-migrations`, `billing-polar-daily`; acceso `access-*`, `library-beat-quota*`. Workflows `WF\billing-v1-*.yml` (8).
- **Cliente** (`tests\component-dom\`): `accountGateWeb`, `authUi11_2`, `billingSettings`, `billingPortal*`, `billingPresentation`, `webCsrfFetchCoordinator`, `webSessionBootstrap`, `accountIsolation`. E2E en `tests\e2e-web\` (`v1-public-auth-access`, `step15-real-auth-access`, `stage1-*`).
- **Duplicación**: `f3-17.1`, `f3-17.2` y `f3-18.1` protegen módulos sin uso en runtime. `f3-18.2` y `billing-v1-reconciliation` ejecutan el mismo `billing-reconciliation.test.cjs`. `billing-v1-durable-webhook` aún ejecuta el test del webhook viejo.
- Los workflows abiertos se disparan por `pull_request`, o `workflow_dispatch` en el smoke de Polar. PROVISIONAL: no se comprobó si corren con los push a esta rama.

## Candidatos a retirar

Importadores verificados con `git grep`. FIRME:
- `CS\billing-checkout.js`, `CS\billing-webhook.js`, `CS\billing-entitlements.js`: solo los importan sus tests. Con ellos caen los tests y `WF\f3-17.1-*`, `f3-17.2-*`, `f3-18.1-*`.
- `CS\pending-signup-activation.js`: stub que solo lanza error; solo lo usa su test.
- `installStagedEmailChange` en `CS\staged-email-change.js` (l.408-442): sin llamadores; superado por `staged-email-change-routes.js`.
- `SRC\components\SetupModal.tsx`: sin importadores; contiene una ruta de desarrollo `E:\777\app\beatvault\dev-beats`.
- `CS\restart-audit-before.json` y `restart-audit-after.json` (volcados de identidad de la BD local, con un banner de dotenv capturado) y `restart-first|second-healthz|readyz.json` (4 archivos de 0 bytes). Solo los referencia un `.md` de tareas.
- `CS\access-grant-runtime.js`: reducible a un booleano. `access-grant-store.js` solo sirve al cutover legacy.

PROVISIONAL:
- `CS\billing-polar-renewal-proof.js` y `CS\auth-identity-preflight.js`: solo los usan scripts y tests; son herramientas operativas, no runtime.
- `GET /billing/checkout/:requestId` y las rutas `/auth/email/verification/*`, `/auth/account/export|delete`, `/auth/lifecycle/status`, `/auth/security/notifications`: sin llamadas desde `src`. Pueden usarlas Desktop, enlaces de email o scripts.

## Dudas y límites

- No se leyeron enteros `server-core.js`, `postgres-control-plane-runtime.js`, `postgres-auth-multiprocess-compat.js`, `billing-reconciliation.js`, `billing-polar-sandbox.js` ni `provider-identity-authority.js` (solo esquema y fragmentos). El detalle de OAuth y de la reconciliación es PROVISIONAL.
- **Aviso aparte (datos de usuario).** El `CLAUDE.md` del repo dice que el borrado de cuentas está "actualmente deshabilitado". En código, `POST /auth/account/delete` está montado y `d8-ro-resolutions.js` fuerza retención 0 (l.9-11) con borrado inmediato (l.39-77), aplicado sin condición (l.303-305; `server.js` l.245). FIRME que la ruta existe y exige reauth (verificado por el arquitecto). PROVISIONAL el efecto en PostgreSQL: `catalog_libraries.user_id` es `ON DELETE CASCADE` hacia `users` (`migrations/0026_catalog_core.sql:12`); no se verificó si los triggers anti-cascada de 0027 detienen este camino. La página Web no invoca la ruta.
- Riesgo operativo, no de seguridad: los marcadores de texto del bridge (`server-core-auth-bridge-loader.js` l.18-27) hacen que editar el handler de login o `saveAuthData` en server-core rompa el arranque.
- Hay hosts de desarrollo fijos en el cliente (`SRC\features\auth\webCsrfFetchCoordinator.ts` l.8).
