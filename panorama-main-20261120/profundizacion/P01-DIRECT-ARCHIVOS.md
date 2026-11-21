# P01 — Circuito Direct B y ciclo de vida de los archivos de BeatGaler V1

**Tipo:** diagnóstico de solo lectura; NEW chat · ALTA · 20 de noviembre de 2026.
**Código único estudiado:** magosouljah/BeatGaler, rama main, HEAD inmovilizado en **ad8f8d0436bba5c3f663a301440ebf977200d953**. La rama main no tuvo delta respecto al SHA de PANORAMA. Referencias abreviadas @ad8f8d0 equivalen a ese SHA completo.
**Contexto previo:** magosouljah/beatgaler-arq/panorama-main-20261120/PANORAMA.md y secciones pertinentes de INVENTARIO-C0.md; documentación LIVE leída solo para contrastar evidencia, no como sustituto de código.
**Restricciones:** sin ejecutar pruebas, CI, procesos, navegador, AWS, PostgreSQL ni Telegram; sin abrir secretos, sin alterar BeatGaler o producción. Única escritura: este documento nuevo en beatgaler-arq.
**Etiquetas epistemológicas:** VERIFICADO_EN_CÓDIGO = ruta/condición comprobada en main fijado; VERIFICADO_EN_FUNCIONAMIENTO = evidencia externa existente, nombrada y limitada; HIPÓTESIS = carrera/fallo o condición aún sin prueba de funcionamiento. Los estados ACTIVO/LEGACY/COMPARTIDO/INCIERTO caracterizan la dependencia del circuito *en el código*, no prueban el despliegue exacto del SHA main.

## 0. Dictamen ejecutivo

**Conclusión técnica:** PostgreSQL es autoridad de catálogo, estados y referencias, **NO custodio de bytes**. Los blobs MASTER (MP3 preparado), WAV, ARTWORK, PROJECT y documentos MAIN se transfieren entre el navegador y Telegram por Direct B. Cloud coordina acceso, sesión temporal, identidades de envío, recibos candidatos y verificación de metadatos; el worker separado cierra la operación SQL solo después de verificación del proveedor. La lectura de bytes también es Direct B; MSE/Blob, cachés y MAIN aceleran acceso, **no respaldan** la biblioteca. El SQL backup captura referencias y metadatos, **no copia los archivos de Telegram**. [VERIFICADO_EN_CÓDIGO: catalog/routes.js:12-14@ad8f8d0; catalog/media.js:1-8@ad8f8d0; catalog/backup.js:117-123@ad8f8d0]

**Invariante principal:** ningún cambio de limpieza puede romper la cadena *file_id SQL vigente → parts/locations KNOWN/PRESENT → chat_id y message_id → bot asignado + membresía Telegram → sesión temporal Direct B → lectura íntegra*. Tampoco puede eliminar la segunda cadena *operación + random_id persistido → ticket → intento → receipt → gateway verify → worker fenced → COMMITTED* ni la de *trash → tombstone/manifiesto → journal durable → borrado con prueba de ausencia*. Hasta verificar respaldo independiente de bytes y recuperación, se prohíbe considerar el purge físico o la eliminación de referencias como simplificaciones inocuas.

**Desacople LIVE:** CIERRE-LIVE-2026-11-20.md:13-23@ad8f8d0 registra **2 imports COMMITTED, 4 partes VERIFIED, 2 beats ACTIVE**, con evidencia de propietario/SQL/worker; esto acredita esa secuencia concreta [VERIFICADO_EN_FUNCIONAMIENTO según el registro, no reejecutado]. El mismo documento marca **reproducción/descarga posterior al corte NO PROBADA, G2 NOT_PROVEN, T25 PENDIENTE**. PENDIENTES-POST-LIVE-2026-11-20.md:42-60@ad8f8d0 registra incidente posterior: control de sesión Direct devuelve 500 tras fallos de obtención de managed bot token; intento de parche de HTTP revertido; no se acredita solución E2E. La documentación identifica releases de producción distintos del SHA fijado (CIERRE-LIVE:28-35): **no se presupone identidad byte a byte entre main y despliegue**.

## 1. Plano integral: actores, propiedad y objetos

