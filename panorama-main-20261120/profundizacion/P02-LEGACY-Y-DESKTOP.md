# P02 — LEGACY, INDEX y Desktop: mapa de retirada real de BeatGaler V1

**Corte:** 20 de noviembre de 2026 · **modo:** NEW chat / ALTA / diagnóstico exclusivamente.  
**Código fuente único:** `magosouljah/BeatGaler`, rama `main`, HEAD fijado **`ad8f8d0436bba5c3f663a301440ebf977200d953`**. Coincide con el SHA de referencia: **delta inicial = ninguno**.  
**Contexto inicial consultado antes del código:** `magosouljah/beatgaler-arq/panorama-main-20261120/PANORAMA.md` y solo los grupos pertinentes de `INVENTARIO-C0.md`: Web.App_Entradas, Web.Plataformas, Web.Library_Anterior, Web.Direct_Compartido, Cloud.HTTP_Operacion, Cloud.INDEX_Residuales, Desktop.Tauri, CI y scripts. No se usó el histórico como prueba de ejecución.  
**Lectura:** llamadas de GitHub a archivos fijados por SHA y búsquedas de consumidores. **Sin** tests nuevos, procesos, browser, AWS, PostgreSQL, Telegram, secretos o modificaciones de `BeatGaler`.

## Convenciones y dictamen ejecutivo

- **VERIFICADO_EN_CÓDIGO (VC):** una declaración, import, rama, ruta, contrato o llamada está presente en el SHA citado. Esto **no** certifica comportamiento en vivo.
- **HIPÓTESIS (H):** ausencia aparente de consumidor, posible código muerto o seguridad de una eliminación; necesita prueba adicional antes de retirar.
- **VERIFICADO_EN_FUNCIONAMIENTO (VF):** reservado para evidencia externa existente y atribuida; **ningún PASS de funcionamiento se declara en este P02**. La ausencia de ejecución nueva y de ejecución CI asociada en los resultados consultados impide adjudicarla.
- **Estados:** `ACTIVO` (parte de un entrypoint productivo), `LEGACY` (funcionalidad INDEX/vía vieja), `COMPARTIDO` (necesario por Web nativa y otra rama), `INCIERTO` (candidatura aún sin falsación exhaustiva).
- **Decisión:** `CONSERVAR`, `SEPARAR`, `RETIRAR_CANDIDATO` (solo futuro y con precondiciones) o `INCIERTO`. **No autoriza eliminar hoy.**
- **Referencias:** cada `archivo:línea@ad8f8d0` señala el **SHA completo fijado arriba**, no otra rama ni el último estado móvil del repositorio. Ejemplo completo: `src/features/library/catalog/catalogDirectPort.ts:18-28@ad8f8d0436bba5c3f663a301440ebf977200d953`. Para facilitar lectura, se usa el SHA abreviado inequívoco `@ad8f8d0` en las demás referencias.

**Conclusión central (VC): la Web V1 usa el catálogo PostgreSQL y Direct B, pero sigue importando indirectamente piezas de la infraestructura histórica.** `INDEX` como autoridad Web fue retirado de la composición; **`webTransport*` no es código muerto**. Los endpoints antiguos de transporte son, en el servidor analizado, mayoritariamente *nombres en guardas, observabilidad, clientes no montados o tests*; **eso no los convierte en respuestas HTTP 410 efectivamente registradas**. La plataforma Desktop está fuera del producto priorizado, pero **`desktopAdapter` y `lib/tauri.ts` todavía están unidos al grafo estático de la Web**. El mayor peligro es suprimir defensas, rutas de autenticación o el manejo de bytes junto con el código INDEX.

## 1. Sistemas y propietarios

| Sistema y submódulo | Estado | Entrypoint y propietarios de estado/datos | Decisión |
|---|---|---|---|
| Arranque React y selección de plataforma | COMPARTIDO | `src/main.tsx`; `platform/index.ts` escoge adapter según `__TAURI_INTERNALS__` | CONSERVAR hasta separar builds |
| Gallery PostgreSQL | ACTIVO | `WebExperience → WebGalleryEntry → WebGalleryWorkspace → LibraryCompositionGate → CatalogGalleryWorkspace → CatalogAppShell`; `catalogLibraryProvider` posee servicios por cuenta/era | CONSERVAR |
| Catalog Query/Interaction/Playback/Mutations | ACTIVO | Servicios `catalogQueryStore`, `catalogInteractionStore`, `catalogPlaybackSession`, `catalogMutations`; PostgreSQL es autoridad, caches del browser son copias | CONSERVAR |
| Direct B MTProto desde Web | COMPARTIDO | `catalogDirectPort` → `WebTransportWorkerClient` → `webTransport.worker`; sesión temporal del browser, archivo Blob del usuario, Telegram bytes | CONSERVAR; separar protocolo viejo internamente |
| Transacciones Cloud del catálogo | ACTIVO | `catalog/routes`, `catalog/operations`, `catalog/direct`, `catalog/media`, `catalog/worker`; Postgres conserva reservas, tickets, recibos y estados | CONSERVAR |
| Gateway, vault y purga | ACTIVO | `catalog-gateway-runtime`, `catalog/transport-gateway`, `direct-transport-control`, `catalog/purge`; gateway verifica Telegram, journal custodia borrado físico | CONSERVAR |
| Web antigua INDEX/CloudTransport | LEGACY | `webAdapter → webStartupPlaybackCoordinator → webGalerCloudTransport`, `webLibraryWindow`, imports/edición/trash antiguos; ya no es el árbol Gallery actual | SEPARAR / valorar retirar tras falsación |
| Operaciones INDEX dentro del Worker Web | LEGACY dentro de COMPARTIDO | `get_index`, `replace_index`, `delete_messages`, `upload` y protocolo antiguo coexisten con `catalog_send/read` | SEPARAR, nunca eliminar Worker entero |
| Arranque Cloud/seguridad | ACTIVO/COMPARTIDO | `server.js` instala wrappers sobre `express.application` antes de `require("./server-core")`; auth/contención operativas | CONSERVAR |
| Guardas de rutas C10 y 410 | COMPARTIDO/DEFENSA | `legacy-media-upload-disable`, `http-containment`, `direct-capability-boundary`, `catalog/legacy-fence`, `catalog/session-guard` | CONSERVAR o reemplazar solo con prueba de equivalencia |
| Tareas históricas INDEX de basura | LEGACY/INCIERTO | `index-reconciliation`, `garbage-reconciliation-worker`, `garbage-journal-repository`, `startup-vault-recovery` no tienen entrypoint productivo demostrado en búsqueda | RETIRAR_CANDIDATO después de verificar operadores y retención |
| Migración JSON → PG y compatibilidad | COMPARTIDO | `legacy-import-executor` exporta funciones aún consumidas por flujos PG de identidades/cutover y CLI | SEPARAR funciones; no borrar archivo globalmente |
| Tauri/Rust/instaladores | LEGACY respecto a V1 Web, no respecto a builds Desktop | `src-tauri`, `DesktopExperience`, workflows macOS/Windows, scripts de firma/updater | AISLAR; retirar solo si descontinuación formal |
| Componentes Gallery compartidos | COMPARTIDO/ACTIVO | `CatalogAppShell` importa `Drawer`, `Player`, `SettingsPanel`, `BeatCard`, `AddBeatModal` | CONSERVAR; extraer ramas Desktop en fase posterior |

