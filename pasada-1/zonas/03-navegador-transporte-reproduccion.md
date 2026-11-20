# Zona 03 — Navegador: transporte de medios, subida, reproducción y descargas

**Origen:** informe de sub-agente de solo lectura, pasada 1. **Commit:** `5cb6ccc`. **Fecha:** 2026-11-11.
**Marcas:** FIRME = leído en código; PROVISIONAL = inferido. Nada se ejecutó. Rutas relativas a `E:\777\app\BeatGaler\`.

Dos correcciones al encargo:
- `src/components/UploadModal.tsx` NO sube beats: es el asistente de publicación en YouTube, solo Desktop.
- No existe Service Worker en el repo (`git ls-files` y `git grep serviceWorker` vacíos).

## Reparto navegador/servidor frente a Telegram

Conviven dos caminos completos, elegidos por el flag de build `VITE_CATALOG_API_ENABLED` (`src/features/library/catalog/catalogComposition.ts:7-23`). Por defecto está apagado, así que rige LEGACY.

**A. LEGACY (INDEX): el navegador habla con Telegram directamente. FIRME.**
- **Identidad:** el worker crea un `TelegramClient` de `@mtcute/web` como bot (`self: { isBot: true }`, `webTransport.worker.ts:1909-1937`) contra `*.web.telegram.org:443` por WebSocket.
- **Credencial:** una clave MTProto temporal de 10 min, no el `bot_token`. La genera la página (`webTempAuth.ts:190-216`, `doAuthorization`) y el servidor devuelve un `binding` (`perm_auth_key_id` + `encrypted_message`). La página ejecuta `auth.bindTempAuthKey` (`webTempAuth.ts:221-251`) y pasa clave y estado de sesión al worker.
- **Rechazo de secretos permanentes:** el cliente descarta cualquier respuesta que contenga `bot_token`, `telegram_api_hash` o `credential_envelope` (`webTransportSession.ts:229-236`).
- **Control en servidor**, todo POST desde `webTransportSession.ts`:
  - sesión: `/transport/session/start` (dos veces: reserva y bind), `/session/activate`, `/session/heartbeat`, `/session/stop`;
  - operaciones: `/operation/begin`, `/capability/authorize`, `/operation/renew`, `/operation/end`;
  - subida: `/topic/ensure`, `/quota/reserve|renew|cancel`, `/project/authorize`;
  - INDEX: `/index/publish`, `/index/commit`, `/index/bootstrap-state`, `/routing/reconcile`, `/trash/purge`.
- **El navegador hace directo:**
  - subir MASTER, WAV y ARTWORK con `sendMedia` (`worker:3268-3292`);
  - leer el INDEX con `getMessages` + `downloadAsBuffer`, con recuperación por pin e historial (`worker:2308-2506`);
  - streaming y prefetch de audio, artwork y descargas con `downloadChunk` / `downloadAsIterable` (`worker:2665-2714`, `3171-3248`).
- **El servidor hace de proxy solo en dos casos:**
  - PROJECT: XHR multipart a `/transport/project/upload` (`webTransportSession.ts:566-630`);
  - publicar el INDEX: `/transport/index/publish` (`webGalerCloudTransport.ts:250-260`).
- **La "capability" es un lease del servidor**, no algo que Telegram verifique: el worker nunca presenta el `operationId` a Telegram. La barrera local es apagar el worker si el lease no se renueva (`webTransportController.ts:409-473`).

**B. CATÁLOGO PostgreSQL: el navegador no toca Telegram. FIRME en cliente, PROVISIONAL en servidor.**
- **Subida:** `POST /catalog/v1/operations` → `POST …/parts/:partKey/capability` (token opaco de un uso) → `PUT` de bytes crudos al `uploadPath` del gateway → `POST …/commit` (`catalogTransfer.ts:225-310`). PROJECT va por `PUT …/parts/:k/project`.
- **Lectura:** `POST /catalog/v1/files/:id/access` devuelve concesiones por parte con URL; el cliente hace `GET` con `fetch` (`catalogMediaClient.ts:77-95`).
- Con el flag encendido no se precalienta el transporte LEGACY (`src/platform/webAdapter.ts:47-49`).

**Avisos aparte (sin juzgar):**
1. En LEGACY la clave temporal equivale a la identidad completa del bot durante su vigencia. La página conserva una copia en `WebTransportController.session`; el worker solo pone a cero la suya (`worker:2023`).
2. El worker expone `delete_messages` y `replace_index` (borra y fija mensajes en el vault) sin llamadores en `src/`. No hay restricción en el cliente; el aislamiento entre usuarios depende de cómo el servidor asigna bots a vaults. PROVISIONAL: revisar en la zona servidor (la zona 05 indica que los bots no pueden fijar ni borrar mensajes ajenos: `direct-transport-control.js` L711-714).

## Sistemas

| Sistema | Corre en | Archivos | Estado |
| --- | --- | --- | --- |
| Data plane Direct | Worker | `cloud/webTransport.worker.ts` y sus sondas | Vivo solo en LEGACY |
| Cliente del worker | Página | `cloud/webTransportWorkerClient.ts`, `…Protocol.ts` | LEGACY |
| Lease y control | Página | `cloud/webTransportController.ts`, `webTransportSession.ts`, `webTempAuth.ts` | LEGACY |
| Fachada de transporte | Página | `cloud/webGalerCloudTransport.ts` | LEGACY |
| Fuente de audio (MSE) y prefetch | Página | `playback/webPlaybackSource.ts`, `webStartupPlaybackCoordinator.ts`, `webVisiblePlaybackPrefetch.ts`, `webPlaybackRoutingCache.ts`, `webPlaybackIntent.ts` | LEGACY |
| Elemento de audio | Página | `hooks/useAudio.ts` | Compartido por ambos caminos |
| Cola y Shuffle | Página | `playback/usePlaybackQueue.ts` | LEGACY; catálogo usa `catalogPlaybackSession.ts` |
| Import web | Página | `platform/webImport.ts`, `import/webImportCommit.ts`, `webWavMaster.ts`, `webAudioMetadata.ts`, `lib/id3BrowserParser.ts`, `audio/mp3Metadata.ts` | Vivo |
| Descargas web | Página | `downloads/webDownloads.ts`, `useBeatDownloads.ts`, `CloudFilesModal.tsx` | LEGACY |
| Offline | — | `offline/useOfflineAvailability.ts` | Solo Desktop |

Detalle por sistema (todo FIRME):
- **Worker (3.344 líneas):** estado global de módulo; depende de internos privados de mtcute (`_session`, `_salts`, `SessionConnection.prototype.connect`, `pendingMessages`).
- **Cliente del worker:** correlación por `requestId`, timeouts, reintento de stream tras refresco de credencial y cuarentena de rutas.
- **Fuente de audio:** `MediaSource` más caché de sesión de 100 MB.
- **Import web:** el WAV se convierte a MP3 320 kbps en el hilo principal con lamejs (`webWavMaster.ts`).
- **`Player.tsx` (933 líneas):** presentacional y controlado por props; sin red ni reglas de cola. Mezcla iconos, scrubber con arrastre, popovers, layout responsivo y un menú contextual duplicado del de `BeatCard`. Único acoplamiento: `platform.system.revealPath` (Desktop).
- **`UploadModal.tsx` (2.012) + `UploadSchedulerNew.tsx`:** asistente YouTube de 5 pasos. Mezcla UI, plantillas en disco, OAuth y subida vía `lib/tauri`. Web tiene `youtubePublishing: false`.

### `webTransport.worker.ts` por bloques

| Líneas | Contenido |
| --- | --- |
| 1-163 | Tipos y estado |
| 165-1377 | Diagnóstico (trazas stage1/task2, sondas de ping y de ingreso de paquetes, observadores de RPC); `observeMtprotoPassivePing` solo ocupa 432-1186 |
| 1378-1510 | Estado, scheduler y data lanes |
| 1512-1581 | Restaurar la sesión temporal (parchea el prototipo de mtcute) |
| 1583-1656 | `closeClient` |
| 1658-1860 | Resolver medios (`getMessages` por lotes, cachés) |
| 1862-2026 | `initialize` |
| 2028-2240 | Verificar identidad y peer del vault |
| 2242-2570 | INDEX: leer, preemptar, reemplazar |
| 2572-2616 | `download` como dataURL, `deleteMessages` |
| 2618-2768 | Rangos compartidos y caché |
| 2770-3115 | Prefetch individual y por lotes |
| 3117-3169 | Foco de reproducción |
| 3171-3261 | Stream con ack |
| 3263-3292 | Upload |
| 3294-3344 | Dispatcher |

- **Interface:** 19 ops entrantes y 6 eventos salientes más `ok`/`error` (`webTransportWorkerProtocol.ts:103-160`). Único consumidor: `WebTransportWorkerClient`.
- **Veredicto:** deep en transferencia (rangos, lanes, preempción, recuperación de INDEX), pero la interface es ancha y filtra política. Quien llama debe conocer:
  - el orden `initialize` → `verify_identity` → `verify`;
  - offsets alineados a 4 KiB;
  - `stream_ack` por chunk;
  - el trío `playback_focus` / `stable` / `release` con `traceIntentId`;
  - los eventos `index-state` para pausar su propio timeout.
- Cerca del 37 % del archivo es instrumentación de investigaciones.

### Resto de `src/features/cloud/`

- `webTransportWorkerProtocol.ts`: tipos y constantes del protocolo.
- `webTransportWorkerClient.ts`: adapter página↔worker con lógica propia; no es pass-through.
- `webTransportController.ts`: ciclo de vida del lease, heartbeat y liveness; deep.
- `webTransportSession.ts`: cliente HTTP de `/transport/*` más el bind; casi todo wrappers de un endpoint.
- `webTempAuth.ts`: handshake MTProto temporal.
- `webGalerCloudTransport.ts`: fachada; orquesta import, edición, trash e INDEX.
- `webVaultPeerCache.ts`: `access_hash` del vault en `localStorage`.
- `webLibraryBootstrap.ts`: dos predicados de error y un pass-through (`ensureWebLibraryIndex`).
- `webTransportEvents.ts`: una constante, duplicada en `webTransportWorkerClient.ts:34`.
- `mtcuteIndexLivenessGuard.ts`, `mtcutePingSocketRecovery.ts`: parches de recuperación sobre internos de mtcute.
- `playbackGetFileTrace.ts`, `task2PacketLedger.ts`: solo diagnóstico.
- `beatCloudUpdateBusy.ts`: set global más evento.
- `interruptedUploadJournal.ts`: diario de subidas interrumpidas (`localStorage`).
- `useCloudUploadQueue.ts`: cola de subida; la rama web es `commitImportedBeat`, el resto es Desktop.
- `useCloudLibraryEvents.ts`: sondeo y eventos de biblioteca, mezcla Desktop y web.
- `uploadErrorDetails.ts`: textos de error Desktop.
- `desktopBeatUploadPipeline.ts`, `useCloudBeatTransfer.ts`: Desktop.
- `directTelegramDataPlane.ts`: muerto.

## Flujos

**Subir (LEGACY):**
1. (Página) Soltar archivo o «Add beat» → `useBrowserImport.ts` / `AddBeatModal.tsx:95-110` → `createWebImportCandidate` (`webImport.ts:28-88`). Un beat por acción; id `web-import-<uuid>`; blob URL para preescucha.
2. (Página) En segundo plano: ID3 y portada con `parseId3FromFile`. Si es WAV, se codifica el MASTER MP3. No se calcula hash del audio; solo SHA-256 del artwork (`webImportCommit.ts:195`).
3. (Página) Review → Save → `useImportReview.handleReviewedBeatSaved` → `cloudifyImportedBeats` (`useCloudUploadQueue.ts:121-143`) → `platform.cloudData.commitImportedBeat` (`webAdapter.ts:180`).
4. (Servidor) `ensureImportQuotaIndex` publica un INDEX vacío si no hay; después `operation/begin`, `capability/authorize`, `quota/reserve`, `topic/ensure`.
5. (Página → Worker → Telegram) Se quitan los ID3 del MASTER (`stripId3MetadataForCloud`); `upload` de MASTER, WAV y ARTWORK con caption `BEATGALER_MEDIA_V1`. PROJECT va por XHR al servidor.
6. (Página) Construye el manifiesto nuevo (`webImportCommit.ts:199-251`). (Servidor) `/index/publish` e `/index/commit` con `routingChanges`.
7. (Página) `upsertPlaybackRouteFromBeat`; el beat pasa a confirmado en `setBeats`.

**Subir (CATÁLOGO):** `AddBeatModal` → `useCatalogGalleryScope.ts:261-270` → `mutations.importBeat` → SHA-256 en streaming por parte → operación, capability, `PUT` al gateway y commit. Sin worker. Hoy solo envía `{ master: file }` y no pasa por Review.

**Reproducir (LEGACY):**
1. Clic → `usePlaybackController.handlePlay` (rama `!isTauriAvailable`, 196-211) → `platform.media.preparePlayback` (`webAdapter.ts:117-170`).
2. El `messageId` sale de la caché de rutas en `localStorage` (beatId → mensaje de Telegram), no del servidor.
3. `WebPlaybackSourceManager.prepare` pone el foco (`playback_focus` preempta INDEX y warm) y adopta el prefijo ya descargado.
4. `prepareMediaSource`: `MediaSource` + `SourceBuffer` en modo `sequence`; URL `blob:` hacia `useAudio.play`.
5. Los chunks de 64 KiB llegan del worker por `postMessage` transferible con ack. Si MSE no soporta el mime, se usa un Blob completo.
6. `useAudio` emite `beatgaler:web-playback-state`; el source manager marca `playback_stable` con 2 s de buffer.

**Prefetch (LEGACY):**
- **Dónde:** `webPlaybackSource.ts:123-200` más `prefetchBatch` del worker.
- **Quién lo dispara:**
  - el arranque: hasta 14 rutas recordadas (`webStartupPlaybackCoordinator.ts:118-161`);
  - un `IntersectionObserver` sobre `[data-beat-card-id]` (visible / nearby / far, `webVisiblePlaybackPrefetch.ts`, instalado en `webAdapter.ts:71`);
  - el propio Play.
- **Qué precarga:** exactamente los primeros 64 KiB de cada MASTER, en 7 lanes; con Play crítico, 0 lanes warm.
- **Cómo llega al reproductor:** queda en `prefixes` (memoria de página) y es el primer `appendBuffer`; el stream continúa desde ese offset.

**Siguiente / Shuffle (LEGACY):** `usePlaybackQueue.ts`. `endedSeq` → `handleNext`; primero la cola explícita, después orden o `Math.random` sobre `displayedBeats`. No precarga el siguiente de forma específica.

**Reproducir (CATÁLOGO):** `session.play` → `media.acquire` baja el archivo completo por HTTP, verifica tamaño y hash, y entrega un blob URL. Sin MSE y sin prefetch (`handleWarm` es no-op, `useCatalogGalleryScope.ts:185`). Shuffle lo sortea el servidor.

**Descargar (LEGACY):**
- `CloudFilesModal` → `useBeatDownloads.handleGetCloudFile` → `WebDownloadsManager.start` (`webDownloads.ts:125`).
- Un archivo: `showSaveFilePicker`. `ALL`: todos los archivos de UN beat a una carpeta (`showDirectoryPicker`). Sin esas APIs, Blob + `<a download>`.
- Bytes por `streamFile` con `purpose: "export"` (pide lease `download`; cede ante Play).
- Al MP3 se le antepone un ID3 regenerado con artwork.
- No se encontró descarga multi-beat.

**Descargar (CATÁLOGO):** `downloadFile` existe, pero `CatalogAppShell.tsx:63` pasa `onCloudFiles={() => {}}`; no está cableado.

### `src/features/offline/`
Un hook (`useOfflineAvailability`) que llama a `makeBeatAvailableOffline` / `removeBeatOfflineAvailability` de `lib/tauri`. Está montado en `useBeatGalerComposition.ts:213`, pero Web tiene `offlinePackage: false` (`capabilities.ts:68`), así que es inalcanzable en Web. FIRME.

## Fricción (por coste)

1. **"Play tiene prioridad" vive en 6 capas con estado duplicado:**
   - worker (`playbackSchedulerState`);
   - WorkerClient (`playbackCritical`, `desiredPlayback*`);
   - Transport (`playbackCritical`, `backgroundWaiters`);
   - Coordinator (`currentPlaybackMessageId`);
   - SourceManager (`currentPlaybackBeatId`, `latestPlaybackIntentId`);
   - `webPlaybackIntent` más `useAudio`.

   Cambiar la política obliga a tocar todas. Locality mínima.
2. **Dos pilas completas de medios** (Direct/MSE contra gateway/Blob) con `useAudio` y `Player` como único punto común. Arreglos de reproducción, prefetch o descarga no se trasladan de una a otra.
3. **El worker depende de internos privados de mtcute** y de alias de Vite a archivos internos (`vite.config.ts:82-83`, `mtcute-internals.d.ts`). Su test (`tests/component-dom/webTransportWorker.test.ts`) necesita un doble enorme de esos internos; el camino real solo se probó con los harness `playback-*` contra cuentas reales.
4. **Tests que leen el código fuente como texto:** 49 de 150 archivos en `tests/integration` y `tests/component-dom` usan `readFileSync`; `issue97PlaybackOptimization.test.ts` tiene ~120 aserciones de ese tipo. Fijan literales, no comportamiento; cualquier refactor los rompe.
5. **`webPlaybackSource.ts`:** 348 líneas físicas con líneas de más de 1.000 caracteres; MSE, caché, cola de prefetch y foco en una clase. `waitForStreamDemand` (308) no tiene llamadores, así que la contrapresión por buffer no se aplica. `WEB_PLAYBACK_PREFETCH_TARGET_SECONDS = Infinity` hace que `targetMet` y `measureMp3PlayablePrefix` (medido en worker y otra vez en página) sean solo diagnóstico.
6. **Constantes y reglas duplicadas:**
   - el límite 14, en 5 sitios;
   - la alineación 4096, en worker, client y source;
   - `directMessageId`, en `webAdapter`, `webGalerCloudTransport` y `webDownloads`;
   - `bytesToBase64`, en worker y transport;
   - el esquema `beatgaler.telegram.library` v2, en worker, transport y `webImportCommit`;
   - `productionDc` / `PROD_DC_SUBDOMAINS` / `silentLogger`, en `webTempAuth.ts` y `cloud-server/productive-temp-auth-boundary.js`;
   - `renewWebTransportSession`, casi copia de `bindTemporarySession`.
7. **Hooks que mezclan Desktop y Web con `if`:** `usePlaybackController.ts` (~60 % es "download cooking" de Tauri), `useCloudUploadQueue.ts`, `useBeatDownloads.ts`, `AddBeatModal.tsx`.
8. **Modules shallow (prueba de borrado):** `webTransportEvents.ts`, `ensureWebLibraryIndex`, `beatCloudUpdateBusy.ts`, y los 6 métodos del `coordinatedTransport` en el Coordinator (4 son reenvío puro).
9. **`webAudioMetadata.ts:22`** puede cargar `jsmediatags` desde jsDelivr, pero `src/main.tsx:16` define antes `window.jsmediatags = browserId3Reader`. Rama CDN muerta en la práctica (PROVISIONAL: depende del orden de arranque).

**Suites `tests/playback-*` y `tests/e2e-web`:**
- `playback-b`, `-c`, `-d`, `-e`, `-g`, `-direct`, `-compare`, `-post-fix`: restos de investigaciones de latencia (README + RESULTS). Requieren `.env.stage1`, Cloud real y la cuenta 03 / mensaje 96. Sin script npm.
- Única viva: `playback-f/transport-boundary.test.mjs` (`npm run test:playback:transport-boundary`), que protege `patches/@fuman+io+0.0.21.patch`. El parche aísla el buffer de `FramedWriter`; es una dependencia de mtcute, se aplica en `postinstall` y sigue necesario en LEGACY.
- `tests/e2e-web`: solo `web-smoke.e2e.mjs` es genérico (`wdio.web.conf.mjs`). `stage1-*`, `step15-*` y `v1-public-*` son gates contra entornos reales; los `PHASE2-*.md` y `STAGE1-*.md` son informes.

## Candidatos a retirar

- **Sin importadores (FIRME):** `src/features/cloud/directTelegramDataPlane.ts`; ninguna referencia en todo el repo.
- **Sin llamadores en `src/`, solo tests (FIRME):** ops `replace_index`, `delete_messages`, `download` del worker y sus métodos en `WebTransportWorkerClient` (505-515); `waitForStreamDemand`.
- **Restos Desktop** (imports de `lib/tauri`):
  - `UploadModal.tsx`, `UploadSchedulerNew.tsx`, `utils/hash.ts`, `utils/uploadCache.ts` (solo los usa UploadModal);
  - `ImportAudioConflictsModal.tsx`, `ImportDecisionsModal.tsx`, `import/useImportDiscovery.ts`, `useImportSaveAll.ts`;
  - `offline/`, `cloud/desktopBeatUploadPipeline.ts`, `useCloudBeatTransfer.ts`, `uploadErrorDetails.ts`;
  - ramas Tauri de `usePlaybackController`, `useBeatDownloads` y `AddBeatModal`.
- **Mueren con el INDEX:**
  - el worker entero con sus 4 sondas y guardas, `webTempAuth.ts`, `webTransportSession.ts`, `webTransportController.ts`, `webTransportWorkerClient.ts`, `webGalerCloudTransport.ts`, `webVaultPeerCache.ts`, `webLibraryBootstrap.ts`, `mtcute-internals.d.ts`;
  - `webImportCommit.ts`, `webDownloads.ts`;
  - `webPlaybackSource.ts`, `webStartupPlaybackCoordinator.ts`, `webPlaybackRoutingCache.ts`, `…RoutingSuspect.ts`, `…RouteRecoveryEvents.ts`, `webRememberedDirectPreconnect.ts`, `webVisiblePlaybackPrefetch.ts`, `usePlaybackQueue.ts`;
  - el parche `@fuman/io` y la dependencia `@mtcute/web`.

  Ojo: con ellos desaparecen streaming y prefetch, que el camino catálogo no tiene hoy.
- **Instrumentación:** ~1.200 líneas del worker (165-1377), el gancho `VITE_PLAYBACK_TEST_G_CAPTURE` (`worker:1954`) y los directorios `tests/playback-{b,c,d,e,g,direct,compare,post-fix}`.

## Dudas y límites

- No se leyó la implementación del servidor desde esta zona (ver zonas 04–06).
- No se verificó el valor real de `VITE_CATALOG_API_ENABLED` en ningún entorno (no se leen `.env`). Se asume apagado por defecto según el comentario de `catalogComposition.ts:1-2`.
- No se leyó entero el bloque de diagnóstico del worker (432-1186) ni los pasos 1-4 de `UploadModal`; la clasificación sale de cabeceras, firmas e imports.
- `webLibrary.ts`, `webLibraryWindow.ts`, `webBeatEdit.ts` y `webTrash.ts` consumen la fachada pero quedan en la zona 01.
- "Vivo" o "muerto" se basa en importadores y flags de capability, no en ejecución.