| Objeto | Propietario autoritativo / ámbito | Contenido, confirmación y caducidad |
|---|---|---|
| Archivo local elegido | Usuario/navegador; File/Blob | No se copia a Cloud. Importación WAV prepara MASTER MP3 además del WAV, ID3 de MP3 se elimina antes de transportar; PROJECT puede empaquetarse. ImportPlan:9-22, FilePrep:10-17, Mutations:206-212@ad8f8d0. |
| SHA-256 y tamaño declarados | Navegador calcula; Cloud guarda la declaración | Hash por trozos de 4 MiB; al enviar verifica tamaño contra ticket. Es *declaración inicial*, no constatación remota. Transfer:165-169,250-258@ad8f8d0. |
| Intent, idempotency key y reserva | PostgreSQL: catalog_transfer_operations / catalog_reservations | Idempotencia por (usuario, key, hash de solicitud), mismatch 409; quota slot HELD; vence 15 min con renovaciones hasta 24 h; reemplazo staged mantiene versión anterior activa. Operations:171-245,503-545; migration/0030:7-35,99-116@ad8f8d0. |
| Identidad de cada parte lógica | PostgreSQL: catalog_operation_parts | (user, operation, partKey, slot, sender, chat, random_id, declared bytes/hash), random_id único por remitente, creado **antes** de enviar. No confundir con los segmentos de uploadFile MTProto de 512 KiB. Operations:195-245; migration/0030:64-97@ad8f8d0. |
| Ticket de envío / intento | Cloud: catalog/direct.js + catalog_transfer_capabilities SQL | Ticket de ~30 min: attempt, randomId, caption, chatId, botId, size, filename; persiste REDEEMED y DISPATCHED antes de entregar identidad. capability_hash es control interno SQL; **no equivale a token permanente Telegram**. Direct:30,149-184; migration/0031:8-32@ad8f8d0. |
| Credencial permanente del bot | **Solo servidor**, pool/managed token cache de direct-transport-control | catalogBotCredential solo servidor; gateway GramJS abre bot bajo demanda; jamás exponer bot_token o telegram_api_hash en respuesta. Direct-transport-control:386-423; catalog-gateway-runtime:124-157; productive-temp-auth-boundary:328-375@ad8f8d0. |
| Clave temporal del navegador | Navegador genera temp auth; servidor firma/vincula al bot autorizado | Bootstrap/bind por POST /catalog/v1/direct/session; máximo 15 min, margen de renovación; no se trata de lease SQL de operación. Session:280-318,342-385; Direct:82-105; Controller:154-209; DirectPort:54-74@ad8f8d0. |
| Segmentos temporales de envío | mtcute Worker del navegador + Telegram upload | Para >=10 MiB usa fileId temporal, slices 512 KiB y Set de partes confirmadas (en memoria del Worker, no backup durable); envío final sendMedia con randomId; solo sendMedia crea mensaje. Core:84-131,136-171; webTransport.worker:3300-3384@ad8f8d0. |
| Bytes persistentes y message_id | **Telegram**, chat privado del vault | Cada mensaje/documento posee sus bytes; message_id y document_id son referencias, no copia; el bot del chat debe seguir autorizado. Gateway verifica metadata; no hace checksum remoto completo. Gateway:175-205, catalog/media.js:67-87@ad8f8d0. |
| Receipt candidato | Navegador aporta messageId/documentId/size/sender/chat; SQL conserva receipt_json/hash | PUT direct-receipt idempotente; estado CLIENT no autoriza ACTIVE. Direct:211-225; Operations:283-324@ad8f8d0. |
| Verificación del mensaje | Gateway servidor mediante bot asignado, lectura de *metadatos* Telegram | GetMessages compara chat/remitente/caption/tamaño e identidad; sha256 remoto null; workers registran nivel PROVIDER. Gateway:116-139,175-205; Worker:60-74; Operations:327-358@ad8f8d0. |
| Job + lease + checkpoint | PostgreSQL: catalog_jobs | lease_owner, lease_generation creciente, lease_until, SKIP LOCKED; IO Telegram fuera de transacción; resultado tardío del lease viejo rechazado. Worker:14-21,151-200; Operations:560-623; migration/0030:118-157@ad8f8d0. |
| ACTIVE y referencias | PostgreSQL: beats, file_versions, current_files, media_objects, file_parts, part_locations | Commit idempotente instala ACTIVE/VERIFIED/PRESENT/KNOWN, relación tg:chat:message, revisión/eventos y cuota en transacción única. Reemplazo retira anterior con retención; no borra bytes de inmediato. Operations:361-475@ad8f8d0. |
| Media access y BYTES | SQL autoriza según usuario/epoch/ACTIVE/current/VERIFIED/PRESENT; navegador lee | El descriptor devuelve partes + chat/message, sin bytes. Browser compara SHA leído y puede informar BYTES. La atestación es **del cliente**; no una relectura independiente servidor. Media:50-120; MediaClient:99-169@ad8f8d0. |
| Playback lease / URL | MediaClient en navegador (Object URL/refcount y/o MediaSource) | Reproducción MSE MP3 1 parte con prefijo/stream; fallback Blob. Lease de audio NO es lease SQL worker/Direct; release puede abortar stream y revocar URL. MediaClient:172-230; PlaybackSession:71-93,216-222@ad8f8d0. |
| Prefijo/M A I N | Browser IndexedDB (128 KiB) y Telegram doc MAIN; SQL manifiesto | MAIN BGPACK01 contiene solo prefijos, no canciones completas; reconstrucción opcional con umbral 5, CAS; un MAIN fallido no bloquea reproducción. MainPack:1-9,39-94,101-171; prefix-packs:1-23@ad8f8d0. |
| Trash/purge | SQL estado + manifiesto; Telegram retiene bytes hasta delete probado | TRASH oculta lecturas nuevas, restaura; PURGED SQL crea tombstone y manifiesto **antes** de potencial delete físico; borrado exige journal/hold/gateway/probe. Commands:269-318; Purge:1-21,246-289,338-424@ad8f8d0. |
| Backup | SQL dump/manifiesto (S3 en LIVE), Telegram por separado | Backup code declara cobertura POSTGRES_METADATA_ONLY; recovery necesita reencontrar o recuperar bytes por proveedor/otra copia. Backup:92-123,223-268; CIERRE-LIVE:56-68@ad8f8d0. |

## 2. Sistemas y submódulos — clasificación y consumidores

El estado ACTIVO significa llamado/montado desde el camino nativo de main cuando se cumplen flags/capacidades; no presupone que un flag opcional esté activado en producción.

