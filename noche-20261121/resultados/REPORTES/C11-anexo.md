# C11 · Anexo de evidencia
## Tamaños de los chunks
C06 es la línea base sin mapas (flag de catálogo activo). C11 se compiló con Vite 7.3.6, modo Web, mismo flag, `envFile:false`, sourcemap y un plugin temporal de inventario Rollup fuera del repo. C08 es el único diff en `src/` entre la base de C06 (`500cd74`) y C11. Tras normalizar referencias a hashes y retirar el comentario de mapa se obtienen 23/24 JS iguales. Los 24 tamaños de C11 incluyen el comentario de mapa, nunca los archivos `.map`. KB decimal y gzip por archivo medido con `node:zlib`, nivel 9. Sumar gzip aproxima transferencia por archivos separados; no mide caché, codificación de servidor ni dependencias de navegador. Las fases nombran cierres de imports estáticos desde cada entrada; se omite «Inicial» como fase secundaria del chunk de entrada.

| JS C11 | Fase (cierre estático) | KB | gzip KB | C06 KB | C06 gzip KB |
|---|---|---:|---:|---:|---:|
| `AccountGate-DKtrhVbB.js` | Auth, Gallery, Desktop, C01, Direct B | 27.308 | 8.630 | 27.259 | 8.591 |
| `catalogDirectPort-CGJKGpfT.js` | Direct B | 5.128 | 2.455 | 5.073 | 2.419 |
| `core-DhEqZVGG.js` | Lazy por función | 2.483 | 1.014 | 2.441 | 0.978 |
| `DesktopExperience-BJdhqfxz.js` | Desktop | 239.827 | 68.717 | 239.772 | 68.670 |
| `event-CnyWr2tN.js` | Lazy por función | 1.376 | 0.691 | 1.333 | 0.657 |
| `index-BsDRfFpQ.js` | Auth, Gallery, Desktop, Direct B | 0.138 | 0.143 | 0.095 | 0.104 |
| `index-Caz5qzUX.js` | Lazy por función | 6.325 | 1.672 | 6.282 | 1.636 |
| `index-D7bH7vXg.js` | Lazy por función | 1.316 | 0.474 | 1.273 | 0.436 |
| `index-DDgTLpJK.js` | Lazy por función | 0.173 | 0.172 | 0.130 | 0.136 |
| `index-GYrHnxW3.js` | Inicial | 235.002 | 75.038 | 234.959 | 75.006 |
| `lamejs-Do3B6Rdb.js` | Lazy por función | 168.991 | 58.444 | 168.947 | 58.405 |
| `LandingPage-D87m7I3J.js` | Landing | 4.259 | 2.004 | 4.210 | 1.964 |
| `libraryPresentationCache-CT_eDP8B.js` | Gallery, Desktop, C01, Direct B | 4.165 | 1.809 | 4.103 | 1.764 |
| `mp3PlayablePrefix-C0IA1Lpj.js` | Gallery, C01, Direct B | 101.125 | 31.667 | 101.070 | 31.621 |
| `path-DpyQXOHZ.js` | Lazy por función | 3.808 | 0.955 | 3.766 | 0.919 |
| `proceduralBeatBackground-Bqh8Gzao.js` | Landing, Gallery, Desktop, Direct B | 4.497 | 2.323 | 4.435 | 2.271 |
| `useAppShortcuts-DUVdSBv_.js` | Gallery, Desktop, Direct B | 315.641 | 99.113 | 315.588 | 99.068 |
| `WebGalleryEntry-Dpnwpqxx.js` | Auth | 18.481 | 5.452 | 18.428 | 5.413 |
| `WebGalleryWorkspace-D0FTOMe1.js` | Gallery, Direct B | 163.398 | 55.884 | 163.296 | 55.823 |
| `webRememberedDirectPreconnect-C3p1-nVA.js` | C01 | 0.676 | 0.459 | 0.609 | 0.411 |
| `webStartupPlaybackCoordinator-DtqhB4Mw.js` | C01 | 57.803 | 15.811 | 57.736 | 15.778 |
| `webTransport.worker-CsldjJw5.js` | Worker | 1292.482 | 309.665 | 1292.425 | 309.623 |
| `webTransportWorkerProtocol-DfWEEm5z.js` | C01, Direct B | 800.706 | 179.601 | 800.642 | 179.560 |
| `webview-Ww_wki6f.js` | Lazy por función | 16.109 | 3.542 | 16.064 | 3.506 |