**Pruebas básicas:** `src/main.tsx:1-14,123-129@ad8f8d0`; `src/app/WebGalleryWorkspace.tsx:18-29@ad8f8d0`; `src/features/library/catalog/CatalogAppShell.tsx:5-31,171-190@ad8f8d0`; `cloud-server/server.js:64-66,92-145,283-301@ad8f8d0`; `cloud-server/catalog-worker.js:19-40@ad8f8d0`.

## 2. Grafo Web real; alternativas, imports dinámicos y build

```text
src/main.tsx
  ├─ import { platform } from src/platform/index.ts
  │    ├─ import desktopAdapter (ESTÁTICO) ──> src/lib/tauri.ts
  │    └─ import webAdapter (ESTÁTICO) ──> lazy webStartupPlaybackCoordinator
  │                                       └─ webGalerCloudTransport / INDEX antiguo
  ├─ WebExperience (ESTÁTICO)
  │    ├─ LandingPage (lazy)
  │    └─ WebGalleryEntry (lazy)
  │          └─ WebGalleryWorkspace (import anticipado/dinámico)
  │              └─ LibraryCompositionGate
  │                  ├─ flag off: LegacyRetired (texto fail-closed; NO App INDEX)
  │                  ├─ no autorizado/bloqueado: BlockedState
  │                  └─ /catalog/v1/context = POSTGRES
  │                      └─ CatalogGalleryWorkspace → CatalogAppShell
  │                          ├─ GalleryChrome / BeatCard / Drawer / Player / Settings
  │                          └─ catalogLibraryProvider
  │                              ├─ store / interaction / playback / mutations
  │                              ├─ catalogTransfer / catalogMediaClient / MAIN / cachés
  │                              └─ si capabilities.direct: createLazyDirectPort
  │                                    └─ import("./catalogDirectPort")
  │                                         └─ Controller + Session + WorkerClient
  │                                               └─ new Worker(webTransport.worker.ts)
  └─ DesktopExperience (lazy, solo si runtime Tauri)
       └─ App + LibraryUxBridge + useBeatGalerComposition (pipeline anterior)
```

**VC:** `src/app/WebExperience.tsx:1-26@ad8f8d0`; `src/app/WebGalleryEntry.tsx:1-17@ad8f8d0`; `src/app/WebGalleryWorkspace.tsx:12-27@ad8f8d0`; `src/features/library/catalog/LibraryCompositionGate.tsx:29-37@ad8f8d0`; `src/platform/index.ts:1-11@ad8f8d0`; `src/platform/webAdapter.ts:19-35,44-53,96-100@ad8f8d0`; `src/app/DesktopExperience.tsx:1-7@ad8f8d0`.

**Importante:** los comentarios de `WebGalleryWorkspace.tsx:6-11` y `catalogLibraryProvider.tsx:1-5` describen una situación de flags/LEGACY anterior; **el comportamiento verificable hoy es el código**, no esos comentarios. `catalogComposition.ts:7-23@ad8f8d0` toma `VITE_CATALOG_API_ENABLED` como **true por defecto salvo `"false"` explícito**. Incluso con `false`, `WebGalleryWorkspace` únicamente pasa `LegacyRetired`; no carga `App` antiguo. El script de despliegue Web fija `VITE_CATALOG_API_ENABLED=true` (`scripts/aws/deploy.sh:18@ad8f8d0`), **pero no se ejecutó ni se inspeccionó el entorno desplegado**.

**Alternativas conservadas:** `catalogLibraryProvider.tsx:70-78@ad8f8d0` selecciona un doble `catalogLabDirectPort` solo en `import.meta.env.DEV && VITE_CATALOG_LAB_DIRECT`; en producción importa dinámicamente `catalogDirectPort`. `catalogDirectPort.ts:215-220` solo lee el margen de renovación LAB en DEV. `vite.config.ts` distingue `mode=web` de desktop, contiene configuración para WASM/Worker y controles de confianza; `package.json` contiene `build:web` además de builds Tauri. Por tanto, el grafo *estático de fuentes* no equivale a los chunks finales: **no se compiló ni midió bundle**. Un objeto viejo importable **no es** por sí mismo una ruta Web de producto alcanzable.