| Sistema / archivo | Estado | Entrypoint, consumidores, dependencia dinámica crítica |
|---|---|---|
| catalogFilePrep.ts / catalogImportPlan.ts | ACTIVO | UI/importador → prepareCatalogFiles/resolveImportPlan → strip ID3, archivador PROJECT, MP3 de WAV. FilePrep:7-17; ImportPlan:9-22@ad8f8d0. |
| catalogMutations.ts | ACTIVO | useCatalogGalleryScope / reemplazos audio, portada, proyecto → importBeat/replaceBeat, createOperation/transfer.commit; localStorage refs + reconciliación de arranque. Mutations:108-124,191-276; Scope:481-494@ad8f8d0. |
| catalogTransfer.ts | ACTIVO | Mutations → describePart SHA → HTTP JSON y DirectPort; retries/receipt/commit. Transfer:179-340@ad8f8d0. |
| catalogDirectTypes.ts / catalogDirectCore.ts | ACTIVO | Contratos y clasificación; DirectCore consumido **dentro del Web Worker** para subir y enviar. Core:1-10,33-49,136-171@ad8f8d0. |
| catalogDirectPort.ts | ACTIVO | Lazy-load desde LibraryProvider; controla sesión y lee/envía a WebTransportWorkerClient, no usa lease de operaciones legacy. Provider:67-86; DirectPort:54-74,119-209@ad8f8d0. |
| webTransport.worker.ts | COMPARTIDO | Comandos nativos catalog_send/catalog_read junto con get_index/replace_index/upload/download antiguos; usa mtcute + uploadResumable; borrar entero rompería archivos nuevos. Worker:3300-3440@ad8f8d0. |
| webTransportWorkerClient.ts | COMPARTIDO | Instancia Worker, RPC pending, timeouts/abort/shutdown; runtime de Direct y antiguos consumidores. WorkerClient:123-165,324-399,711-766@ad8f8d0. |
| webTransportController.ts / webTransportSession.ts | COMPARTIDO | reserve→bind→initialize→verify peer→heartbeat/refresh, fencing de generación y cierre; el adaptador del catálogo desactiva los operation leases legacy. Controller:109-209,266-353,495-513; Session:184-226,280-318,342-385@ad8f8d0. |
| catalogMediaClient.ts / catalogStreamSource.ts | ACTIVO | Playback, Artwork, Downloads → access grants → Direct read, SHA→MSE o Blob, hash final, confirmBytes. MediaClient:99-169,203-230; Provider:140-150@ad8f8d0. |
| catalogPrefixCache.ts / catalogArtworkCache.ts | ACTIVO condicional | IndexedDB caches acotadas, no autoridad ni respaldo; invalidación cuenta/hash/version. PrefixCache:1-10 y 40-151; Provider:94-103@ad8f8d0. |
| catalogMainPack.ts / cloud catalog/prefix-packs.js | ACTIVO **opcional** / activación LIVE INCIERTA | Provider crea coordinator si capability.prefixPacks; Cloud monta flag PREFIX_PACKS; manifest, begin, Direct send, publish CAS. Provider:104-116; server.js:129-130; MainPack:101-171; PrefixPacks:131-209@ad8f8d0. |
| catalogPlaybackSession.ts | ACTIVO | Provider/playbar → resolve file y source, onAuthoritativeEvent, refcount/teardown; no altera registros SQL de archivos. Playback:62-93,210-229@ad8f8d0. |
| catalogDownloads.ts / catalogTrashSource.ts | ACTIVO | Modal Download → media.downloadFile y MP3 ID3 nuevo; Settings Trash → RESTORE / PURGE / polling. Downloads:6-56; TrashSource:25-53@ad8f8d0. |
| cloud-server/catalog/routes.js | ACTIVO | server-core monta router; auth por usuario, JSON y cabeceras era/epoch; no rutas de bytes nativas. Routes:48-65,121-168,172-208; server-core:130-135@ad8f8d0. |
| catalog/direct.js / operations.js | ACTIVO | direct/session, ticket, send-report, receipt → TX SQL y jobs; operations reserva/verifica/commit/cancel. Direct:82-105,149-225; Operations:171-245,283-475@ad8f8d0. |
| catalog/worker.js / cloud-server/catalog-worker.js | ACTIVO **separado y necesario** | Runner process flag → claim jobs, gateway verify/reconcile/commit/purge; parar proceso no borra jobs, pero impide ACTIVE nuevo. Catalog-worker:19-54; Worker:60-108,151-206@ad8f8d0. |
| catalog-gateway-runtime.js / catalog/transport-gateway.js | ACTIVO | GramJS bots perezosos en server, ruta chat→bot SQL, verify/search/delete/probe; gateway de producción expone **solo** métodos de metadatos/borrado, no envío de bytes. GatewayRuntime:44-115,124-158; Gateway:14-48,175-229@ad8f8d0. |
| direct-transport-control.js / productive-temp-auth-boundary.js | COMPARTIDO | Managed token y Bot MASTER para membresía/provisioning; Direct de catálogo llama catalogDirectSession; boundary elimina token/hash permanentes antes de HTTP. Server.js:131-140,291; DirectControl:386-450,688-728; Boundary:328-375@ad8f8d0. |
| direct-vault-assignment.js / catalog/native-transport-provisioning.js | ACTIVO | SQL persistente vaults.transport_bot_id, lock advisory por vault, invitación/validación MASTER y bot antes de abrir sesiones u operaciones. Assignment:168-220; Provisioner:21-60; Routes:130-135,179-184@ad8f8d0. |
| catalog/commands.js | ACTIVO | Trash/restore versionadas + eventos, retención TRASH 14 días, sin delete Telegram. Commands:26,269-325@ad8f8d0. |
| catalog/purge.js / catalog-deletion-journal.js | ACTIVO lógico; físico **INCIERTO / apagado según LIVE** | requestPurge/worker→ SQL PURGED + objetos pendientes; cleanup con journal fsync+probe si flags permiten. Purge:1-21,206-289,338-475; server.js:124-125; CIERRE-LIVE:93-94@ad8f8d0. |
| catalog/backup.js / migraciones 0026–0042 | ACTIVO como contrato de protección SQL; ejecución exacta S3 no equiparada | snapshot tablas, manifest metadata-only, restore HELD y reconciliación contra Telegram; reglas SQL/refs/jobs. Backup:117-123,151-218,223-293; migration/0030:7-157@ad8f8d0. |
| Métodos INDEX/legacy de worker y upload en server-core | LEGACY en autoridad de catálogo, **COMPARTIDO en infraestructura** | Ya no decide el catálogo nativo; persisten implementaciones y algunos importadores compartidos. server.js:145-147; Worker:3387-3440; server-core:135-144@ad8f8d0. No inferir que toda dependencia es eliminable. |
| catalogLabDirectPort / fixtures de pruebas | LEGACY de producción / ACTIVO solo DEV | Provider hace import dinámico del puerto LAB exclusivamente con import.meta.env.DEV; no es la vía productiva. Provider:72-78@ad8f8d0. |

**Mapa de consumidores directos y dinámicos, sin leer el histórico completo:**

    CatalogAppShell → useCatalogGalleryScope / drawer / drop routing
      → catalogImportPlan → catalogFilePrep → catalogMutations
      → catalogTransfer ↔ catalogDirectTypes (lazy)
        → catalogDirectPort → webTransportController
          → webTransportSession (temp auth/control HTTP)
          → webTransportWorkerClient → webTransport.worker → mtcute
            → catalogDirectCore(uploadResumable → uploadFileParts → sendMedia)
      → CatalogMediaClient → DirectPort.read → Worker.catalog_read
      → CatalogPlaybackSession → MSE/Blob → Playbar
      → catalogDownloads; catalogTrashSource
      → catalogPrefixCache / catalogArtworkCache / MAIN coordinator

    server.js → configuración de authority, operations, direct, gateway,
                provisioner, purge, media, prefix-packs
      → server-core.js → catalog/routes.js → HTTP metadata SQL
      → direct-transport-control → bot token administrado / MASTER membership
      → productive-temp-auth-boundary → bloque vinculación sin secretos
    catalog-worker.js (proceso aparte)
      → catalog/worker.js → operations SQL + catalog-gateway-runtime
      → GramJS bot de vault (GetMessages/Search/Delete/Probe)
      → catalog/purge.js + journal externo

