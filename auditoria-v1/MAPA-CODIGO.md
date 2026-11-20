# Mapa vivo del código — comprensión completa de BeatGaler V1

**Estado:** por levantar y contrastar con el código vigente. Propietario de escritura: Director.

Objetivo: poder explicar y navegar el proyecto sin releer todo. Para cada sistema, describir responsabilidades, por qué existe, ubicación, entrypoints, interfaces, dependencias, propietarios de estado, tablas/archivos/medios, flujos de datos, errores, recuperación, pruebas y puntos de cambio. Marcar `VERIFICADO@SHA`, `PROVISIONAL` o `PENDIENTE`.

No basarse solo en `import`: investigar requires dinámicos, rutas, middlewares, factories, eventos, handlers y SQL/triggers. Distinguir ACTIVO, LEGACY, DESCONOCIDO. Desktop solamente como frontera de Web.

**Hipótesis iniciales:** los siete informes en [pasada-1/zonas/](../pasada-1/zonas/) y [ESTADO-DIAGNOSTICO](../ESTADO-DIAGNOSTICO.md); revisión anterior, NO mapa vigente certificado.

## Sistemas y relaciones
Pendiente de inventario validado.

## Glosario de conceptos y responsabilidades
Pendiente. Explicar conceptos al propietario en lenguaje comprensible con nombres del código.

## AUD-001 — Arranque y selección de autoridad (parcial, verificación estática @ 4e66638051effe888e66a885010065d98fc7df17)
Web: `src/main.tsx` monta la experiencia Web; `src/app/WebExperience.tsx` decide rutas; `WebGalleryEntry.tsx` entra a la compuerta de autenticación; `WebGalleryWorkspace.tsx` toma identidad activa y composición. La autoridad se decide en `src/features/library/catalog/catalogComposition.ts`: `VITE_CATALOG_API_ENABLED` distinto de `true` => LEGACY; `true` => resolver contexto y seleccionar CATALOG o BLOCKED. `LibraryCompositionGate.tsx` muestra resolución, legacy, catálogo o bloqueo; bloqueo NO cae a INDEX. Código fuente verificado directamente en el SHA; detalles de restauración de sesión y lifecycle de servicios descritos en [AUD-001](runs/20261120T0330-investigador-AUD-001.md) siguen **provisionales** hasta revisión de sus archivos completos. **Dónde modificar:** flag/decisión en `catalogComposition.ts`; representación de estados en `LibraryCompositionGate.tsx`; composición UI en `WebGalleryWorkspace.tsx`. Estado ACTIVO/LEGACY en producto no determinado por lectura estática del flag: requiere configuración efectiva del build.

## AUD-001 — Autoridad SQL y provisión de transporte (verificación estática parcial @ 4e66638051effe888e66a885010065d98fc7df17)
- `cloud-server/catalog/authority.js:168-193`: `resolveContext` consulta biblioteca PostgreSQL en transacción read-only; si existe y su autoridad es POSTGRES, devuelve contexto, **sin inspeccionar membresía del bot**. Si falta, evalúa elegibilidad y emite `LIBRARY_NOT_PROVISIONED` o bloqueo.
- `authority.js:195-245`: `provisionLibrary` usa transacción SQL, lock `vaults` por usuario, revalida predicado, inserta biblioteca/generación/chat, revoca capacidades legacy y confirma; ante error SQL revierte. **No incluye red Telegram** en la transacción.
- `cloud-server/catalog/routes.js:48-79`: router expone GET contexto y POST provisión; POST hace commit de biblioteca primero y después llama al `transportProvisioner` opcional. Montaje real del router y middleware superiores aún PENDIENTES.
- `native-transport-provisioning.js:19-59`: valida chat y asignación, bloquea membresía, comprueba activación/bot, usa gateway para asegurar membresía y marca READY. Estado durable en assignment store; prueba gateway externa no atómica con SQL. El comportamiento completo del store y gateway está PENDIENTE.
- `src/features/library/catalog/catalogApi.ts:194-216`: cliente solo invoca POST de provisión tras `LIBRARY_NOT_PROVISIONED`; GET 200 devuelve ready directamente. Punto de cambio: estrategia de reconciliación de membresía, sin prescribir implementación.
Evidencia: [checkpoint 05:25](runs/20261120T0525-investigador-AUD-001.md) y contraste directo del Director. No equivale a runtime comprobado.