## 3. Matriz trazable de retiro, consumidores y falsación

`D` = consumidor directo, `I` = indirecto, `Δ` = import dinámico, `R` = registro de ruta, `B` = build/CI; **los consumidores de pruebas no prueban consumidores runtime**.

| Archivo / grupo | Entrypoint → consumidores (tipo) | Función que sobrevive / evidencia | Decisión y prueba necesaria |
|---|---|---|---|
| `WebGalleryWorkspace`, `LibraryCompositionGate`, `CatalogGalleryWorkspace` | `main → WebExperience → WebGalleryEntry` (D/Δ) | Seleccionan catálogo PG o fallo cerrado; jamás montan la Gallery INDEX (`WebGalleryWorkspace.tsx:12-27`; `LibraryCompositionGate.tsx:29-37`) | **CONSERVAR**; borrar solo comentarios desactualizados tras verificación semántica |
| `catalogComposition`, `catalogLibraryProvider` | Gallery (D) | `/context`, aislamiento por cuenta, instanciación de servicios, carga Δ Direct B (`catalogLibraryProvider.tsx:66-78,94-115,151-155`) | **CONSERVAR**; no usar flag-off como justificación de remover Direct |
| `catalogDirectPort`, `catalogDirectTypes`, `catalogDirectCore` | provider → `catalogTransfer`/`catalogMediaClient` (D/Δ) | Envío/lectura y control de clave temporal (`catalogDirectPort.ts:18-28,54-74,137-198`) | **CONSERVAR**; la hipótesis «transporte legacy muerto» queda **falsada** |
| `webTransportWorkerClient`, `webTransportController`, `webTransportSession`, `webTransportWorkerProtocol`, `webTempAuth` | `catalogDirectPort` (D), Worker (Δ) | Sesión MTProto temporal, `catalog_send/read`, cancelación (`webTransportWorkerClient.ts:148-156,715-724`) | **CONSERVAR** infraestructura; **SEPARAR** verbos INDEX, sin romper el contrato compartido |
| `webTransport.worker.ts` y WASM/mtcute | `WebTransportWorkerClient` → Worker URL (Δ) | `catalogSend`, `catalogRead`, renovación y lectura de bytes (`webTransport.worker.ts:3298-3385,3387-3410`) | **CONSERVAR**; evaluar quitar `get_index`, `replace_index`, `delete_messages`, `upload` **solo** tras comprobar que nadie emite esos comandos en V1 |
| `webGalerCloudTransport`, `webStartupPlaybackCoordinator`, `webLibraryWindow`, `webLibrary`, webTrash/webImport antiguo | `webAdapter.resolveWebCoordinator` (Δ), más tests | Constructor viejo `new WebGalerCloudTransport` (`webStartupPlaybackCoordinator.ts:4,57`); `webAdapter.library.load()` todavía implementa INDEX (`webAdapter.ts:29-35,96-100`) | **SEPARAR** de `platform/webAdapter`; **RETIRAR_CANDIDATO** del runtime Web solo tras mapa de consumidores y fallback |
| `WebLibraryPagination`, `LibraryUxBridge`, `App`, `useBeatGalerComposition` | `DesktopExperience → App` (D); pager sin import productivo hallado | Desktop utiliza App; pager anterior tiene consumidores de tests (`DesktopExperience.tsx:1-7`; `useBeatGalerComposition.ts:1-56`) | **SEPARAR**; pager **RETIRAR_CANDIDATO** con grep de imports, referencias de tests/visual y build |
| `src/platform/index.ts`, `desktopAdapter.ts`, `lib/tauri.ts` | `main`, `Player`, `Drawer`, `BeatCard`, `Settings` (D/I); adaptadores ambos estáticos | Selección en runtime y API Tauri condicional; `desktopAdapter` importa Tauri desde el grafo Web (`index.ts:1-11`; `desktopAdapter.ts:1-21`) | **SEPARAR** Web/Desktop por entrypoint/adaptadores; **NO borrar** `lib/tauri.ts` hasta demostrar ausencia de import Web |
| `Drawer`, `BeatCard`, `Player`, `SettingsPanel`, `AddBeatModal` | `CatalogAppShell` (D) | UI PG real; `Drawer` invoca `onCatalogSave`; `BeatCard` importa `getProjectCloudStatus` Tauri (`CatalogAppShell.tsx:9-19,171-190`; `Drawer.tsx:5,326-327`; `BeatCard.tsx:15`) | **CONSERVAR** shell; **SEPARAR** ramas Tauri/INDEX a adapters o chunks |
| `cloud-server/server.js`, `server-core.js` | Node start → `require("./server-core")` (D/R) | Configuración PG, auth, routers, `app.listen`; puente de identidad (`server.js:64-66,283-301`; `server-core.js:129-135,1384-1387`) | **CONSERVAR**; no reescribir/borrar anchors de `server-core` sin revisar loader |
| `catalog/routes.js`, `operations.js`, `direct.js`, `worker.js`, `media.js`, `purge.js` | `server-core` router / `catalog-worker` runner (R/D) | PG, reservas, recibos, verificación, purge, direct; rutas y efectos actuales (`catalog/routes.js:71-208`; `catalog-worker.js:19-40`) | **CONSERVAR**, con pruebas SQL/HTTP de regresión antes de tocar |
| `direct-transport-control.js`, `direct-vault-assignment`, `catalog-gateway-runtime.js`, `catalog/transport-gateway.js` | `server.js` direct/gateway/native provisioning y worker (D/I) | `catalogBotCredential` y `catalogDirectSession`, mismo bot/vault, verify/search/delete (`direct-transport-control.js:388-428`; `server.js:131-140`; `transport-gateway.js:153-234`) | **CONSERVAR**; separar métodos INDEX internos, no cortar bot credentials actuales |
| `legacy-media-upload-disable.js` | `server.js:66` instala wrapper (D), sin rutas `app.post` equivalentes en core | Sustituye handler por 410 **cuando** se registra `/beats/upload`,`/projects/upload`,`/cloud-files/upload` (`:3-24`) | **DEFENSA LATENTE, CONSERVAR/SEPARAR**; probar que eliminación no permite registrar upload viejo por otro instalador |
| `http-containment.js` | `server.js:283` parchea `.post/.get` (D) | 410 condicionado para `/library/upsert`, instalación/auth/OAuth reales; `:423-465` | **CONSERVAR** autenticación/contención; limpiar listas de rutas antiguas **solo** con equivalencia de barreras |
| `direct-capability-boundary.js`, `catalog/legacy-fence.js`, `catalog/session-guard.js` | `server.js:284` + cat authority (D) | Revocación de auth, cerco SQL `catalog_libraries/vaults`, 410 de protocolo; `direct-capability-boundary.js:459-514,709-723`; `catalog/legacy-fence.js:21-29,53-82` | **DEFENSA, CONSERVAR** incluso si antiguo `/transport/operation/begin` no está conectado |
| `productive-temp-auth-boundary.js` | `server.js:291` (D) + `catalog/direct` la usa vía `server.js:134` | Protección de credenciales temporales; wrapper viejo condicionado, pero **`transformSession` usado por Direct B** (`:399-443`) | **CONSERVAR**; separar wrapper de export de autorización en segunda fase |
| `server-core-auth-bridge-loader.js` | `server.js:19,296-302` (D) | Reescribe en carga de `server-core.js` **marcadores literales exactos** (`loader.js:6-55,309-345`) | **CONSERVAR, ALTO RIESGO**; no limpieza textual del core sin migrar o validar este mecanismo |
| `operations-runtime.js` | `server-core.js:98-100` (D) | Telemetría HTTP; clasifica paths viejos como texto, no registra endpoints (`operations-runtime.js:35-48`) | **SEPARAR** métricas de INDEX tras comprobar dashboards/alertas |
| `index-reconciliation.js`, `garbage-reconciliation-worker.js`, `garbage-journal-repository.js` | `garbage-reconciliation-worker → index-reconciliation → garbage-journal-repository` (D interno); tests; sin runner productivo identificado | Ledger `index_observations`, `garbage_journal`, reconciliación basada en *pinned-index* (`index-reconciliation.js:20-40,54-79`; `garbage-reconciliation-worker.js:3-12,97-126`) | **RETIRAR_CANDIDATO (H)**; confirmar cero comandos de mantenimiento y estrategia de retención antes |
| `startup-vault-recovery.js` | No caller productivo identificado en búsqueda | Helper `skipMissingVault`, reparación `MASTER_VAULT_NOT_FOUND` (`:3-26`) | **INCIERTO**; comprobar invocadores por require dinámico antes de considerar retiro |
| `library-index-publication.js`, `vault-index-pointer-store.js`, `direct-index-pin-authority.js` | Solo restos de referencias de docs/tests/comentarios | **Los archivos no existen en HEAD** (404 al consultar); contrato T25 exige ausencia (`catalog-contract.test.cjs:109-126`) | **YA AUSENTES**; no ponerlos en lista de borrado. Retirar referencias documentales solo donde confundan |
| `legacy-import-executor.js` | `postgres-control-plane-runtime`, `postgres-auth-multiprocess-compat`, `postgres-rollback-preparation`, `access-grant-store`, `catalog/native-cli`, `provider-identity-authority` (D) | `buildLegacyRows` y `deterministicId` **consumidos**; `importLegacyControlPlane` sin caller productivo encontrado (`legacy-import-executor.js:28-121,187`; `native-cli.js:10`) | **SEPARAR export potencialmente muerto; CONSERVAR helpers PG** |
| `catalog/navigation/legacy` y `catalogNavigation.ts` | `catalogApi.legacyNavigation` → router PG (D/R) | Migración de URL `bgPage` a offset SQL, NO Telegram INDEX (`catalog/routes.js:80-82`; `catalogNavigation.ts:1-50`; `catalogApi.ts:180-182`) | **CONSERVAR** mientras se admitan enlaces antiguos |
| `src-tauri`, scripts Tauri, workflows macOS/Windows | `DesktopExperience`/`npx tauri build`/workflows dispatch (B) | Empaquetado y recuperación Desktop; workflows `.github/workflows/build-{macos,windows}.yml` | **AISLAR** del build Web; eventual retiro solo con decisión explícita de producto y CI rediseñada |