**Dependencias dinámicas difíciles de ver con imports:** feature flags de Catalog native, Direct, Gateway, PrefixPacks y Worker; capability enviada en /context; import() lazy de DirectPort; Worker URL construido en tiempo de ejecución; singletons configureCatalog* cargados en server.js y consumidos por server-core; sesiones bot del gateway abiertas perezosamente; llamada de credencial managed token vía Telegram; lock SQL de asignación que invoca MASTER para membresía. Una limpieza basada solo en imports estáticos perdería relaciones funcionales.

## 3. Diagrama de camino feliz, identidad y confirmaciones

    USUARIO / NAVEGADOR
      File original MP3 o WAV + portada + proyecto
         ↓ ImportPlan: MP3 obligatorio; WAV→MASTER MP3 si aplica
         ↓ FilePrep: strip ID3 + empaquetado PROJECT si aplica
         ↓ describePart: SHA-256 y size sobre blobs preparados
      POST /catalog/v1/operations {kind:IMPORT/REPLACE, parts, metadata}
         + Idempotency-Key + X-Catalog-Era/Epoch
         ↓
    CLOUD + POSTGRES [transacción]
      valida tenant, plan/cuota, bot, gen, version, nombres
      reserva HELD; PREPARED; partes PENDING
      persiste sender/chat/random_id único POR parte antes de efectos
         ↓ respuesta operation_id/beat_id
      POST /operations/:op/parts/:part/send-ticket
         ↓ cap REDEEMED, intento, DISPATCHED antes de entregar ticket
      ticket {botId,chatId,randomId,caption,size,...}
         ↓
    NAVEGADOR (temp auth bot; no token permanente)
      uploadFile simple o resumable 512KiB (no crea mensajes)
      Telegram sendMedia(chat del vault, randomId, caption)
         ↓ TELEGRAM guarda documento y emite message_id
      PUT /operations/:op/parts/:part/direct-receipt
         ↓ Cloud guarda CLIENT receipt candidato + job TRANSFER_VERIFY
         ↓
    WORKER INDEPENDIENTE
      reclama lease SQL; GetMessages por bot del vault; valida metadatos
      checkpoint fenced: VERIFIED (nivel PROVIDER; hash remoto no probado)
      si todas VERIFIED → READY → job TRANSFER_COMMIT
         ↓ transacción SQL COMMIT (cuota/version/epoch)
      beat ACTIVE + file VERIFIED + objeto PRESENT
      + part/location KNOWN, revisión y evento
         ↓
    NAVEGADOR: GET /beats/:id/files o resolveFile
      POST /files/:fileId/access (ACTIVE/current/epoch/etc)
      recibe partes/chat/message autorizados
      Direct B catalog_read desde Telegram → bytes + SHA/size
         ├→ reproductor MSE MP3 1 parte, prefijo cache→rangos; si no Blob
         ├→ portada cache original
         └→ Download MP3/WAV/PROJECT; opcional nueva etiqueta ID3 al MP3
      POST /files/:fileId/parts/:idx/bytes atestiguación cliente (informativa)

REFERENCIAS: Mutations:206-262; Transfer:225-331; Direct:151-225; Operations:195-245,283-475; Worker:60-84; Media:50-120; MediaClient:143-229; Downloads:37-56@ad8f8d0.

**Distinción crítica:** un solo archivo lógico actual suele ser una parte de catálogo, aunque se suba a Telegram en cientos de fragmentos temporales de 512 KiB. Los fragmentos MTProto no son filas independientes de catalog_file_parts ni se restauran desde respaldo SQL. Se compromete la identidad de documento Telegram al final, no por cada fragmento. Core:89-131,136-171@ad8f8d0.

## 4. Diagrama de fallos, reintento, worker y lease

    A. Falla ANTES de sendMedia (uploadFile / FLOOD explícito)
       → DirectCore UPLOAD_FAILED o REJECTED sin efecto de mensaje
       → POST send-report → cap FAILED
       → nuevo send-ticket MISMO random_id, espera Retry-After
       → máximo 5 intentos del frontend; sin duplicación intencional

    B. sendMedia inició y se pierde respuesta / Worker/browser muere
       → UNCERTAIN o ticket previo REDEEMED sin informe
       → NO reenviar; siguiente ticket = 409 PART_UNCERTAIN
       → catalog_jobs TRANSFER_RECONCILE
       → Search Telegram por caption/sender/size (NO lookup real de random_id)
           0 coincidencias → reintento de consulta, NO prueba ausencia
           >1 → BLOCKED AMBIGUOUS
           1 → gateway SIN proveUniqueMatch → BLOCKED REVIEW_REQUIRED
       → el sistema preserva bytes potenciales y operación pendiente
       → requiere revisión manual con prueba adicional; no inventar adopción

    C. Recibo persistido / worker ausente o caído
       → RECEIPT + job QUEUED sobreviven en SQL
       → al volver worker, reclaim lease y verify/commit
       → lease viejo con generation inferior no confirma
       → error transitorio backoff; 8 reintentos = BLOCKED, no PASS

    D. POST commit/respuesta perdida
       → commit idempotente y GET operation
       → frontend observa máximo 10 min, TIMEOUT significa desconocido
       → no repetir sendMedia; revisar SQL y jobs

    E. Cancelación
       sin despacho → CANCELED y libera reserva
       con despacho/posible bytes → RECONCILE y conserva holds/refs
       logout/teardown → termina worker cliente, pero NO revoca temp auth
                           del servidor instantáneamente; vence ≤15 min

    F. Trash/restore/purge
       ACTIVE → TRASH: SQL no borra Telegram; nuevo access 403
       TRASH → ACTIVE: versión vigente, sin recarga de bytes
       TRASH → PURGED: tombstone + manifiesto SQL atómico
       CLEANUP habilitado solamente después de journal fsync/verificación
       → delete Telegram → probeAbsence MessageEmpty correcto
       → si timeout: UNCERTAIN y consultar, NUNCA borrar dos veces a ciegas

**Fuentes:** Transfer:237-331; Direct:151-225; Worker:60-108,151-200; Operations:478-545,560-623; DirectCore:33-49,103-131; Purge:338-424; Routes:179-186@ad8f8d0.

### Riesgos y matices de recuperación