## AUD-001 — Frontera HTTP y membresía (contraste Director 07:00, estático @ 4e66638051effe888e66a885010065d98fc7df17)
`cloud-server/catalog/routes.js:48-69`: factory Express `createCatalogRouter` requiere `authenticate`, aplica `Cache-Control: no-store`, responde 503 si faltan autoridad o consultas; wrapper de handler autentica antes de invocar servicios y normaliza errores. `routes.js:71-79` ejecuta provision SQL antes de asegurar membresía; `routes.js:130-135,179-184` vuelve a asegurar membresía antes de IMPORT/REPLACE y direct/session si los servicios están montados. `native-transport-provisioning.js:19-59`: valida chat, usa lock de membresía, lee activación/bot, retorna si ready; si pending consulta gateway y solo marca ready tras prueba positiva, de lo contrario lanza `BOT_MEMBERSHIP_PENDING`. `cloud-server/server.js:1-123` configura composición inicial y dependencias, pero **no demuestra por sí mismo el montaje del router**. PENDIENTE: rastrear instalador de rutas y middlewares globales, assignment store, gateway y pruebas. [Informe investigador 06:30](runs/20261120T0630-investigador-AUD-001.md).

## AUD-001 — Montaje HTTP confirmado (Director 08:00, estático @ 4e66638051effe888e66a885010065d98fc7df17)
`cloud-server/server.js:304-313` importa `server-core` tras configurar el bootstrap. `cloud-server/server-core.js:115-138` instala CORS/OPTIONS, parser JSON específico para prefix packs y parser general, y registra `app.use(createCatalogRouter({currentCatalog*(), authenticate: authenticatedUser, ...}))`; la factory recibe referencias a servicios existentes en ese momento. `server-core.js:1114-1121` toma bearer token y llama `getAuthUserFromToken` (implementación de sesión aún pendiente). `catalog/routes.js:48-79` aplica `no-store`, autentica por handler y delega contexto/provisión. **Dónde modificar:** composición/middlewares en `server-core.js`, arranque en `server.js`, endpoints y mapeo de errores en `catalog/routes.js`. Evidencia [07:32](runs/20261120T0732-investigador-AUD-001.md) y lectura primaria Director. C2 **solo de este tramo**, no del archivo `server-core.js` completo. No hay prueba de runtime ni de autorización profunda de cada servicio.


## AUD-001 — Sesiones y transporte durable (Director 09:00; verificado estáticamente @ 4e66638051effe888e66a885010065d98fc7df17)
- **Identidad:** `cloud-server/server-core.js:1031-1082` carga `accounts-data.json` a mapas en memoria, conserva sesiones no vencidas, escribe usuarios/sesiones a temporal y renombra; crea token aleatorio, almacena clave derivada por hash y expira en lookup. El catálogo recibe el autenticador del servidor; **owner de sesiones** es `server-core.js`, no el catálogo SQL. No se ha comprobado operación multiproceso, almacenamiento desplegado ni todos los endpoints auth. Modificar sesiones aquí, no en `catalog/routes.js`.
- **Asignación:** `cloud-server/direct-vault-assignment.js:115-170` asigna un bot a un vault en PostgreSQL mediante transacción, advisory lock global y `FOR UPDATE`, seleccionando el bot de menor cantidad de asignaciones. `:174-193` mantiene lock advisory de sesión durante el callback externo; `:195-229` persiste estado `pending/ready/repair` y permite guardia por bot. **Owner durable**: `vaults` y `transport_bots` en PostgreSQL; modificar selección/locks aquí.
- **Prueba externa:** `cloud-server/direct-transport-control.js:425-461` invita/promueve mediante MASTER, consulta participante y verifica visibilidad por Bot API `getChat` (hasta 8 intentos). `catalog/native-transport-provisioning.js:19-59` exige prueba `ready===true` y mismo bot antes de persistir READY; si falla mantiene pendiente. **Límite:** verificación estática del camino, no fiabilidad remota ni exhaustividad de otros escritores. [Informe 08:30](runs/20261120T0830-investigador-AUD-001.md).