**Contraejemplos de «nombre legacy ⇒ muerto»:** `catalog/authority.js:78-98,204-231@ad8f8d0` lee tablas/punteros *históricos* para **impedir aprovisionar incorrectamente un vault** y revoca capacidades viejas al crear catálogo PG; `catalog/legacy-fence.js` protege una frontera SQL; `catalog/navigation/legacy` conserva compatibilidad de URL. Estos nombres son controles o compatibilidad **actuales**, no pruebas de dependencia INDEX como autoridad.

**Hipótesis no promovidas a VC:** que no exista un import dinámico textual que escape a la búsqueda; que todo script de operador INDEX esté retirado; que todo byte del bundle Tauri sea eliminado por tree-shaking; que `WebLibraryPagination` no se cargue mediante un harness externo. La matriz define cómo falsarlas.

## 4. Cloud: registro HTTP efectivo, cerco, 410 latente y rutas ausentes

**Orden verificable de instalación (VC):**
1. `server.js:64-66` instala `legacy-media-upload-disable` sobre `express.application.post` **antes** de inicializar `server-core`.
2. `server.js:215-291` instala registro seguro, lifecycle, sesión, `http-containment`, `direct-capability-boundary`, `productive-temp-auth-boundary` y otras defensas **antes** de requerir core.
3. `server.js:296-302` registra un loader que transforma el **texto exacto** de `server-core.js` antes de compilarlo, luego ejecuta `require("./server-core")`.
4. `server-core.js:129-135` monta el router `/catalog/v1` y otras rutas explícitas; `:210-231` monta `/events/ticket` y `/events`; `:930-1242` auth/OAuth; `:1257-1373` conexión y status de Telegram/transport; `:1384-1387` escucha.
5. `server.js:316-324` instala adaptadores de sesión/membresía que **envuelven métodos de `directTransport`**, no registran nuevos `app.post` (`direct-persistent-session-runtime.js:159-227`; `direct-persistent-membership-runtime.js:268-276`).