| CSS / WASM (mismos nombres y tamaños en C06 y C11) | Fase | KB | gzip KB |
|---|---|---:|---:|
| `index-CXRuZ74B.css` | Inicial | 18.810 | 4.377 |
| `LandingPage-CwhwpLSZ.css` | Landing | 6.318 | 1.904 |
| `proceduralBeatBackground-XEAJYKk6.css` | Compartido Landing / Gallery / Desktop | 2.269 | 0.756 |
| `useAppShortcuts-BsL7gDWF.css` | Compartido Gallery / Desktop | 39.643 | 7.726 |
| `WebGalleryWorkspace-B-fJX02e.css` | Gallery | 3.488 | 1.164 |
| `mtcute-CCj5skST.wasm` | Worker, variante base | 57.363 | 28.383 |
| `mtcute-simd-BIiNGCYE.wasm` | Worker, variante SIMD | 59.241 | 28.863 |

| Cierre acumulado de JS C11 | Archivos | KB | gzip KB |
|---|---:|---:|---:|
| Inventario emitido completo, incluido worker | 24 | 3471.217 | 925.735 |
| Entrada (HTML contiene una entrada JS y ningún modulepreload JS inicial) | 1 | 235.002 | 75.038 |
| Landing | 3 | 243.758 | 79.365 |
| Llegada al gate de auth (sin sumar la carga paralela disparada por su entrada) | 4 | 280.929 | 89.263 |
| Auth y workspace descargado en la ruta Gallery, previo a Direct B | 9 | 869.755 | 280.059 |
| Cierre estático de Desktop adicional al de Gallery | 1 | 239.827 | 68.717 |
| SDK Tauri emitido aparte, la suma incluye todos sus caminos lazy | 7 | 31.590 | 8.520 |

## Atribución y ejecución

| Pieza | Chunk | Evidencia |
|---|---|---|
| `src/platform/index.ts`, `desktopAdapter.ts`, `lib/tauri.ts` | `index-GYrHnxW3` | `main.tsx → platform/index → desktopAdapter → lib/tauri` es estático. Se evalúan el detector y la constante `CLOUD_CLIENT_ID`, y se construye el adaptador con `getCloudClientId()` antes de escoger Web. Sus métodos nativos quedan como funciones. `initTauri` retorna antes de importar SDK cuando falta la marca Tauri. También se ejecuta el ID propio Web. |
| `@tauri-apps/api/core`, `event`, `path`, `webview` | `core-DhEqZVGG`, `event-CnyWr2tN`, `path-DpyQXOHZ`, `webview-Ww_wki6f` | Lazy desde el adaptador, wrappers nativos o arrastre. `webview` incluye `window`, `dpi`, `image` y arrastra `core` + `event`. El grafo de entrada y Gallery no contiene estos chunks en sus cierres estáticos. |
| `@tauri-apps/plugin-{dialog,fs,shell}` | `index-D7bH7vXg`, `index-Caz5qzUX`, `index-DDgTLpJK`, respectivamente | Lazy. `dialog` y `shell` dependen de `core`, `fs` también de `path`. `directTelegramDataPlane.ts` tiene un import estático de `plugin-shell` en fuente, pero el módulo carece de callers en `src` y no aparece en el build emitido. La referencia efectiva a shell sale de `desktopAdapter.external.openUrl`. |
| `DesktopExperience → App → BeatGalerApp → AppShell/useBeatGalerComposition` | `DesktopExperience-BJdhqfxz` | Lazy tras seleccionar Desktop. Contiene `LibraryUxBridge`, `dropStaging`, `useNativeLibraryDrop`, controlador de reproducción anterior y otros hooks exclusivos. La rama Web que aún aparece dentro de `BeatGalerApp` queda encerrada en este import. |
| `AuthExperienceGate`, utilidades y componente legacy `AccountGate` | `WebGalleryEntry-Dpnwpqxx`, `AccountGate-DKtrhVbB` | Gallery/Login/Signup activan el primero. Evalúa los módulos compartidos de auth y usa las funciones de restauración/estatus. El componente legacy `AccountGate` lo monta Desktop. Landing no necesita esos chunks. |
| `CatalogAppShell → BeatCard/Drawer`, `useAppShortcuts` | `WebGalleryWorkspace-D0FTOMe1` + `useAppShortcuts-DUVdSBv_` y deps | Workspace y dependencias se evalúan al abrir la ruta, antes de autenticarse; el shell React espera a la cuenta y resolución POSTGRES. Los imports estáticos de la UI compartida retienen `lib/tauri` incluso si se desacopla el adaptador. La inspección nativa de PROJECT en BeatCard requiere `canInspectNativeProject`; el Drawer tiene el camino de catálogo `onCatalogSave`. El atajo por sí solo son ~0.839 KB por mapa. |
| Pager/INDEX del árbol anterior | Ausencia del árbol en la ruta Web; restos en `index` y chunks C01 | T25 deja un estado retirado con el flag desactivado. `webAdapter` (~10.702 KB por mapa) y `webLibraryWindow` (~2.233 KB) siguen en entrada. El primero mezcla API Web viva con métodos antiguos de biblioteca, reproducción, edición y descarga. Esas cifras describen módulos completos, sin adjudicar todo su peso a INDEX. |