1. **[VERIFICADO_EN_CÓDIGO] Reconciliación estricta, no autorecuperación total.** gateway.searchByRandomId realmente busca por marcador con límite 20: una coincidencia no es prueba exhaustiva y runtime no implementa proveUniqueMatch. Worker bloquea la adopción automática (RECONCILE_REVIEW_REQUIRED). Debe existir procedimiento de operador para resolver y proteger objetos sin referencia. Transport-gateway:24-37,195-205; Runtime:113-115; Worker:87-106@ad8f8d0.
2. **[VERIFICADO_EN_CÓDIGO] Recibo ≠ hash remoto.** verifyMessage devuelve sha256:null, verifica mensaje/tamaño/remitente/marcador. El nivel BYTES aparece al leer y comparar SHA desde navegador. Una transferencia puede llegar ACTIVE solo con evidencia PROVIDER, no una relectura integral de los bytes. Gateway:175-192; Operations:327-358,361-475; Media:91-120@ad8f8d0.
3. **[VERIFICADO_EN_CÓDIGO + HIPÓTESIS operacional] Renovación de reserva no integrada en flujo normal.** CatalogTransfer exporta renewReservation pero Mutations.runTransferInner solo crea→envía cada parte→commit; no hay invocación periódica en ese camino. Si una sesión/proyecto tarda >15 min, el servidor puede impedir el commit aunque hayan llegado archivos; readmit exige nueva comprobación de cuota. Transfer:333-340; Mutations:220-244; Operations:503-545@ad8f8d0. Falta prueba de límite real; NO auto-remediar reenviando.
4. **[VERIFICADO_EN_CÓDIGO] Persistencia posrecarga parcial pero segura.** El frontend guarda operation_id en localStorage y Scope:481-494 consulta y avisa al reiniciar, **sin reanudación automática del archivo**, porque File/Blob no perdura. No decir que resolvePendingTransfers no tiene consumidor: SÍ lo tiene. Mutations:57-66,116-124; Scope:481-494@ad8f8d0.
5. **[VERIFICADO_EN_CÓDIGO; efecto runtime HIPÓTESIS] Lease de audio adquirido tarde.** PlaybackSession.loadSource obtiene await acquireSource y **después** assertGen; si teardown o una reproducción nueva cambia generation durante ese await, el lease recién adquirido podría quedar sin release porque aún no está en variable lease. Teardown solo libera lease actualmente almacenado. Inspeccionar/cubrir carrera antes de limpiar refcounts. Playback:71-93,216-222; MediaClient:208-229@ad8f8d0.
6. **[HIPÓTESIS de liveness, anclada en código] catalogSend/catalogRead del WorkerClient invocan request sin timeoutMs explícito; timeout base nullable y no siempre se aplica a estas operaciones.** Worker.onerror y shutdown sí rechazan; una promesa indefinida requiere inspección de liveness real. WorkerClient:354-384,711-747@ad8f8d0. No se declara cuelgue observado.
7. **[VERIFICADO_EN_CÓDIGO] Temp auth no es lease persistido.** El servidor transforma sesión con credencial permanente en envelope temporal; POST /direct/session/stop devuelve ok sin revocar llave, la llave expira sola. Renovación por heartbeat con margen, sustitución del cliente y verificación. Direct:84-105; Routes:179-186; DirectPort:54-74; Controller:278-353; Boundary:328-375@ad8f8d0.
8. **[VERIFICADO_EN_CÓDIGO] El actor que obtiene lease tarde está cercado en SQL, no necesariamente en UI.** Jobs usan generación creciente y checkpoints fenced; el resultado remoto de verificación de un job sin lease no puede promover estado. El fencing de Controller cubre apertura/refresh de sesión con lifecycleGeneration, pero es distinto del lease de Playback. Operations:560-623,327-358; Worker:151-200; Controller:130-176,495-513@ad8f8d0.
9. **[VERIFICADO_EN_CÓDIGO] Cache/MAIN no son copia de seguridad.** IndexedDB guarda prefijos de 128 KiB; MAIN serializa esos prefijos, no MASTER íntegros; descarga MP3 añade ID3 nueva: archivo exportado puede diferir byte a byte del blob transportado aunque el audio sea el mismo. PrefixCache:1-10; MainPack:39-52; Downloads:28-47; FilePrep:10-17@ad8f8d0.
10. **[VERIFICADO_EN_CÓDIGO] SQL PURGED no significa mensaje borrado.** Purge separa catálogo y cleanup; con cleanup disabled/restore_hold/journal sin prueba no hay delete, pero el beat ya puede desaparecer de SQL. No activar borrado físico ni retirar journal basándose en estado PURGED. Purge:1-21,246-289,338-424; CIERRE-LIVE:93-94@ad8f8d0.
11. **[VERIFICADO_EN_CÓDIGO] Access denegado solo al pedir nuevo descriptor.** SQL restringe archivos TRASH/current, pero un cliente con descriptor ya emitido (TTL 15 min) o un audio ya arrendado conserva posibilidad de uso local; el evento invalida concesiones al procesarse y el reproductor no corta audio actual por trash. Media:15-16,50-87; MediaClient:99-108,285-291; Playback:210-214@ad8f8d0. Revisar semántica antes de prometer revocación inmediata.

## 5. Contratos observados — HTTP / PostgreSQL / Telegram / eventos

### HTTP (solo JSON/metadatos nativos)

- **POST /catalog/v1/operations**: IMPORT/REPLACE requiere Idempotency-Key y X-Catalog-Era/Epoch; operaciones no duplicadas por clave, valida intent y cuota; 201 created/200 replay; 409 por mismatches/conflictos. Routes:35-45,121-140; Operations:59-106,171-245@ad8f8d0.
- **POST /catalog/v1/direct/session**: 2 fases sin tempAuthMetadata/bootstrap y con metadata/bind; auth usuario+CSRF, no Idempotency-Key de operación. **POST /direct/session/stop** solo acknowledgment. Routes:179-186; Direct:82-105; Boundary:328-375@ad8f8d0.
- **POST /operations/:op/parts/:part/send-ticket**, **POST .../send-report**, **PUT .../direct-receipt**, **GET .../attempts**; 409 PART_UNCERTAIN bloquea repetición; recibo admite replay idéntico, conflict distinto. Routes:161-168; Direct:151-233; Operations:283-324@ad8f8d0.
- **POST /operations/:op/commit** (200 o 202), **GET /operations/:op** (incluye progreso/estado), **POST .../cancel**, **POST .../reservation/renew|readmit**. Routes:141-159; Operations:361-545; Transfer:300-340@ad8f8d0.
- **GET /beats/:id/files**, **POST /files/:fileId/access**, **POST /files/:fileId/parts/:idx/bytes**. Access se niega para no vigente/no ACTIVE/no VERIFIED; devuelve direct refs, no Blob; POST bytes atestigua cliente y no debe confundirse con hash remoto. Routes:1-14,202-208; Media:50-120@ad8f8d0.
- **GET /prefix-packs/manifest**, **POST /prefix-packs/main**, **POST .../:id/publish|cancel**: coordinación de metadatos/CAS, nunca bytes. Routes:172-178; PrefixPacks:93-115,131-209@ad8f8d0.
- **POST /beats/trash|restore**, **POST /operations {kind:PURGE}**, **GET /operations/:purgeId**, **POST .../cancel** y **POST /library/restore-hold/release**. Purge 202/poll; restauración después de PURGED/tombstone se rechaza. Routes:110-111,121-151,198-200; Commands:269-325; Purge:206-245,439-473@ad8f8d0.
- **Errores:** 428 ausencia de headers, 401 auth, 403 denegado, 409 conflict/stale/uncertain, 501 módulo no montado, 503 indisponible. Router devuelve JSON estable y no 200 vacío. Routes:24-45,207-209@ad8f8d0. No se inspeccionaron secretos.