| Familia HTTP | Tipo real encontrado en HEAD | Clasificación y condición |
|---|---|---|
| `/catalog/v1/context`, `library/provision`, `beats`, `facets`, `navigation/legacy`, `query-sets` | **Registradas en router** (`catalog/routes.js:71-101`) | Alcanzables bajo `/catalog/v1`; si no hay autoridad, catchall 503 `CATALOG_UNAVAILABLE` (`:53-56`) |
| `/catalog/v1/operations`, `.../parts/.../receipt`, `/direct-receipt`, `/send-ticket`, `/send-report`, `/commit`, `/resume` | **Registradas condicionalmente** (`:121-170`) | Requieren servicios `commands`, `operations`, `direct` según ruta; no equivale a viejo `/transport/` |
| `/catalog/v1/direct/session` y `/stop` | **Registradas si `direct` está configurado** (`:179-187`) | Nueva sesión Direct B; no entrega credencial permanente; stop responde `{ok:true}` |
| `/catalog/v1/files/:fileId/access`, `.../parts/:partIndex/bytes`; `/prefix-packs/main` | **Registradas condicionalmente** (`:172-178,202-206`) | Solo autorización, referencias y confirmación de bytes; ninguna ruta HTTP de carga de medios |
| `/catalog/v1/*` desconocido | **Catchall realmente registrado** (`:207-208`) | 501 `NOT_IMPLEMENTED` si está montado; no confundir con viejo 410 |
| `/events`, `/events/ticket`, auth/OAuth, `/telegram/connect/...` | **Rutas efectivas** (`server-core.js:210-231,930-1350`) | `http-containment`/seguridad pueden interceptar éstas: suprimir wrapper afecta rutas reales |
| `GET /transport/status` | **Registrada** (`server-core.js:1359-1374`) | Endpoint restringido admin/loopback; NO es INDEX API |
| `/transport/index/{commit,publish,bootstrap-state}`, `/transport/session/{start,heartbeat,...}`, `/transport/operation/{begin,end,renew}`, `/transport/project/upload`, `/transport/topic/ensure`, `/transport/trash/purge` | **No hay registros `app.get/post` de esta familia en `server-core.js` en el corte** (contrato T25 `catalog-contract.test.cjs:109-126`) | Aparecen en `http-containment`, `direct-capability-boundary`, `productive-temp-auth-boundary`, `webTransportSession`, observabilidad/tests. **API antigua no conectada en el router inspeccionado**, no afirmar 410 HTTP vivo |
| `/beats/upload`, `/projects/upload`, `/cloud-files/upload` | **Intercepción latente**, no registro base visto (`legacy-media-upload-disable.js:3-20`) | 410 solo **si algún caller registra** `app.post` con esa ruta; `server-core.js:85-95` tiene log de paths, no registro |
| `/library/upsert` | **410 latente** (`http-containment.js:423-445`) | `legacyLibraryUpsert` se instala si alguien hace `app.post('/library/upsert', ...)`; no se halló tal registro actual |
| `respondLegacyFence()` | **Helper** (`catalog/legacy-fence.js:78-86`) | Búsqueda de usos mostró tests y su definición; **candidato de helper no invocado**, pero excepción y SQL de fence sí conservan consumidores |

**Falsación Cloud importante:** `direct-capability-boundary.js:709-723` crea `/transport/capability/authorize` **como efecto secundario de registrar** `/transport/operation/begin`. Una declaración de ese wrapper **no prueba que `/transport/capability/authorize` exista**. `productive-temp-auth-boundary.js:399-435` también solo envuelve handlers *si se registran*. `catalog/session-guard.js:8-47` contiene la política 410 de protocolo catalog-v1 en abstracto: no confundir export de regla con ruta montada. **Cualquier auditoría que sume los strings de `http-containment` como endpoints activos queda descartada.**

**Riesgo crítico de poda de `server-core`:** `server-core-auth-bridge-loader.js:6-25,29-55,309-345` compara y reemplaza cadenas literales de `saveAuthData()` y del lookup login; `server.js:296-302` usa ese loader en el arranque, y la identidad estable depende de él. Una «limpieza cosmética» de nombres antiguos en `server-core.js` puede desencadenar `SERVER_CORE_AUTH_BRIDGE_INCOMPATIBLE` o romper el parche. **Primero convertir ese acoplamiento a módulo estructural y demostrar equivalencia; no editar ahora.**

## 5. Contratos de estado, HTTP, SQL, eventos y Telegram que sobreviven