## AUD-001 — Identidad de consultas Gallery (Director 10:00, estático @ 4e66638051effe888e66a885010065d98fc7df17)
`src/features/library/catalog/catalogApi.ts:224-227` define `filtersKey`: normaliza búsqueda, deduplica tags y los ordena mediante comparación lexicográfica de serializaciones decimales de bytes; esto **no equivale** a comparar bytes UTF-8 numéricamente. `src/features/library/catalog/catalogQueryStore.ts:109` inicializa `snapshot.queryKey`; `:355-358` lo usa para decidir si evita cargar de nuevo cuando hay bloques. La clave es **identidad del estado de consulta del cliente**, no orden SQL de resultados. Punto de cambio: canonicalización en `catalogApi.ts`, semántica de reuse/reset en `catalogQueryStore.ts`. Pendiente: otros consumidores, contrato de servidor, impacto de variaciones equivalentes. [Checkpoint 09:30](runs/20261120T0930-investigador-AUD-001.md); comprobación independiente limitada a rangos citados. No C2 del store completo.

## AUD-001 — Identidad, caché y revalidación Gallery (Director 11:00; estático @ `4e66638051effe888e66a885010065d98fc7df17`)
`catalogApi.ts:223-227` define `filtersKey` de filtros+sort (sin estado propio). `catalogQueryStore.ts:355-359` es dueño de `snapshot.queryKey`, bloques y generación: si coincide clave y existen bloques, no recarga; si cambia, publica consulta y carga primera página. `:261-284` siembra bloque local **provisional** y revalida con SQL; si la revalidación falla y sigue provisional, retira bloques. `:371-405` refresca bloques residentes tras mutación, conservando tarjetas confirmadas mientras obtiene páginas y reintentando ante cambios de revisión. `catalogLibraryProvider.tsx:170-205` es dueño de composición/ciclo de servicios: espera `/context` ready, verifica identidad de autoridad antes de usar caché local, crea store nuevo y dispara revalidación. **Dónde modificar:** normalización/identidad en `catalogApi.ts`; políticas de bloques, retry y refresh en `catalogQueryStore.ts`; identidad de cuenta y siembra de caché en `catalogLibraryProvider.tsx`. Pendiente: callers UI, implementación completa de caché y contrato de normalización SQL. [Informe 10:30](runs/20261120T1030-investigador-AUD-001.md); C2 solo de tramos.

## Panorama v2.1 — sistemas y puntos de modificación (C0 por árbol, NO C2 por esta tabla)
Fuente: árbol Git completo @ `4e66638051effe888e66a885010065d98fc7df17`; las relaciones marcadas como verificadas proceden de contrastes primarios AUD-001, las demás son candidatas por estructura.