### SQL, eventos y trazabilidad durable

- catalog_transfer_operations vincula user_id, generation_id, operation_id, kind, epoch, status, quota; UNIQUE user/idempotency + request_hash. Partes con UNIQUE(sender_id, random_id); catalog_transfer_capabilities guarda intentos; reservations HELD/CONSUMED/EXPIRED; catalog_jobs claim con SKIP LOCKED + lease_generation y checkpoints fenced. migration/0030:7-157; 0031:8-32; Operations:195-245,560-623@ad8f8d0.
- Commit escribe catalog_beats, catalog_file_versions, catalog_current_files, catalog_file_parts, catalog_part_locations y catalog_media_objects; identity del objeto tg:{chat}:{message}, eventos de beat/epoch/revision. Si no se verifica todo, no ACTIVE. Operations:361-475@ad8f8d0.
- TRASH pone beat.state=TRASH, versión incrementada, trash entry y evento; RESTORE comprueba tombstone, mueve ACTIVE y emite evento; no cambia bytes. Commands:269-325@ad8f8d0.
- PURGE captura snapshot de elementos de papelera, fabrica manifiesto catalog_purge_objects en la misma transacción que el tombstone/PURGED; distingue object status PENDING/DELETING/UNCERTAIN/DELETED y bloqueos shared/retention/hold. Purge:206-289,306-337; migration/0033:7-75@ad8f8d0.
- RESTORE de SQL establece restore_hold y exige verificar journal + bytes por lector autorizado para reconciliar; sin la copia física, una referencia puede apuntar a mensaje perdido. Backup:151-218,223-293@ad8f8d0.

### Telegram y credenciales

- **Direct B**: mtcute navegador con clave temporal del bot asignado, chat exacto del vault; uploadFile/saveFilePart no crea mensaje, sendMedia con random_id int64 firmado y caption obligatorio **catalog:v1 op=... part=...** o **catalog:v1 pack=pk-...**. Devuelve messageId/documentId/size; la pérdida de respuesta no demuestra ausencia. Core:21-49,84-171; DirectPort:137-152; Gateway:14-37@ad8f8d0.
- **Gateway**: GramJS servidor con token del bot solo en memoria, selección por vaults.transport_bot_id, rechazo de quarantined/rotation_pending. Para VERIFY usa GetMessages y caption/sender/size; SEARCH usa marcador + remitente y límite, no índice random_id Telegram; DELETE exige journal externo y probeAbsence. GatewayRuntime:44-115,124-158; TransportGateway:175-229; Purge:380-423@ad8f8d0.
- **Provisioning**: asignación SQL durable y locks por vault; MASTER invita/promueve bot y se comprueba membresía. No confundir MASTER como almacén alternativo de archivos ni con MASTER MP3 (role del archivo). Assignment:168-220; NativeProvisioning:21-60; DirectControl:425-451@ad8f8d0.
- **Token managed**: getManagedBotToken con reintentos acotados (3 × 3 s por defecto) y cache por versión de credencial; incidente post-LIVE está en ese eslabón, no en una lectura de INDEX. DirectControl:687-728,743-775; PENDIENTES-POST-LIVE:42-60@ad8f8d0.

## 6. Evidencia disponible, pruebas escritas y huecos

**Código/contratos inspectados, ejecución NO realizada ahora.** Los siguientes archivos contienen casos de test y aserciones, **no se les atribuye PASS de esta inspección**:

| Prueba existente | Qué pretende verificar | No demuestra por sí misma |
|---|---|---|
| tests/component-dom/catalogDirect.test.ts:16-407@ad8f8d0 | orden upload→send, randomId, incertidumbre, recibo, lectura/grants, sesión timeout, worker perdido | Deduplicación real del proveedor bajo pérdida de respuesta |
| tests/component-dom/catalogResumable.test.ts:30-120@ad8f8d0 | 512 KiB, renovación durante transferencia y reanudación sin repetir partes | Recovery tras cierre de pestaña o expiración SQL de reserva |
| tests/component-dom/catalogTransfer.test.ts:27-80@ad8f8d0 | SHA incremental, HTTP headers, 200/202/409 | funcionamiento Telegram real |
| tests/component-dom/catalogMediaClient.test.ts:16-70; catalogPrefixStreaming.test.ts:16-95; catalogPlaybackSession.test.ts:35-117@ad8f8d0 | refcount, hash, MSE/Blob, cancelación, navegación | lease tardío entre acquireSource y teardown, audio real tras LIVE |
| tests/component-dom/catalogMainPack.test.ts:85-237; catalogAuditFixes.test.ts:16-100; catalogE82.test.tsx:14-35@ad8f8d0 | MAIN/cache, descarga/ID3, import/restore/purge | copia íntegra duradera de archivos Telegram |
| cloud-server/tests/catalog/catalog-direct.integration.cjs:98-300@ad8f8d0 | ticket→receipt→verify→commit, pérdida de respuesta, reconciliación manual, aislamiento | gate G2 real sin fakes |
| cloud-server/tests/catalog/catalog-operations.integration.cjs:67-249; catalog-worker.integration.cjs:88-345@ad8f8d0 | idempotencia/reserva/version/fencing/dos workers/crashes/carreras | confiabilidad real Telegram/managed token |
| cloud-server/tests/catalog/catalog-transport.integration.cjs:88-170; catalog-transport-gateway.test.cjs:19-150@ad8f8d0 | multiparte MASTER/WAV/ARTWORK/PROJECT, Gateway fake, validación | comparación remota del SHA completo del archivo tras subir |
| cloud-server/tests/catalog/catalog-purge.integration.cjs:116-365; catalog-purge.test.cjs:22-124@ad8f8d0 | manifiesto, journal fsync, shared refs, borrado incierto/reinicio | eliminación física segura en LIVE: flag apagado y T24 pendiente |
| cloud-server/tests/catalog/catalog-prefix-packs.integration.cjs:135-264; catalog-backup.integration.cjs:132-257@ad8f8d0 | SQL/CAS MAIN, backup/restore aislado, journal y hallazgos | backups independientes de bytes Telegram |
| cloud-server/tests/catalog/catalog-gateway-runtime.test.cjs:42-193; direct-managed-token-retry.test.cjs:79-193@ad8f8d0 | límites bot, guardas, errores y cache managed token | ausencia de la falla de bootstrap reportada tras LIVE |
| cloud-server/tests/catalog/g3-preflight.test.cjs:10-22@ad8f8d0 | bloqueos deliberados G2/preflight | prueba funcional real G3 |