**Propiedad y separación de datos (VC):**
- **Navegador:** mantiene los `File/Blob` originales durante la transferencia, colas de bytes, puerto Direct, sesiones temporales, MSE/Blob para reproducción, URL con refcount y cachés locales IndexedDB; `catalogLibraryProvider.tsx:94-115,141-155`, `catalogMediaClient.ts:1-17,105-146@ad8f8d0`. No es fuente de verdad del catálogo.
- **PostgreSQL:** fuente de verdad de `catalog_libraries`, `catalog_generations`, `catalog_transfer_operations`, `catalog_operation_parts`, `catalog_media_objects`, `catalog_jobs`, `catalog_purge_objects`, idempotencia, era/época, reservas, estados `ACTIVE/TRASH/PURGED`; `catalog/authority.js:195-233`, `catalog/operations.js:1-10,194-310`, `catalog/purge.js:1-13@ad8f8d0`.
- **Telegram:** conserva los bytes físicos; el navegador envía/lee usando MTProto temporal. El gateway Cloud **verifica metadatos del proveedor, busca tras incertidumbre y elimina solo bajo journal**, no reenvía archivos. `catalog/direct.js:1-17`; `catalog/transport-gateway.js:153-234`; `catalog/worker.js:1-10,63-105`.
- **Cloud control-plane:** autentica y autoriza por usuario, emite sesión temporal, ticket, lectura autorizada/recibo, observa estado PG; **no recibe ni retransmite el cuerpo de MASTER/WAV/ARTWORK/PROJECT/MAIN** en `/catalog/v1` (`catalog/routes.js:161-186,202-206`; `catalog-contract.test.cjs:93-107`).

**Contrato HTTP (VC):**
- Mutaciones PG usan `Authorization`/sesión, `Idempotency-Key`, `X-Catalog-Era`, `X-Catalog-Epoch`; ausencia en writes → 428 (`catalog/routes.js:35-43@ad8f8d0`).
- `POST /catalog/v1/operations` crea IMPORT/REPLACE con identidad/reserva persistida; `POST .../send-ticket` fija `random_id`, `chatId`, remitente y `caption` antes del efecto; `PUT .../direct-receipt` guarda recibo **candidato**, `POST .../commit` responde 202 si no verificado o 200 si completado; `catalog/routes.js:121-168`, `catalog/operations.js:194-310@ad8f8d0`.
- `POST /catalog/v1/files/:fileId/access` concede referencias de partes; tras leer, `POST .../bytes` confirma SHA/tamaño; `catalog/routes.js:202-206`; `catalogMediaClient.ts:105-146`.
- `/catalog/v1/navigation/legacy` es traducción PG de enlaces `bgPage`, no publicación ni lectura del Telegram INDEX (`catalogApi.ts:180-182`, `catalogNavigation.ts:37-50`).
- `GET /events` y `POST /events/ticket` son SSE/eventos Cloud registrados en `server-core.js:210-231`; la actualización de Gallery autoritativa se sigue con servicios PG. No inferir que un nombre de evento viejo queda activo en composición nativa.

**Contrato SQL/defensas (VC):**
- `catalog/legacy-fence.js:23-29` comprueba catálogo PG o elegibilidad del vault; `direct-capability-boundary.js:509-514` rechaza emisión INDEX cuando corresponde.
- `catalog/authority.js:78-98,204-231` inspecciona tablas históricas como **predicado de seguridad de aprovisionamiento nativo**, serializa bajo `vaults FOR UPDATE`, genera descriptor NATIVE con `raw_index=NULL` y revoca direct_capabilities antiguas. El SQL contiene `index_` porque detecta contaminación anterior, no porque el catálogo se alimente de INDEX.
- `catalog/operations.js:1-10` reserva cuota, fija identidad, separa RECEIPT de VERIFIED y commit transaccional; `catalog/worker.js:1-10` usa leases y fencing.
- **Dos diarios que no deben conflarse:** `garbage_journal` antiguo ligado a INDEX (`garbage-journal-repository.js:3-13`), frente a `catalog_purge_objects` del purge PG (`catalog/purge.js:1-13`). Eliminar el segundo por buscar nombres de basura sería un error grave.

**Contrato Telegram y fallo (VC):** caption `catalog:v1 op=<operationId> part=<partKey>`, `random_id` previamente persistido, bot asignado al vault; `catalog/direct.js:1-17`, `catalog/transport-gateway.js:18-21,186-190`. El worker verifica remitente/mensaje/caption y categoriza respuestas. La lectura en `catalogDirectPort.ts:155-198` exige chat coincidente, rangos alineados, trata lectura corta como error y calcula SHA cuando solicita lectura completa. El Worker `webTransport.worker.ts:3300-3340` mantiene progreso de subidas grandes por `random_id` en memoria (no persiste al refresh). **Nunca reinterpretar un error de red después de enviar como prueba de «no enviado».**

## 6. Diagramas de camino feliz y fallo/reintento

**Camino feliz de Web PG, importación y reproducción:**

```text
src/main.tsx → WebExperience → WebGalleryEntry → WebGalleryWorkspace
    → GET /catalog/v1/context (POSTGRES, cuenta/era/época)
    → catalogLibraryProvider crea store + interaction + media + playback + transfer
    → GET /catalog/v1/beats, facets y query-set → PostgreSQL (autoridad)
    → CatalogAppShell (BeatCard/Drawer/Player/Settings)
    → usuario elige MASTER/WAV/ARTWORK/PROJECT
    → catalogFilePrep prepara metadatos/hash
    → POST /catalog/v1/operations [Idempotency-Key / era / época]
    → PostgreSQL reserva + persiste parts/random_id/identidad
    → POST send-ticket (Cloud)
    → catalogDirectPort → WebTransportWorkerClient
    → webTransport.worker MTProto → Telegram: bytes + caption catalog:v1
    → PUT direct-receipt (candidato) → PostgreSQL
    → catalog-worker → gateway Telegram verify → PostgreSQL VERIFIED
    → POST commit / worker commit → PostgreSQL COMMITTED / beat ACTIVE
    → catalogMediaClient pide access SQL → puerto Direct lee Telegram
    → prefixCache / MSE o Blob → Player o descarga
    → trash/restore: comandos PG; purge: intención PG + journal/worker + delete proveedor
```