| Sistema/carpeta | Función y estado | Entrada / ownership / dependencia | Dónde modificar / límite |
|---|---|---|---|
| `src/app` + `src/main.tsx` | composición Web; ruta Gallery catálogo/legacy VERIFICADA estáticamente | `WebGalleryWorkspace` → `LibraryCompositionGate`; selección de modo | cambiar composición en `WebGalleryWorkspace.tsx`; resto de app PENDIENTE |
| `src/features/library/catalog` | consultas, estado y caché Gallery; tramo ACTIVO condicionado por flag | `catalogLibraryProvider` posee servicios; `catalogQueryStore` posee bloques/clave/generación; Cloud es autoridad | filtros en `catalogApi.ts`, store en `catalogQueryStore.ts`; UI callers PENDIENTES AUD-002 |
| `src/features/auth` | identidad Web; INCIERTO por archivo | `activeWebAccount` consumido por Gallery; endpoints pendientes | trazar auth UI y Cloud en lote posterior |
| `src/components`, `src/features` restantes | componentes/funcionalidades Web; INCIERTO | inventariados por árbol; no se presume ruta activa | descomponer subcarpetas en próximas pasadas |
| `cloud-server/server.js` + `server-core.js` | arranque Express, middlewares, sesiones; tramos VERIFICADOS | sesión JSON/memoria → bearer → router catálogo | auth en `server-core.js`; runtime global no cubierto |
| `cloud-server/catalog` | autoridad PostgreSQL, rutas y provisión; tramos VERIFICADOS | `routes.js` → `authority.js` → SQL; `native-transport-provisioning.js` → asignación/gateway | contratos y SQL restantes PENDIENTES |
| `cloud-server/migrations` | 42 migraciones SQL, estado de aplicación NO_VERIFICABLE | 0001–0042, catálogo desde 0026; triggers/índices pendientes | modificar schema solo en futuro, auditoría lectura |
| `cloud-server/direct-vault-assignment.js`, `direct-transport-control.js` | asignación durable y gateway Telegram; tramos VERIFICADOS | PostgreSQL locks/estado → comprobación externa | R-001: recuperación UI pendiente |
| `tests`, `cloud-server/tests` | suites escritas, no ejecutadas | evidencia estática potencial | cotejar contra contratos por microlote |
| `scripts`, `.github`, `deploy` | operación, CI y laboratorios; INCIERTO | no equivalen a runtime | examinar solo dependencias de Web/Cloud |
| `src-tauri` | Desktop FUERA | solo frontera con Web si se encuentra | no auditar internals |

**Regla:** C0 de árbol ≠ C1 leído ≠ C2 comprendido. Inventario de código activo y entradas dinámicas aún pendiente.

## Panorama nuevo 13:00 — frontera de servicios y UI @ `4e66638051effe888e66a885010065d98fc7df17` (estático)
| Sistema | Entrada / interfaz | Estado y dueño | Dependencias y efectos | Dónde modificar / límite |
|---|---|---|---|---|
| Composición catálogo | `catalogLibraryProvider.tsx:createCatalogServices` | Servicios por cuenta/época, `teardown()` conjunto; ACTIVO condicional | `createCatalogApi`, commands, query, interaction, playback, mutations, transfer, media, caches; `DirectPort` condicional | Incorporar servicio/ciclo de vida aquí; C2 de tramo, no lifecycle completo |
| Shell Gallery | `CatalogGalleryWorkspace` → `CatalogAppShell` | Shell presenta; `useCatalogGalleryScope` coordina borradores; ACTIVO | `GalleryChrome`→filtros, `BeatCard`→selección/play, `CatalogVirtualGallery`→store, `Player`→audio | Cambiar composición visual en Shell; reglas de filtros en scope, no en wrapper |
| Query/selección/audio | `catalogQueryStore`, `catalogInteractionStore`, `catalogPlaybackSession` | Store dueño de bloques; Interaction dueño de token/flags de selección; Playback dueño de current/lease/queue | API HTTP catálogo y cliente de medios; UI usa snapshots y callbacks | Cambios de consistencia de consulta en store, selección en interaction, audio en session; C2 por tramos |
| Frontera HTTP/Direct | `catalogApi.ts` / `catalogLibraryProvider.tsx:79-110` | HTTP solo metadatos; DirectPort condicional y cachés locales | Lazy import de puerto real o lab DEV, medios y transferencias | No inferir que Cloud transporte bytes; implementación de puerto y errores pendiente |

Evidencia: [AUD-002 12:31](runs/20261120T1231-investigador-AUD-002.md) y contraste directo de archivos @SHA. No se infiere activación en producción ni ejecución real.