**Precisión ante tests potencialmente engañosos:** algunos títulos de test dicen “1 match → adopta”, pero el **código vigente** de worker condiciona a proveUniqueMatch=true; el runtime real carece de ese método. La integración puede modelar una prueba positiva mediante fake; no usar títulos históricos para inferir adopción real. Worker:87-106; GatewayRuntime:113-115; WorkerIntegration:180-223@ad8f8d0.

**VERIFICADO_EN_FUNCIONAMIENTO (reporte externo previo, no reejecutado):** CIERRE-LIVE:15-23,35-38,49-54,85-94@ad8f8d0 reporta 2 subidas y 6 jobs completos cuando se encendió el worker, S3 metadatos y pruebas aisladas anteriores. PENDIENTES-POST-LIVE:42-60@ad8f8d0 reporta después error de managed token al abrir Direct B, sin reparación confirmada. No declarar ninguna otra ruta en estado PASS real. La secuencia de dos uploads no acredita todos los roles, lectura, restore, purga ni G2. El despliegue tiene SHA/releases propios: cotejar antes de aplicar plan a producción.

**Huecos concretos de comprobación futura (todavía NO autorizada su ejecución):**
- Examen físico lectura/reproducción MSE/Blob y descargas MP3/WAV/PROJECT tras LIVE; contrastar SHA del blob preparado y audio reconstruido y report BYTES.
- G2/E5/E8 proveedor real: unicidad de mensaje después de timeout, efecto posible, identidad bot cuando no se rotan tokens, procedimiento seguro de reconciliación de un solo candidato.
- Recuperabilidad de bytes ante pérdida de chat/bot/mensaje o restauración SQL a snapshot antiguo; copia off-provider y verificación independiente.
- Prueba de reserva expirada mientras upload largo progresa, readmit antes de commit y control de cuota concurrente.
- Carrera de lease adquirido tarde / teardown mientras media.acquireStream está pendiente; cancelación durante sendMedia y durante refresh, worker colgado sin error.
- Purge físico, journal, shared refs y restore_hold con escenario real controlado *solo cuando T24 sea aprobado*.
- Estado actual de la incidencia managed token (500), sin tocar producción bajo este diagnóstico.

## 7. Lista de dependencias que jamás deben romperse durante la limpieza

**NO ROMPER / NO BORRAR:**

1. Los bytes de Telegram de MASTER/WAV/ARTWORK/PROJECT, mensajes MAIN necesarios y sus identidades chat/message/document; nunca limpiar “huérfanos” sin prueba de que no corresponden a operaciones inciertas, versiones retenidas o generaciones restaurables.
2. La asignación persistente chat→bot + estado de membresía MASTER/bot + credenciales y binding TEMP de Direct; no asumir que LIVE/PG garantiza acceso a Telegram.
3. La separación **Direct B data plane** frente a **Gateway metadata plane**: no introducir proxy de bytes Cloud ni borrar rutas catalog_send/catalog_read al eliminar INDEX.
4. La reserva HELD y cuota; idempotency key + request_hash; sender/chat/randomId único persistido antes del efecto; intentos send-ticket/reports; caption estable; received receipt y sus hashes.
5. La regla: ningún resend tras incertidumbre, ni adopción única sin prueba exhaustiva; conservar RECONCILE y el procedimiento manual mientras gateway no pueda demostrar unicidad.
6. El **worker separado** y su claim/fencing/reintentos/reapertura; receipt/VERIFYING sin worker puede dejar Telegram lleno y SQL invisible aunque Cloud responda 200.
7. El commit transaccional: únicamente parte VERIFIED, versión/época/CAS, quota, object PRESENT, current_files, part_locations KNOWN y evento/revisión coherentes.
8. El acceso de lectura por tenant/estado/versión/epoch, hashes declarados y comprobación real al descargar/stream; conservación de todos los parts en orden.
9. Las políticas de retención: REPLACE no borra anteriores en commit; trash no borra; PURGE requiere tombstone+manifest SQL y bloqueo de refs shared/retained/opaque.
10. El journal externo **persistido y verificable antes** de deleteMessage; probeAbsence correcto y fencing de objeto; restore_hold y cleanup_enabled apagados hasta evidencia.
11. El SQL backup con referencias + journal de borrado + esquema/epochs; no afirmar restauración completa sin segunda copia de bytes de Telegram.
12. La cancelación/teardown del worker y release del lease multimedia, más el acceso al audio que ya está reproduciéndose; cubrir la carrera de lease tardío.
13. El consumidor oculto/dinámico: import() DirectPort, new Worker, configureCatalog* singletons, flags, preconnect, tokens bajo demanda y consumidor de resolvePendingTransfers al entrar a Gallery.

## 8. Candidatos a simplificar **sin ejecutar cambios** — prioridad