**Fallo, timeout, reconcilio y reintento:**

```text
/context no listo, sesión inválida o autoridad bloqueada
    → LibraryCompositionGate muestra estado bloqueado, NO INDEX fallback

Direct sesión/Worker no listo
    → ready=false / error visible; cooldown; NO segundo transporte de bytes

send-ticket emitido + subida falló SIN efecto confirmado
    → send-report UPLOAD_FAILED / REJECTED
    → retry acotado con MISMA identidad y nuevo ticket; no duplicar random_id

efecto Telegram posible, Worker muere, respuesta perdida o recibo incierto
    → report UNCERTAIN / PART_UNCERTAIN
    → NO reenviar; estado RECONCILE → worker searchByRandomId
       ├─ único mensaje verificable → receipt/verification/commit
       ├─ ninguno aún → backoff, sin inferir ausencia
       └─ varios / conflicto / permanente → BLOCKED, revisión explícita

PG commit responde 202 (no todas las partes VERIFIED)
    → observar operación / retry de COMMIT idempotente si READY; NO reenviar archivo

read catalog falla temporalmente
    → retry de rango/fragmento (máximo 4 en DirectPort); abort cancela lectura
    → lectura corta / SHA incorrecto: ERROR, no declarar medios recuperados

trash → restore antes de purge: fila PG; purge solicitada
    → enumeración SQL y journal; borrar físico solo mediante worker con comprobación
    → fallo Telegram deja objetos pendientes/blocked según clasificación, sin borrado ciego
```

Referencias: `catalogTransfer.ts:237-286,289-331@ad8f8d0`; `catalogDirectPort.ts:101-152,155-198@ad8f8d0`; `catalog/worker.js:63-105,137-176@ad8f8d0`; `catalog/purge.js:1-13@ad8f8d0`. Son **diagramas de las ramas escritas**, no una simulación ni demostración real end-to-end.

## 7. Pruebas existentes, CI y huecos (sin PASS imaginarios)

**Inspeccionadas o localizadas como archivos existentes; NO ejecutadas:**
- `.github/workflows/catalog-checks.yml:8-49,59-113@ad8f8d0`: suites unit/faults/integration y T03–T19, PG efímero; disparadores por rutas y dispatch. No es evidencia de que corrieron sobre el HEAD fijado.
- `cloud-server/tests/catalog/catalog-contract.test.cjs:49-65@ad8f8d0`: contratos de aislamiento de dependencias; **:93-107** prohíbe Cloud bytes; **:109-126** T25 exige retiro de registros `/transport/*`, rutas INDEX y módulos históricos específicos del servidor. Es evidencia de **intención de test**, no PASS.
- `scripts/regression-legacy-media-upload-disable.mjs`, `scripts/regression-http-containment.mjs`: pruebas escritas de guardas; deben validar 410 al simular registro y no afirmar que esos POST existen hoy.
- `cloud-server/tests/catalog/catalog-fence.test.cjs`, `catalog-authority.test.cjs`, `catalog-fence.integration.cjs`, `catalog-native-cli.integration.cjs`: cerco, catálogo y migración; ninguna se ejecutó aquí.
- `tests/component-dom/catalogLibraryComposition.test.tsx`, `catalogSection61.test.tsx`, `webTransportController.test.ts`, `webTransportSession.test.ts` y `tests/integration/webPersistentDirectDataPlane.test.ts`: evidencia de código de prueba, no ruta de producto.
- `.github/workflows/build-windows.yml:4-15,176-182@ad8f8d0` y `build-macos.yml:3-5,154-160`: builds Desktop por `workflow_dispatch`, separados del despliegue Web. No se leyeron secretos.
- Consulta del estado de commit vía GitHub devolvió `statuses: []` y `workflow_runs: []` para este SHA. **No prueba ni PASS ni FAIL global**; solo falta de evidencia de ejecución accesible en esas consultas.

**Huecos a cerrar antes de borrar:** (1) snapshot completo de imports directos + `import()` + creación Worker + exports de runtime del build Web y test; (2) prueba negativa de rutas Cloud con el conjunto real de `app._router.stack` **solo en una fase futura autorizada** (P02 no la ejecuta); (3) cobertura de comportamiento de 410 latente, OAuth/CSRF/logout y puente `server-core` tras refactor; (4) comparación de artefactos Web y sus chunks reales (Vite, WASM, Tauri, `webGalerCloudTransport`); (5) pruebas de idempotencia Direct ante Worker perdido y reconcilio tras recepción; (6) retención de filas `garbage_journal/index_observations` y operadores externos antes de retirar workers viejos; (7) plan de rollback reproductible, sin pérdida de registros de seguridad. **No se declara ningún requisito de seguridad cumplido por prueba nueva.**

## 8. Prioridades y secuencia de retirada reversible (PLAN, no ejecución)

