# P03 — CLOUD / AUTH / CONTROL-PLANE — Profundización de BeatGaler V1

**Fecha de corte:** 2026-11-20. **Modo:** NEW chat · ALTA · diagnóstico estático y documental, sin ejecución.  
**Código único:** [magosouljah/BeatGaler](https://github.com/magosouljah/BeatGaler/tree/ad8f8d0436bba5c3f663a301440ebf977200d953), `main` fijado al iniciar en `ad8f8d0436bba5c3f663a301440ebf977200d953`.  
**Panorama primero:** `beatgaler-arq/panorama-main-20261120/PANORAMA.md`; inventario consultado solamente en las filas de Cloud.Auth/ControlPlane/HTTP, migraciones y QA de `INVENTARIO-C0.md`. El panorama utilizó exactamente ese mismo HEAD; **delta de HEAD = ninguno**.  
**Fuentes de evidencia:** código y archivos de tests/workflows escritos en el HEAD anterior. No hubo navegador, procesos, tests, CI ejecutado, PostgreSQL real, AWS, Telegram ni consulta de secretos. No se verificaron flags ni topología productivos. Ningún archivo de BeatGaler fue alterado.

**Leyenda:** `VERIFICADO_EN_CÓDIGO` = estructura/callers comprobados estáticamente en el HEAD; `HIPÓTESIS` = consecuencia operativa plausible sin prueba de ejecución; `VERIFICADO_EN_FUNCIONAMIENTO` = solo admisible con evidencia externa previa identificable, **no concedido en este informe**. `ACTIVO` significa alcanzable en la configuración indicada, no confirmado encendido en producción; `LEGACY` conserva compatibilidad/cerco; `COMPARTIDO` combina responsabilidades actuales y antiguas; `INCIERTO` exige falsación. En referencias `archivo:Lx-Ly@H`, **H = ad8f8d0436bba5c3f663a301440ebf977200d953**; no equivale al SHA del documento.

## 1. Arranque real y orden de efectos — VERIFICADO_EN_CÓDIGO

~~~text
node cloud-server/server.js
 ├─ require('dotenv').config; imports de servicios
 ├─ monkey-patches en tiempo de carga:
 │    installRuntimeOperability(express) -> application.use / listen
 │    installSecurityHeaders(express) -> application.use
 │    installLegacyMediaUploadDisable(express) -> application.post [410]
 └─ start()
    ├─ assertProductionStateDir; postgresConfig
    ├─ si PG habilitado: createPool -> migraciones (bloqueo/checksums) ->
    │  assertKnownMigrations; instalar señales shutdown
    ├─ configureRuntimeDependencies + asignaciones Direct
    ├─ prepareControlPlaneCutover(pool, env)
    │    ├─ autoridad JSON: verifica compatibilidad/rollback si hay pool
    │    └─ autoridad PostgreSQL: comprueba marcador READY y hash;
    │       lee snapshot PG; instala merge delta multiproceso;
    │       intercepta fs.exists/read/write/rename de 2 JSON virtuales;
    │       intercepta express.response.send -> flush antes de ACK
    ├─ configurar catálogo nativo, gateway, media, Direct y su prewarm condicional
    ├─ configurar access, billing, planes y conciliadores
    ├─ claim de instalación PG (obligatorio si NODE_ENV=production)
    ├─ autoridad OAuth por proveedor PG si aplica; SES
    ├─ si BEATGALER_PENDING_SIGNUP_ENABLED=1:
    │    construir pending signup PG; recuperar activaciones envejecidas;
    │    preparar worker de entrega
    ├─ instalar wrappers HTTP EN ESTE ORDEN:
    │   01 auth-public-registration-hardening
    │   02 pending-signup-boundary
    │   03 account-lifecycle + password-authority
    │   04 staged-email-change-routes [si autoridad PG]
    │   05 sensitive-auth-containment
    │   06 D8 provider-reauth / immediate deletion
    │   07 session-security
    │   08 account-lifecycle-request-guard
    │   09 http-containment
    │   10 direct-capability-boundary
    │   11 sensitive-auth-capability-revocation
    │   12 auth-durable-abuse-controls [si pool]
    │   13 auth-abuse-controls
    │   14 productive-temp-auth-boundary
    ├─ hook de carga CommonJS server-core -> REQUIRE server-core
    │    ├─ express(): los primeros app.use insertan health/headers,
    │    │  session-security y lifecycle guard antes de los propios
    │    │  middleware de logging/CORS
    │    ├─ app.post('/webhooks/polar') -> INICIA alta diferida de
    │    │  rutas de signup, lifecycle, email y sesiones
    │    ├─ parser raw Polar; luego express.json global; catálogo
    │    ├─ cargar snapshots JSON virtuales -> Maps de core
    │    ├─ declarar handlers /auth/*
    │    ├─ app.listen() -> listener HTTP y graceful shutdown
    │    └─ error middleware final
    ├─ crear coordinador de activación pendiente tras cargar core
    ├─ interceptar arranque/membresía de Direct persistente
    └─ arrancar workers lifecycle, billing reconcile, entrega y avisos
~~~

**Evidencia:** `cloud-server/server.js:L3-L91@H`, `server.js:L94-L214@H`, `server.js:L215-L335@H`; `cloud-server/postgres-bootstrap.js:L6-L37@H`; `cloud-server/control-plane-cutover-runtime.js:L15-L62@H`; `cloud-server/server-core.js:L76-L147@H`, `server-core.js:L729-L735@H`, `server-core.js:L1384-L1422@H`.

**Importante — cómo leer el grafo:** Cada installer sustituye `express.application.post/get/use` guardando la versión previa. El wrapper instalado después se invoca primero **durante el registro** de una ruta; al delegar, los wrappers anteriores insertan sus handlers antes de los posteriores en la lista final. El orden de ejecución del request no equivale al orden de invocación del monkey-patch. Además, hay `app.post` de rutas inyectadas recursivamente en el primer registro, antes del parser global. La cola de respuesta `res.json` es igualmente compuesta por múltiples decoradores; finalmente pasa por el `express.response.send` que espera `flush()`. No atribuir a `server-core` una decisión que en realidad toma una barrera externa. `VERIFICADO_EN_CÓDIGO`.

**Parches de alcance no local:** `server-core-auth-bridge-loader.js:L309-L345@H` registra en importación un `require.extensions['.js']` de un solo uso; valida marcadores exactos, sustituye serialización por ID estable y búsqueda de login por email y anexa un bridge intra-proceso. La llamada explícita condicional del arranque NO es la única instalación. `auth-public-registration-hardening.js:L339-L399@H` intercepta `globalThis.fetch` solo bajo contexto OAuth asincrónico; `:403-444` cambia trace, consumidor de cuenta y `fs.writeFileSync`. `account-lifecycle.js:L466-L486@H` envuelve otra vez `fs.writeFileSync` para filtrar tombstones. La capa virtual de PG ya había interceptado `fs` (`control-plane-json-compat.js:L13-L90@H`). Así, para los archivos de auth, la cadena de escritura relevante es **filtro lifecycle -> filtro de identidad pública -> fs JSON virtual PG**; para otros archivos, algunas capas hacen passthrough. La barrera `send` de PG afecta a respuestas, no solo a `/auth`.

## 2. Inventario funcional, estado y dependencias

| Sistema / módulo | Estado condicionado | Entradas y consumidores; dependencia y salida |
|---|---|---|
| Bootstrap `server.js`, `postgres-bootstrap`, migraciones | ACTIVO | `start` -> pool/migraciones/cutover -> `server-core` y workers; SQL y configuración runtime |
| `server-core.js` HTTP + Maps | ACTIVO/COMPARTIDO | Express POST/GET, OAuth `fetch`, almacenamiento Telegram; registros de usuarios/sesiones + linkedAccounts; parte protegida/ocultada por interceptores |
| `runtime-operability`, `security-headers`, `http-containment` | ACTIVO | `application.use/post/get/listen` -> cabeceras, salud, autorización de instalación y barreras 410 |
| `auth-public-registration-hardening` + `provider-identity-authority` | ACTIVO (PG condicionado) | Login por email, X/Google y unicidad PG; `fetch` global, trace, res.json y fs |
| `pending-signup-*`, `signup-activation-coordinator`, `auth-delivery-worker` | ACTIVO si flag PG / INCIERTO para deployment | POST register/verify/resend/status -> PG estado/outbox/ledger -> bridge -> storage/instalación/sesión |
| `account-lifecycle`, `password-authority`, `request-guard` | ACTIVO/COMPARTIDO | reset, verificación, MFA recovery, reauth, export/delete, tombstones, password override; JSON auxiliar y PG |
| `session-security` | ACTIVO | cookies/CSRF/canonical bearer, gestión/revocación de sesiones; `auth_sessions` PG + archivos auxiliares + Maps |
| `sensitive-auth-containment`, `D8` | ACTIVO | bloqueo de cambio email directo, reauth fuerte, altas/bajas proveedor, cuenta; no borrar guardas |
| `staged-email-change*`, `email-verification-authority` | ACTIVO si PG | confirmación email/notice worker; tablas PG `auth_email_changes`, `user_email_verifications` |
| `postgres-control-plane-runtime`, `postgres-auth-multiprocess-compat` | ACTIVO si PG/COMPARTIDO | load snapshot, delta de usuarios/sesiones/proveedores/MFA, cuarentena vault y flush |
| `control-plane-json-compat`, `legacy-import-executor` | LEGACY/COMPARTIDO **utilizado** | JSON virtual compatible; `legacy-import-executor` construye filas del delta PG, NO muerto por nombre |
| `direct-capability-boundary`, `sensitive-auth-capability-revocation` | ACTIVO | guards /transport, revocación antes de operaciones sensibles, store/capabilities PG |
| `auth-abuse-controls` y `auth-durable-abuse-controls` | ACTIVO/COMPARTIDO | rate-limit proceso y PG; segundo condicionado a pool, evita abuso distribuido |
| `productive-temp-auth-boundary`, Direct persistent session/membership | COMPARTIDO | autorización temporal Direct (también rutas legacy) + funciones consumidas por catálogo nativo |
| `legacy-media-upload-disable` | LEGACY **defensa activa** | POST uploads históricos -> 410; no etiquetar como dead helper |
| `state-dir`, `secret-envelope-provider`, `account-email-ses` | ACTIVO | directorio seguro, llaves cifrado (NO inspeccionadas) y notificador email |
| JSON auxiliares `account-lifecycle-state`, `session-security-state`, `authz-session-bindings` | ACTIVO/INCIERTO multiproceso | almacenamiento local auxiliar fuera de los dos JSON virtuales; ownership y coordinación cruzada no completos |

**Entradas por archivo y dependencias dinámicas:** `cloud-server/server.js:L5-L62@H`, `:193-L214@H`, `:245-L325@H`; `cloud-server/server-core-auth-bridge-loader.js:L17-L56@H`, `:59-L305@H`; `cloud-server/account-lifecycle.js:L813-L874@H`; `cloud-server/pending-signup-boundary.js:L129-L339@H`; `cloud-server/direct-capability-boundary.js:L455-L742@H`. Los imports dinámicos de `direct-transport-control` y `direct-vault-assignment` aparecen en `server.js:L131-L140@H` y `:316-L324`. La dependencia del bridge es vía `require.cache` y compilación inyectada, no un import ordinario. `VERIFICADO_EN_CÓDIGO`.

## 3. Grafo de interceptores por familia de ruta (centro del informe)

**Prefijo común antes de handlers:** `/healthz`/`/readyz` se registran en `runtime-operability` al primer `app.use` (`runtime-operability.js:L90-L102@H`, `:140-L157@H`); para el resto, cabeceras de seguridad -> middleware cookie/session/CSRF -> lifecycle bearer guard -> request ID/observabilidad -> CORS -> parser aplicable -> handlers por ruta -> decoradores `res.json` -> `express.response.send/flush`. El CSRF solo se exige cuando la credencial proviene de cookie y el método cambia estado, con excepciones explícitas; no se debe afirmar que todo POST carece o exige CSRF (`session-security.js:L16-L39@H`, `:249-L371@H`).

En tablas, las flechas muestran el **flujo conceptual de petición**, no que todos los pasos siempre se ejecuten (guards pueden cortar antes). `sanitizar` envuelve respuesta; `durable/mem` = rate-limits PG/proceso cuando están instalados. La inyección temprana de rutas de lifecycle/email/sesiones precede al parser `express.json` global: falta prueba HTTP integral de su parsing real.

| Ruta/escenario | Montaje -> validación -> escritura/respuesta efectiva | Clasificación |
|---|---|---|
| `POST /auth/register` con pending ON | auth-public sanitizar -> pending boundary (servicio PG begin, responde 202 y NO cae a core) -> registro público/claim de instalación y abuse según orden de montaje; crear outbox, **sin usuario definitivo aún**. Guardas comunes y barrera de flush aplican. | VERIFICADO_EN_CÓDIGO condicionado al flag |
| `POST /auth/register` pending OFF | auth-public sanitizar -> pending deja pasar -> lifecycle -> containment: registro abierto y reserva/claim instalación -> durable/mem abuse -> handler core **legacy**, saveAuthData virtual -> provision Telegram -> bind -> token -> cookies via session-security -> flush. | VERIFICADO_EN_CÓDIGO, no asumir usado en prod |
| `POST /auth/signup/verify|resend|status` | Rutas insertadas por pending boundary en primer `app.post`, parser JSON **propio** -> servicio PG; verify/status pueden invocar activación/recuperación -> bridge -> flush; 202 pending / 200 ACTIVE. | VERIFICADO_EN_CÓDIGO si service, 503 si no |
| `POST /auth/login` | sanitizar -> emailOnlyLogin (normaliza email, compara dueño PG con snapshot local) -> loginGate pending -> lifecycle recovery MFA -> http-containment guard instalación -> sessionSecurity decorator -> durable+mem abuse -> core login (KDF/MFA, storage, bind, token) -> bindSessionOnSuccess -> cookie/CSRF web -> flush. | VERIFICADO_EN_CÓDIGO; orden exacto de decoradores sujeto a secuencia de inserción descrita |
| `POST /auth/session` | session-security valida cookie/bearer y consulta PG; lifecycle guard -> containment guard rebind -> core session/storage/install -> binding+cookie/CSRF renovado -> flush. CSRF exceptuado específicamente para esta ruta. | VERIFICADO_EN_CÓDIGO |
| `POST /auth/account` | sesión/CSRF/lifecycle -> consumer handler account; parche desactiva `syncIdentity` legacy -> decorate user/status -> flush. | VERIFICADO_EN_CÓDIGO |
| `POST /auth/oauth/start` | sesión (si existente), auth-public decorate URL/guardar contexto -> sensitive provider-link reauth salvo purpose=reauth -> D8 coordinator puede contestar para purpose=reauth -> containment reserva/afina ownership -> durable abuse -> core start state+PKCE(Map) si caso normal; X scope `offline.access` filtrado. | VERIFICADO_EN_CÓDIGO |
| `GET /auth/oauth/:provider/callback` | auth-public AsyncLocalStorage + HTML sanitizer -> D8 reauth callback si propósito -> containment valida estado/propiedad -> core intercambia code, usa `fetch` interceptado para consulta Google/X -> `provider-identity-authority.prepare` PG (Google email verificado; X subject/handle transaccional) -> bridge/Maps/virtual save -> storage/bind -> completed OAuth Map -> HTML. | VERIFICADO_EN_CÓDIGO, multi-instancia INCIERTO |
| `POST /auth/oauth/poll` | auth-public sanitizer -> D8 reauth poll si corresponde -> containment OAuth flow/install + bind response -> abuse -> core lee completedOAuthFlows del **proceso actual** y entrega sesión vía decorador/cookie. | VERIFICADO_EN_CÓDIGO; afinidad de instancia INCIERTA |
| `POST /auth/oauth/disconnect` | sesión/CSRF -> auth-public `prepareDisconnect` PG -> sensitive strong reauth + último método -> durable abuse -> core elimina proveedor en Maps -> saveAuthData virtual -> flush. | VERIFICADO_EN_CÓDIGO; conservador ante error PG |
| `POST /auth/email/change` | sensitive-auth-containment responde **409 EMAIL_CHANGE_STAGED_REQUIRED**; mutación inline en core no constituye la ruta efectiva. | VERIFICADO_EN_CÓDIGO |
| `POST /auth/email/change/start|resend|confirm` | rutas dinámicas -> sesión/CSRF -> durable abuse -> staged-email-change service: strong reauth, token/email PG, confirmación SES, revoke de sesiones/capacidades antes de swap, transacción SQL, bridge reconcile y avisos; flush. | VERIFICADO_EN_CÓDIGO si pool; parsing de routes inyectadas INCIERTO |
| `POST /auth/email/verification/request|confirm` | rutas inyectadas lifecycle -> rate-limit durable -> token one-time + SES / `user_email_verifications` PG en confirm; notificaciones y flush; no duplicar inline. | VERIFICADO_EN_CÓDIGO, parsing INCIERTO |
| `POST /auth/password/reset/request|complete` | rutas inyectadas lifecycle -> rate-limit durable -> respuesta no enumerable 202 en request; token consumible, password override + revocar sesiones/capacidades en complete, filtrar cuentas y flush. | VERIFICADO_EN_CÓDIGO, parsing INCIERTO |
| `POST /auth/password/change` | sesión+CSRF -> sensitive permite/reauth según password verificado -> capability revoke **antes** -> durable/mem abuse -> core cambio KDF + virtual save -> lifecycle notifications/clean override -> session-security rota token/cookie -> flush. | VERIFICADO_EN_CÓDIGO |
| `POST /auth/mfa/setup|enable|disable` | sesión+CSRF -> lifecycle recuperación para disable -> durable abuse en enable/disable -> core TOTP Maps -> saveAuthData virtual cifrado PG -> lifecycle recovery codes al enable -> flush. | VERIFICADO_EN_CÓDIGO |
| `POST /auth/reauth` y `POST /auth/mfa/recovery/regenerate` | rutas lifecycle inyectadas, sesión/CSRF -> password + segundo factor/recovery -> grant de reauth limitado por sesión; regeneración consume grant. OAuth reauth pasa por D8. | VERIFICADO_EN_CÓDIGO, estado de grants JSON auxiliar |
| `POST /auth/logout` | sesión/CSRF -> capability revoke antes de core -> containment verifica auth -> core elimina token+binding de Maps y virtual save -> session-security marca revoked/borra cookie -> flush. | VERIFICADO_EN_CÓDIGO |
| `POST /auth/sessions|revoke|revoke-all` | rutas session-security inyectadas -> sesión/CSRF -> PG lista sesiones, revoca capacidades primero, luego DELETE SQL, estado revocado local -> flush. | VERIFICADO_EN_CÓDIGO, parsing INCIERTO |
| `POST /auth/account/delete` | lifecycle route -> reauth fuerte, tombstone/scrub, revoke, política retención; D8 modifica comportamiento de borrado. `core` no es único dueño. | VERIFICADO_EN_CÓDIGO; no asumir purga instantánea de bytes |
| `POST /webhooks/polar` | primer POST de server-core -> parser `express.raw` específico con firma Polar; `session-security` lo exceptúa de credenciales cookie/bearer, no de su validación de firma; inbox PG. | VERIFICADO_EN_CÓDIGO |
| `POST /beats/upload|projects/upload|cloud-files/upload` | `legacy-media-upload-disable` registra handler 410 sin llamar handler legacy; defensas de autorización fuera de esta familia no prueban alcanzabilidad de implementación antigua. | VERIFICADO_EN_CÓDIGO |

Fuentes directas del grafo: `cloud-server/auth-public-registration-hardening.js:L199-L218@H`, `:239-L279@H`, `:318-L399@H`; `cloud-server/pending-signup-boundary.js:L156-L225@H`, `:284-L328@H`; `cloud-server/account-lifecycle.js:L692-L764@H`, `:813-L874@H`; `cloud-server/session-security.js:L249-L371@H`, `:409-L453@H`, `:605-L639@H`; `cloud-server/http-containment.js:L248-L330@H`, `:403-L464@H`; `cloud-server/sensitive-auth-containment.js:L53-L150@H`; `cloud-server/d8-ro-resolutions.js:L283-L310@H`; `cloud-server/sensitive-auth-capability-revocation.js:L5-L51@H`; `cloud-server/auth-durable-abuse-controls.js:L5-L30@H`, `:160-L173@H`; `cloud-server/auth-abuse-controls.js:L106-L133@H`; `cloud-server/server-core.js:L930-L1254@H`.

**Falsación importante:** `auth-public-registration-hardening` es el instalador más temprano entre los auth wrappers, pero el contenido añadido por `pending-signup` o por `account-lifecycle` puede **interceptar y finalizar** la petición; su presencia en `app.post` no garantiza que se alcance el último handler de `server-core`. Igualmente, los callbacks OAuth pasan por un wrapper global de `fetch`; no declarar que solo `server-core` aplica unicidad de proveedor.

## 4. Autoridad por dato y persistencia

| Dato | Autoridad de diseño cuando cutover = PostgreSQL | Copias auxiliares / riesgo |
|---|---|---|
| ID estable, username/email y hash password | `users` SQL; email case-insensitive y bloqueos para X | `beatGalerUsers` por username, `beatGalerUsersById` por id, `accounts-data.json` virtual por proceso; password override en JSON lifecycle |
| Sesiones | `auth_sessions` SQL validado en cada request con pool | `authSessions` Map y snapshot JSON virtual; cookie de sesión HttpOnly; aliases rotados `rotatedAliases` Map local; archivo `session-security-state.json` con revocaciones/metadata |
| OAuth sujetos y credenciales | `provider_identities` SQL; tokens cifrados con secret envelope | `providers` por usuario en snapshot/Map; OAuth pending/completed Maps **locales al proceso**; `globalThis.fetch` revisa PG antes de mutación |
| MFA TOTP | `mfa_factors` SQL cifrado; bridge proyecta secreto | `user.mfaSecret` en Map; pendingMfa y recuperación códigos en estados compatibles; encriptación del secreto en PG en delta |
| Email verificado | `user_email_verifications` SQL | compat verificaciones y notificaciones en `account-lifecycle-state.json`; no asumir que un campo de JSON verifique email actual |
| Cambio de email | `auth_email_changes` SQL y `users.email` al confirmar | bridge rehidrata Maps después de commit; worker retry para avisos al email antiguo |
| Alta verificada pendiente | `pending_signups`, `auth_delivery_outbox`, `auth_provisioning_ledger` SQL | cookie/secret de continuación, bridge local; envío SES y provision Telegram son efectos externos |
| Bind instalación -> usuario | `runtime_compat_state` en SQL, key `legacy-cloud-data-v1`, payload JSONB | `linkedAccounts` Map y `cloud-data.json` virtual; claims PG coordinan competición, archivo `authz-session-bindings.json` para sesión->instalación |
| Vault/grupo privado | `vaults` SQL, con cuarentena de divergencias | `storageChatId` Map/snapshot y Telegram como recurso externo; no reemplazar control de ownership |
| Derechos, cuotas, grants | `entitlements` y access runtime SQL | proyección `planState` por compat; no usar JSON legacy como único decisor |
| Capabilities Direct | tablas/repositorio PG de capacidades | revocación por hash de sesión y rutas sensibles, estado en módulos de Direct |
| Abuso/rate-limit | store PG cuando hay pool | contadores Map locales para segunda barrera; multiproceso PG no implica rate limit del Map compartido |
| Datos cloud históricos (topics, redirects, uploads) | `runtime_compat_state.payload` JSONB completo | `cloud-data.json` virtual y Maps; **riesgo hipotético de sobrescritura concurrente** si dos procesos hacen UPSERT de snapshots incompatibles |
| Recuperación, reauth, tombstones, avisos | JSON auxiliar lifecycle (no se demostró que todo esté en PG) | archivo local; disponibilidad/coherencia entre procesos **INCIERTA** |
| Estado CSRF | cookie CSRF + cabecera comparada timing-safe | no sustituir por solo autorización bearer; no se almacena necesariamente token CSRF SQL |

Soporte: `cloud-server/server-core.js:L145-L191@H`, `:466-L517@H`; `cloud-server/postgres-control-plane-runtime.js:L63-L155@H`, `:225-L253@H`, `:262-L311@H`; `cloud-server/postgres-auth-multiprocess-compat.js:L36-L169@H`, `:171-L204@H`; `cloud-server/control-plane-json-compat.js:L13-L123@H`; `cloud-server/account-lifecycle.js:L135-L221@H`, `:379-L427@H`; `cloud-server/session-security.js:L155-L222@H`, `:321-L371@H`; `cloud-server/provider-identity-authority.js:L107-L308@H`; `cloud-server/staged-email-change.js:L263-L340@H`.

**Mecanismo virtual y flush:** `fs.existsSync/readFileSync/writeFileSync/renameSync` se interceptan solo para `accounts-data.json`, `cloud-data.json` y sus `.tmp` (`control-plane-json-compat.js:L13-L82@H`). Un rename cambia el snapshot virtual y **encola** escritura PG, no espera su fin. `express.response.send` espera `runtime.flush()` antes de responder; si falla, responde 503 o destruye la respuesta si se enviaron headers (`:93-L123`). `PostgresControlPlaneRuntime.enqueue` envenena (`poisoned`) la cola tras un error y futuras operaciones/replies pueden fallar hasta reiniciar (`postgres-control-plane-runtime.js:L262-L311@H`). No confundir ausencia de ACK con rollback de las mutaciones ya aplicadas al Map. `VERIFICADO_EN_CÓDIGO` para mecanismos; efectos reales de caída = `HIPÓTESIS`.

**Multiproceso:** `postgres-auth-multiprocess-compat.js:L56-L169@H` calcula delta por ID de filas, modifica solo cambios en sesión/proveedor/MFA/users bajo transacción y excluye vaults en conflicto; consulta cuarentena, umbral STOP y un retry controlado ante trigger. **No** reemplaza `runtime_compat_state` por merge por clave: `replacePersistentSnapshot` hace `INSERT ... ON CONFLICT UPDATE payload=EXCLUDED.payload` (`postgres-control-plane-runtime.js:L245-L253@H`). PG protege mejor algunos dominios que otros; no afirmar consistencia integral entre procesos. Además, los alias OAuth y aliases de token son Maps por proceso: requiere determinar afinidad de tráfico o mover estado a store duradero antes de retirar mecanismos.

## 5. Caminos felices y fallo/reintento (secuencias)

### Registro email verificado (flag pending ON)

~~~text
POST /auth/register -> gate público + abuse -> pending_signups + challenge
 -> auth_delivery_outbox -> auth-delivery-worker -> email SES
 -> POST /auth/signup/verify (continuation + code)
 -> claimActivation advisory lock
 -> ledger user: bridge.adopt... -> save JSON virtual -> flush PG users
 -> marcar user_email_verifications
 -> ledger vault: ensureStorage Telegram -> flush PG vaults
 -> ledger installation: bindInstallation -> flush runtime_compat_state
 -> pending_signups.ACTIVE
 -> bridge.createSession -> flush PG auth_sessions -> cookie/CSRF (Web)
Fallo:
 - email no enviado: outbox RETRYABLE / recuperación de SENDING stale
 - caída en provisioning: pending RETRYABLE, ledger por pasos; status/verify
   reintenta sin volver a crear user/vault/installation ya DONE
 - falla emisión de sesión tras ACTIVE: usuario queda ACTIVE, puede login
 - falla flush: no reconocer éxito; verificar SQL antes de reintentar
~~~

`cloud-server/pending-signup-runtime.js:L164-L420@H`; `cloud-server/pending-signup-service.js:L41-L140@H`; `cloud-server/signup-activation-coordinator.js:L134-L314@H`; `cloud-server/server.js:L199-L214@H`, `:304-L314@H`. El coordinator verifica material SQL tras cada ledger y garantiza por orden programado `ACTIVE` antes de emitir sesión. **No afirma prueba de Telegram real.**

### Login / sesión / OAuth X o Google

~~~text
Web login -> emailOnlyLogin -> PG owner(email) vs snapshot ->
 pending loginGate -> abuse -> password KDF + TOTP/recovery ->
 ensureStorage/bind instalación -> createAuthSession(Map+virtual JSON) ->
 PG delta flush -> session cookie HttpOnly + csrf cookie
Cualquier request posterior -> resolver cookie -> comparar CSRF si aplica
 -> validar hash en PG -> normalizar Bearer -> handler -> flush.
Fallo: PG no accesible -> 503, sesión revocada -> 401; snapshot stale
 -> emailOnlyLogin rechaza en vez de autorizar dueño antiguo.

OAuth start -> Maps state PKCE (X), authorization_url -> proveedor
 -> callback -> exchange token -> GET identidad Google/X
 -> global fetch intercept + autoridad SQL provider subject/handle
 -> Maps/bridge -> storage/installation -> completedOAuthFlows(Map)
 -> poll -> cookie/session.
Fallo: estado expirado, callback en otro proceso, cambio de owner/handle,
 proveedor duplicado o PG no disponible -> rechazo/HTML error/403-503;
 NO asumir recuperación multiproceso ni éxito del X real.
~~~

`cloud-server/auth-public-registration-hardening.js:L199-L218@H`, `:239-L279@H`, `:339-L399@H`; `cloud-server/server-core.js:L975-L1026@H`, `:1093-L1224@H`; `cloud-server/provider-identity-authority.js:L107-L253@H`; `cloud-server/http-containment.js:L248-L330@H`.

### Reset, MFA, email y salida

~~~text
password reset request -> respuesta 202 no enumerable + SES token
 -> complete token un solo uso -> override password ->
 revocar capabilities y auth_sessions PG -> snapshot filtrado -> flush
Fallo revoke -> 503, no reconocer reset; overrides requieren reconciliación.

email change start -> strong reauth -> auth_email_changes.PENDING -> SES
 -> confirm token -> revocar sesiones/capabilities y flush ->
 SQL transaction: users.email + verified email + CONFIRMED + DELETE sessions
 -> reconcile bridge local -> aviso al email antiguo/worker retry
Fallo delivery -> PENDING pero sin confirm; fallo postcommit del bridge
 -> SQL CONFIRMED debe reconciliarse, no deshacer identidad SQL.

MFA setup -> pending secret; enable TOTP -> guardar factor + recovery codes;
 disable TOTP/recovery -> guardar y flush. Logout -> revocar capability,
 retirar sesión, cookie, flush. No remover validación CSRF ni reauth.
~~~

`cloud-server/account-lifecycle.js:L533-L592@H`, `:692-L764@H`; `cloud-server/staged-email-change.js:L99-L179@H`, `:263-L390@H`; `cloud-server/session-security.js:L409-L453@H`; `cloud-server/sensitive-auth-capability-revocation.js:L21-L51@H`.

## 6. Contratos HTTP, SQL, eventos, Telegram

**HTTP (contratos relevantes observados):** `POST /auth/register` puede producir `202 {signup_pending,signup_id,status,expires_at}` con pending ON, y no es contrato único de creación inmediata; `POST /auth/signup/verify,resend,status` requieren continuación (cookie/secret) y pueden responder estado pending/ACTIVE; `POST /auth/login` acepta email/password/instalación, MFA opcional, responde cookie+`csrf_token` para Web y token bearer para otros clientes; `POST /auth/session` reanuda; `POST /auth/oauth/start` devuelve `authorization_url`, `flow_id`; `GET /auth/oauth/:provider/callback` consume `state` y responde HTML; `POST /auth/oauth/poll` entrega sesión al terminar; `POST /auth/email/change` devuelve 409; reemplazo `/auth/email/change/start,resend,confirm` exige reauth/confirmación; `POST /auth/reauth` devuelve grant para operación sensible; `/auth/sessions[/revoke|-all]` administra tokens sin exponer hashes en payload; logout invalida cookie/sesión. 400/401/403/409/429/503 dependen de la barrera. **No hay PASS HTTP afirmado.** `cloud-server/pending-signup-boundary.js:L172-L281@H`; `cloud-server/server-core.js:L930-L1254@H`; `cloud-server/staged-email-change-routes.js:L53-L81@H`.

**SQL:** arranque `schema_migrations` con checksums y guarda forward (`postgres-migrations.js:L23-L74@H`); cutover requiere `control_plane_cutovers(id=legacy-json-v1,state=READY,snapshot_sha256)` (`postgres-control-plane-runtime.js:L45-L60@H`); auth utiliza `users`, `auth_sessions`, `provider_identities`, `mfa_factors`, `vaults`, `user_email_verifications`, `auth_email_changes`, `pending_signups`, `auth_delivery_outbox`, `auth_provisioning_ledger`, `runtime_compat_state`, `direct_capabilities` y límites durables de auth (`cloud-server/postgres-auth-multiprocess-compat.js:L56-L169@H`; `cloud-server/staged-email-change.js:L263-L304@H`; `cloud-server/signup-activation-coordinator.js:L140-L282@H`). Un backend SQL no prueba que los estados JSON auxiliares sobrevivan a todas las topologías.

**Eventos/workers:** la entrega de emails usa outbox SQL y worker de reintento, y cambios de correo tienen notice/reconcile worker; `start()` también inicia lifecycle/billing reconciliation. `server-core` registra SSE `/events` con estado Map por proceso (`server-core.js:L189-L230@H`); no atribuir a SSE sincronización multiproceso de auth. 

**Telegram:** en alta/verificación, el bridge de core invoca `ensureUserStorage` para crear/asegurar vault privado; el coordinador registra idempotencia en SQL antes de declarar ACTIVE. Direct usa `direct-transport-control` y wrapping de sesión/membresía posterior a core (`server.js:L131-L140@H`, `:316-L324@H`). El código declara que `001BeatGaler` es solo manager, sin polling de bot de servicio (`server-core.js:L67-L74@H`, `:1400-L1402@H`). No se comprobó ni se presume una conexión real a Telegram. No proponer eliminar bridge/Direct por el nombre legacy.

## 7. Pruebas escritas y huecos (ninguna ejecutada aquí)

| Evidencia escrita | Qué intenta cubrir | Lo que NO certifica este diagnóstico |
|---|---|---|
| `cloud-server/tests/session-security.test.cjs:L78-L109,L167-L202,L220-L278@H` | cookie/CSRF, rotación/restart y revocación con PG simulado | navegador real, cookies cross-origin, balanceador |
| `cloud-server/tests/auth-public-registration-hardening.test.cjs:L55-L170@H` | login/email normalizados, unicidad Google/X, stable IDs | callback/poll con N procesos y proveedor real |
| `cloud-server/tests/provider-identity-authority.test.cjs@H` y `auth-identity-postgres.integration.cjs:L52-L134@H` | PG claim X concurrencia, email verificado e identidad | resultado actual de run CI ni login X productivo |
| `cloud-server/tests/postgres-auth-multiprocess-compat.test.cjs:L50-L135@H` | delta, evitar deletes ajenos, vault update | conflicto simultáneo del blob `runtime_compat_state` |
| `cloud-server/tests/control-plane-json-compat.test.cjs:L14-L66@H` | fs virtual y barrera `send` con stubs | recuperación operacional de cola poisoned |
| `cloud-server/tests/signup-activation-postgres.integration.cjs:L202-L276@H` | PG y fallos inyectados del provisioning simulado con ledger | Telegram/SES reales ni trabajo ejecutado aquí |
| `cloud-server/tests/staged-email-change.test.cjs:L270-L398@H` | token, transacción SQL simulada, aviso antiguo/retry | todos los workers reales o invariantes del edge/CSRF |
| `cloud-server/tests/account-lifecycle.test.cjs:L110-L250@H` | reset, recuperación, revoke, export/delete | consistencia de archivos auxiliares entre N procesos |
| `cloud-server/tests/server-core-auth-bridge-loader.test.cjs@H` | invariantes del source patch | ausencia de otros efectos globales no cubiertos |
| `.github/workflows/auth-public-registration-hardening.yml:L30-L117@H` | sintaxis, suite auth enfocada e integraciones PG en CI configurado | no se consultó un run ni se afirma PASS |
| `.github/workflows/d6-cross-process-authz.yml:L1-L52@H` | workflow de claim coordinación PG y regresión containment | no se ejecutó; workflow_dispatch no demuestra corrida |
| `tests/component-dom/webCsrfFetchCoordinator.test.ts`, `webSessionBootstrap.test.ts`, `tests/e2e-web/v1-public-auth-access.e2e.mjs` @H | contratos de cliente y E2E escritos | no se verificó comportamiento vivo |

**Huecos concretos antes de tocar seguridad:** A) prueba HTTP que monte el arranque completo y pruebe `req.body` de rutas dinámicas que se insertan antes de `app.use(express.json)`; B) callback/poll OAuth tras balanceo a otro proceso y restart; C) carrera entre 2 procesos sobre `runtime_compat_state.payload` y sus Maps; D) reauth y recovery/alias de sesión en procesos diferentes; E) flush error con Maps alterados y cola poisoned; F) tests `logout/password change/email change` con revocación de capacidades fallida y en éxito, sin ACK prematuro; G) CI existente asociado al mismo SHA y entornos sin secretos si se va a autorizar implementación. Clasificación de anomalías A-G: `HIPÓTESIS`/huecos de evidencia; no bugs confirmados.

## 8. Limpieza candidata, prohibiciones y prioridades

| Orden | Candidato de simplificación (NO implementar ahora) | Riesgo que obliga a preservar controles / precondición |
|---:|---|---|
| **P0 — datos/sesiones** | Sustituir `runtime_compat_state` de snapshot entero por operaciones de instalación atómicas por clave; mover estados auxiliares que autentican/revocan a autoridad compartida. | Probar carrera multiproceso, idempotencia y rollback/export; no quitar claim PG ni revocación |
| **P0 — autenticación** | Unificar reauth/reset/MFA/email en servicio de cuenta con transacciones y dominio claro; consolidar `password_overrides`. | Mantener last-signin-method, email verificado, TOTP/recovery, bloqueo de credencial sin reauth, 2FA, consume-once, tombstones |
| **P0 — montaje HTTP** | Reemplazar `express.application.post/get/use` por un AuthRouter explícito con middleware ordenado; registrar parsers ANTES de routes y probar cuerpo. | Congelar grafo actual y tests por ruta (incluye cabeceras, cookie/CSRF, abuse PG+Map, instalación, capability revoke, sanitized errors) |
| **P1 — persistencia** | Migrar `fs` virtual auth/cloud a repositorios PG tipados, reducir JSON transicional y `buildLegacyRows`. | Mantener `flush before ACK`, secrets cifrados, cuarentena de vaults, snapshot cutover, rutas rollback y NO doble escritura silenciosa |
| **P1 — OAuth** | Cambiar `globalThis.fetch` interceptado por cliente proveedor inyectado con PG authority explícita; persistir/correlacionar flujo OAuth si hay múltiples workers. | Debe conservar state/PKCE, identidad Google email_verified, claim subject y X handle bajo lock, prevención link hijack y sanitización |
| **P1 — bridge** | Extraer API estable del core en módulo real exportado y eliminar `require.extensions`/mod._compile solo tras preservar invariantes. | Source patch actual corrige serialización por ID y login email-only; registrar primero tests de igualdad y no bypass |
| **P2 — respuesta** | Reducir cadenas `res.json` a serializador único y respuesta transaccional por caso de uso. | No enviar 2xx antes de commit ni perder cookies/CSRF/rotación/limpieza cache-control; conservar 503 seguro de flush |
| **P2 — wrappers legacy** | Aislar handlers legacy de `server-core`, dejar 410 como router declarativo, desacoplar legacy de transport. | No borrar cerco 410, ni `http-containment`, ni `direct-transport-control`, ni compatibilidad compartida hasta medir todos los callers |

**Qué NO borrar ni etiquetar muerto:** `session-security`, guard CSRF, `http-containment` ownership, `auth-durable-abuse-controls`, `sensitive-auth-capability-revocation`, `provider-identity-authority`, `pending-signup-*`, `signup-activation-coordinator`, `control-plane-json-compat` **mientras core dependa de fs**, `postgres-auth-multiprocess-compat`, `catalog/flush-quarantine`, `legacy-import-executor` usado para deltas, `server-core-auth-bridge-loader` antes de extraer API equivalente, `legacy-media-upload-disable` antes de conservar 410, ni funciones Direct compartidas. Ningún control se puede desactivar solo por reducir líneas. `VERIFICADO_EN_CÓDIGO` en callers ya citados.

## 9. Riesgos de datos, preguntas falsables y límite de suficiencia

1. **HIPÓTESIS P0 — body parser prematuro:** `server-core.js:L129-L132@H` registra primer POST Polar antes de global `express.json`; `pending-signup-boundary.js:L284-L299@H` sí tiene parser propio porque anticipa esta situación; las rutas lifecycle/staged/session se inyectan antes del parser, pero no todas muestran parser específico. **Falsar con prueba de montaje HTTP integral** de reset/reauth/email/gestión sesiones y comprobar `req.body`, no con grep aislado. No declarar fallo funcional hoy.
2. **HIPÓTESIS P0 — sobreescritura en compat JSONB:** `postgres-control-plane-runtime.js:L245-L253@H` escribe todo el payload con UPSERT; `postgres-auth-multiprocess-compat.js:L56-L169@H` solo especializa auth, no el cloud payload. **Falsar** con dos procesos que actualicen instalaciones diferentes y comprobar conservación de ambas sin depender del orden de flush.
3. **HIPÓTESIS P0 — continuidad auth tras fallo flush:** `control-plane-json-compat.js:L67-L82,L93-L118@H`, `postgres-control-plane-runtime.js:L280-L311@H` avanzan estado virtual, encolan y pueden poison runtime. **Falsar** con fallo SQL justo después de mutación local, reintento/restart y auditoría de 2xx/503/real estado SQL.
4. **HIPÓTESIS P0 — estado OAuth no compartido:** `server-core.js:L156-L157,L1093-L1224@H` y `auth-public-registration-hardening.js:L172-L197@H` utilizan Maps; el router no obliga a same-process callback/poll. **Falsar** con start en A, callback en B, poll en C; no asumir balanceador/productivo.
5. **HIPÓTESIS P1 — alias y recovery distribuidos:** `session-security.js:L164-L169,L265-L281,L380-L407@H` mantiene aliases rotados locales; lifecycle JSON guarda reauth/recovery. **Falsar** con sesiones entre dos workers, reinicio y rotación; asegurar seguridad y UX sin downgrade.
6. **VERIFICADO_EN_CÓDIGO P0 — corte legacy sensible:** `sensitive-auth-containment.js:L53-L58,L136-L150@H` bloquea email inline; `legacy-media-upload-disable.js:L3-L21@H` bloquea subida HTTP; son **defensas existentes**.
7. **INCIERTO operacional:** faltan valores no secretos de flags efectivos, número de procesos, afinidad de tráfico, ubicación/compartición de state-dir, versión exacta de CI ejecutada y comportamiento real de Google/X, SES, PostgreSQL/Telegram. No inferir desde código ni panorama que tales condiciones estén activas o sanas.

### Dictamen

**COMPRENSION_SUFFICIENTE_PARA_PLAN** — Existe un mapa estático de arranque, capas de interceptación por familia de ruta, autoridad por dato, SQL/outbox/bridge y fallos con evidencia `archivo:línea@HEAD` suficiente **para redactar un plan de reducción de complejidad con guardas de aceptación**. **NO significa aprobación para implementar, eliminar monkey-patching/JSON o afirmar seguridad funcional.** Antes de ejecutar cualquier fase de ese futuro plan faltan específicamente: prueba de montaje completo/parser; ensayos cross-process de OAuth, sesiones, `runtime_compat_state` y estados JSON; fallos de flush/restart/revocación; evidencia CI del mismo SHA; y confirmar topología/flags sin secretos. Hasta esas falsaciones, cualquier decisión de eliminación de protección permanece `PENDIENTE` como acción.