| Prioridad | Diagnóstico / propuesta para plan posterior | Condición de aceptación antes de tocar código |
|---|---|---|
| **P0 — pérdida irrecuperable** | Definir mecanismo y prueba de recuperación de bytes externos; SQL actual solo guarda refs. | Inventario real de objetos + copia recuperable verificada (o decisión explícita del riesgo) + restore aislado de audio/arte/proyecto; T19/G4 no sustituye esto. |
| **P0 — duplicados/objetos inciertos** | Especificar operación de revisión humana RECONCILE, ledger de huérfanos, y límites de retención. | Nunca reenviar por timeout; ruta comprobable para identificar correctamente un único mensaje; no rebajar E5 para ahorrar código. |
| **P0 — acceso roto** | Investigar incidente de managed token de /direct/session y separar error servidor vs cliente. | Evidencia ya archivada + prueba read/send real posterior en entorno autorizado; no probar ahora. |
| **P0 — destrucción irreversible** | Mantener purge físico apagado, conservar restore_hold, journal/probe/retención; limpiar solo datos lógicos cuando se confirme semántica. | T24 autorizado, journal durable y reconciliado, copia de bytes, guardas shared/retired y proofAbsence reales. |
| **P1 — fallos de disponibilidad con riesgo de atasco** | Evaluar integración de renew/readmit de reserva durante upload, timeout/abort del catalog_send, respuestas 202 atascadas y worker liveness. | Pruebas de larga duración/lease/caída/rollback del frontend; definir métricas y resoluciones manuales sin duplicate. |
| **P1 — carrera del audio** | Introducir prueba de adquisición tardía y release garantizado después de teardown/generation change. | Fixture que adquiere lease después de tearDown y verifica refcount=0, URLs revocadas, stream abortado. |
| **P2 — complejidad REAL** | Particionar comandos de catálogo de webTransport.worker separando del INDEX legacy; reducir combinaciones internas de sesión/control y imports. | Mapa completo de consumidores legacy vs catalog, tests de paridad Direct upload/read/renew/focus/cancel, prueba de bundle y runtime aislado; **no borrar Worker completo**. |
| **P2 — rutas viejas** | Analizar endpoints de bytes legacy y bootstrap INDEX aislados, retirarlos solo si no tienen consumidores productivos y no cargan utilidades usadas por Direct/MASTER/provisioning. | Evidencia de wiring de server-core, auth/teardown, flags, datos anteriores recuperables, ausencia de ruta dinámica; validar despliegue real separadamente. |
| **P3 — optimización opcional** | Podar duplicación de caches de artwork/prefix/recent y capas MAIN si mejoran simplicidad sin pérdida de función. | Capacidades y uso real comprobados; preservar fallback MSE→Blob; MAIN no es respaldo ni pieza de seguridad. |

**Qué NO declarar candidato a borrado por nombre:** catalog-worker.js, catalog/worker.js, catalog/direct.js, catalog/operations.js, catalog-gateway-runtime.js, catalog/transport-gateway.js, catalog/media.js, catalog/purge.js, direct-transport-control.js, productive-temp-auth-boundary.js, direct-vault-assignment.js, webTransport.worker.ts, webTransportWorkerClient.ts, webTransportController.ts, webTransportSession.ts ni sus tipos/consumidores. Algunas contienen funciones legacy, pero también son caminos activos/compartidos. Borrar worker legacy en bloque porque PostgreSQL está LIVE sería un error de arquitectura.

## 9. Cuestiones abiertas precisas

1. **¿Qué operación del operador adopta o descarta de forma segura RECONCILE_REVIEW_REQUIRED** si 1 match no es demostrablemente único y random_id no se consulta? ¿Cómo se audita huérfano antes de purge?
2. **¿Cómo se preservan y restauran bytes sin Telegram** (copia off-provider por cada role/version y verificación de hash)? ¿Qué pasa con un backup SQL reciente cuya referencia ya fue eliminada de Telegram?
3. ¿Cuáles de los flags native/direct/gateway/prefixPacks/worker y las versiones reales de Web/Cloud/Worker están activos **después** de la incidencia post-LIVE? No inferir desde main ni desde foto anterior.
4. ¿Cuál es el punto de control y la política UX para reservas vencidas durante un PROJECT grande? ¿Se hará readmit sin reenviar lo recibido?
5. ¿Quién maneja una subida que llega a Telegram sin receipt si el usuario cierra la pestaña y pierde el File? ¿Qué evidencia protege ese mensaje y cuánto tiempo?
6. ¿Se ha verificado físicamente lectura íntegra de los cuatro roles, y el SHA provisto por el navegador corresponde al objeto original *preparado*, no al MP3 con nuevo ID3?
7. ¿Cuál es el efecto real de un browser worker que no responde a catalog_send y no produce onerror? ¿Hay fencing/cancelación suficiente para no provocar send desconocido posterior?
8. ¿Existe test para acquireSource que resuelve después de teardown y obliga release? ¿Qué sucede con un segundo account/epoch durante la descarga?
9. ¿Qué pasos manuales formales se exigen para activar cleanup_enabled y liberar restore_hold, y dónde se almacena/replica el journal de eliminación si falla el disco?
10. ¿Qué rutas server-core legacy siguen alcanzables por otro consumidor aunque INDEX ya no gobierne Gallery y qué módulos de infraestructura comparten? Requiere P02 de limpieza, no inferencia automática.
11. ¿Existe evidencia de checksum BYTES *independiente* antes de marcar ACTIVE? No en el camino actual observado: PROVIDER compara metadatos y el lector atestigua bytes más tarde.
12. ¿Hay pruebas de rollback/restore del **último** backup post-LIVE que además prueben disponibilidad de todos los objetos Telegram? El cierre explícitamente no las incluye.

## 10. Dictamen final

**COMPRENSION_SUFFICIENTE_PARA_PLAN** — **sí** para elaborar un plan de limpieza V1 **por fases, solo después de aprobar precondiciones y sin cambios inmediatos**. El circuito de bytes, poseedores de estado, entrypoints, dependencias dinámicas, contratos, puntos de corte y protecciones de datos han quedado mapeados en main@ad8f8d0; puede separarse qué depende de SQL, qué depende de Telegram, qué es cache y qué es worker legacy compartido.

**NO SUFICIENTE para autorizar borrados, reversión, purga física o despliegue.** Antes faltan, con evidencia independiente: (a) recuperación verificable de bytes fuera de Telegram, (b) procedimiento E5 de envío incierto sin duplicados, (c) prueba actual de arranque/sesión Direct tras incidencia y playback/download E2E, (d) reconciliación de journal/restore_hold y aprobación T24, (e) test de lease tardío, renovación de reserva y worker estancado, y (f) inventario específico de consumidores legacy antes de eliminación. Ningún test fue ejecutado por este informe. **No tocar producción ni BeatGaler hasta nueva autorización.**