| Prioridad | Riesgo de datos si se simplifica mal | Ahorro de complejidad esperado | Acción futura propuesta, precondición y reversión |
|---|---|---|---|
| **P0 PROHIBIR RETIRO** | Máximo: bytes, duplicados, pérdida irreversible, auth | Ninguno aceptable sin prueba | Mantener `catalogDirectPort`, `webTransport*` compartidos, `catalog/{operations,direct,worker,media,purge}`, gateway, journals PG, `direct-transport-control`, `catalog/legacy-fence`, SQL fences y `server-core` bridge. Si se separan, verificar invariante por invariante en rama LOCAL |
| **P1 documentación y muertos inequívocos** | Bajo | Bajo/medio | Corregir comentarios obsoletos flag/INDEX; inventariar helpers sueltos (`respondLegacyFence`, constantes `LIBRARY_INDEX_*` en core) y test T25. Reversión por commit. No alterar semántica ni marcadores literales del auth-bridge |
| **P2 aislar frontend viejo** | Medio | **Alto** | Extraer punto de entrada `webAdapter` para que Gallery PG no importe via `platform` coordinator/`webGalerCloudTransport`; usar Web-only adapter estático y Desktop aislado. Prueba: grafos de imports, chunks y regresiones Gallery/Player/Drawer/Settings. Revertir imports, no tocar datos |
| **P3 separar comandos INDEX del Worker** | **Alto** si se rompe Direct | Alto | Extraer comandos `get_index/replace_index/delete_messages/upload` y tipos legacy, dejar intactos `catalog_send/catalog_read/initialize/verify/shutdown` y su sesión MTProto. Exigir test de protocolo, retries, Worker cancel/renew y descarga por partes. Rollback un commit |
| **P4 Cloud rutas y defensas** | Alto, auth/tenencia | Medio | Generar inventario de registros efectivos; reemplazar wrappers de paths muertos con **rechazo explícito equivalente o test de ausencia**. No retirar seguridad auth ni `catalog/session-guard`; revisar `server-core-auth-bridge-loader` previamente. Rollback de wrappers+handlers en bloque atómico |
| **P5 utilidades INDEX y Desktop** | Alto si hay operadores/recuperaciones ocultas; medio en producto Web | Alto en árbol pero no necesariamente en bundle | Auditar scripts CLI, cron, harness, workflows; aislar `src-tauri`, scripts Desktop, legacy trash/garbage INDEX solo cuando no exista consumer operativo y haya plan de retención. Archivar por commit reversible; **no ejecutar borrado de filas/medios ni migraciones** |
| **P6 funciones «legacy» pero PG activas** | Alto si borrado por nombre | Casi cero | Mantener `buildLegacyRows` y `deterministicId`; evaluar extraerlos a utilidades con nombre honesto y dejar adaptador reexportador hasta migrar callers. Remover `importLegacyControlPlane` solo tras cierre formal de usos de restauración/rollback |

**Gates de parada obligatorios:** cambio de comportamiento de auth/OAuth/login, concesión MTProto, permisos de bot/vault, fence de generación/época, recepción de bytes, respuesta 410 vs 404 vs 501, políticas de purge, pérdida de información histórica o registro de operadores no identificado. En caso de duda: revertir la modificación **de código** en LAB, nunca compensar borrando datos ni cambiando producción.

## 9. Cuestiones abiertas falsables (no repetir como hallazgos confirmados)

1. ¿Existen integradores/ops **fuera de los entrypoints analizados** que invoquen `garbage-reconciliation-worker`, `startup-vault-recovery`, `importLegacyControlPlane` o métodos antiguos de `direct-transport-control`? **Falsación:** grep estático exhaustivo de repositorio+scripts/CI, inventario de despliegue/servicios solo mediante artefactos ya existentes; si aparece caller, pasar de RETIRAR_CANDIDATO a CONSERVAR.
2. ¿Qué módulos Tauri/INDEX se incluyen **realmente** en los chunks `build:web` en ese SHA? **Falsación futura autorizada:** manifiesto Vite y reporte de grafo/bundle; hasta entonces no afirmar tree-shaking.
3. ¿Hay middleware registrado por instaladores que genere una ruta vieja **sin `app.post` literal en `server-core`**? **Falsación futura autorizada:** tabla de `express` al completar bootstrap y comparar con `catalog-contract` y test de guardas; hasta entonces «no se registró en código de core examinado», no «imposible HTTP».
4. ¿Se necesitan aún salidas/funciones de `webAdapter.library.*` para flujos ajenos a Gallery (auth, restauración, diagnóstico o test visual)? **Falsación:** mapa de llamadas transversales y gating explícito por plataforma.
5. ¿El retiro de la compatibilidad `bgPage` rompería enlaces guardados? Mientras no haya decisión y migración de URL: **CONSERVAR**.
6. ¿Se retienen objetos/operaciones INDEX históricos cuyo único camino de reparación sea un operador legacy? Hasta documentar retención y alternativa: **NO borrar workers ni tablas**.
7. ¿Cómo eliminar el parche textual `server-core-auth-bridge-loader` manteniendo identidad estable y pending signup? Resolverlo **antes** de refactors cosméticos del `server-core`.

## 10. Dictamen final

**`COMPRENSION_SUFFICIENTE_PARA_PLAN` — únicamente para planificar una retirada reversible, escalonada y de riesgo controlado.** Están identificados los entrypoints de Web/Cloud/Desktop, la falsación obligatoria de `webTransport*`, los consumidores de `legacy-import-executor`, los guards de 410 diferenciados de registros HTTP reales, y las dependencias críticas de bytes/auth/SQL. **NO** hay comprensión suficiente para autorizar un borrado directo de todo el bloque INDEX/Desktop; faltan específicamente: inventario negativo exhaustivo de consumidores dinámicos y operativos, evidencia de chunks de `build:web`, confirmación del router Express instalado, pruebas de seguridad/Direct B y plan de retención de artefactos históricos. Las tareas de comprobación corresponden a una fase posterior **solo si el propietario la autoriza**. Este informe no modifica el código ni declara PASS de funcionamiento.

**Regla de retirada:** una función se retira cuando se demuestra ausencia de consumidor **y** se preserva su defensa/contrato, no cuando el nombre contiene `legacy`, `index` o `desktop`.