Atribución de entrada por intervalos del sourcemap, asignados desde cada segmento mapeado al siguiente límite en la misma línea. `desktopAdapter` 6.978 KB y `lib/tauri` 21.135 KB (~11.96% de `index` juntos). Rollup registra 10.849 y 30.806 KB de `renderedLength` durante el renderizado previo a la minificación final. Los mapas aproximan bytes de código generado por módulo; el gzip de un módulo dentro de un chunk compartido no es separable de forma aditiva. El ahorro real de las costuras requiere un build comparativo.

## Relación con C01

| Conjunto | KB | gzip KB | Alcance |
|---|---:|---:|---|
| `webRememberedDirectPreconnect` + `webStartupPlaybackCoordinator` | 58.479 | 16.270 | Exclusivos del camino diferido de C01. El segundo contiene `webGalerCloudTransport` (~14.855 KB), `webPlaybackSource` (~25.491 KB) y el coordinador (~5.191 KB) según mapa. |
| Protocolo / cliente de worker | 800.706 | 179.601 | Chunk `webTransportWorkerProtocol`; incluye SDK de transporte compartido. `mp3PlayablePrefix`, `libraryPresentationCache` y `AccountGate` son otras dependencias del camino C01 que ya usa Gallery. |
| Worker emitido | 1292.482 | 309.665 | Mismo archivo para ambos caminos, con instancias separadas. El mapa contiene `webTransport.worker.ts` y mtcute. WASM separado en la tabla anterior. |
| C01 más protocolo y worker, con Gallery ya disponible | 2151.667 | 505.536 | Escenario de caché fría de esos archivos; el peso compartido seguirá requerido por Direct B. La expiración/logout puede cargar el coordinador y sus imports sin crear worker. |
| Direct B más protocolo y worker, con Gallery ya disponible | 2098.316 | 491.721 | Incluye `catalogDirectPort` y excluye los dos chunks exclusivos de C01. El prewarm de Gallery se arma tras /context autenticado y capacidad Direct; espera visibilidad, con demora inicial de 250 ms. |

`AccountGate.loginBeatGalerAccount → prepareWebDirectForSignIn → getWebStartupPlaybackCoordinator → WebGalerCloudTransport → worker.prewarm()`. `webAdapter.cloudData.disconnect` importa directamente el coordinador en expiración/logout. Con catálogo activo `cloudAuth.syncSession` evita su prewarm legacy. La Gallery restaurada normalmente carga Direct B por el proveedor de catálogo. Los 58.479 KB / 16.270 KB son una atribución en este build, no una predicción de la latencia ni un presupuesto de regresión para desbloquear C01.

## Verificación local y límites

| Comprobación | Tipo | Resultado |
|---|---|---|
| Build con cerrojo exclusivo | Compilación Web | Falló el primer arranque antes de construir (`ERR_UNSUPPORTED_ESM_URL_SCHEME`); corregido el URL de Windows del auxiliar. PASS, 988 módulos, 49.21 s, exit 0. Avisos de import mixto estático/dinámico de `lib/tauri.ts` y chunks >500 KB. Cerrojo liberado. Guard de red en `deny`, 0 intentos. |
| Inventario y mapas | Inspección de artefactos | `PASS inventario 24/24 JS; 0 SHA-256 idénticos; 23 chunks Rollup; 988 IDs en grafo` (el worker se emitió en un grafo aparte). `PASS correspondencias JS=24, igual sin URL mapa=10, igual también sin hashes=23`. |
| Sonda con `vm.SourceTextModule` + jsdom | Ejecución del JS minificado con fakes, desde disco | Los primeros arranques requirieron fakes para Performance, Canvas, matchMedia y ResizeObserver. Ejecución final exit 0, 2/2 rutas, 0 errores jsdom, 0 intentos de red. En `/` se evaluaron 3 JS y se mostró Landing; en `/gallery` sin sesión se evaluaron 9 JS y se mostró login. En ambas se observó una lectura Tauri desde `lib/tauri.ts:17` y la generación de su UUID desde `:25`; 0 chunks del SDK, 0 `DesktopExperience`, 0 workers. CSS/preload y HTTP fueron simulados. No se indujo un login ni se ejecutó Tauri real. |
| Pruebas a conservar para las costuras | Comportamiento con fakes + inspección de artefactos | `webNoTauri.test.ts` comprueba llamadas Tauri en el adaptador; complementarlo con la entrada compilada y una Gallery autenticada falsa para detectar nuevas evaluaciones o descargas SDK. `webGalleryWorkspaceComposition.behavior.test.tsx` protege selección POSTGRES y fail-closed. Un smoke Desktop con bridge falso debe probar que el lazy monta y usa IPC esperado. Contrastar el inventario pre/post con el mismo flag y la misma minificación. |

