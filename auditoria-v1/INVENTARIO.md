# Inventario Web + Cloud (propiedad del Director)

**Pendiente:** generar inventario exhaustivo del árbol Git a SHA fijo antes de emitir porcentajes.
**Último SHA observado al configurar:** `4e66638051effe888e66a885010065d98fc7df17` (no es una lectura completa).

El árbol de esa revisión contiene 1,459 archivos en total (incluye Desktop, documentación, imágenes y pruebas), por lo que NO son 1,459 archivos de código Web/Cloud ni representan cobertura auditada.

Catalogar: `src/`, `cloud-server/`, migraciones SQL, `tests/`, scripts de apoyo y workflows aplicables. Documentar exclusiones justificadas (dependencias generadas, assets binarios, Desktop/Tauri salvo cruces con Web), entrypoints, rutas dinámicas y todos los módulos. Cada item debe vincular a MAPA, COBERTURA y flujos cuando se analice.

**Base histórica:** [ESTADO-DIAGNOSTICO.md](../ESTADO-DIAGNOSTICO.md) (commit `5cb6ccc`); revalidar, no copiar conclusiones antiguas como actuales.

## Corte reproducible inicial — 2026-11-20 12:00, SHA `4e66638051effe888e66a885010065d98fc7df17`
Fuente primaria: GitHub Git Trees `GET /repos/magosouljah/BeatGaler/git/trees/<SHA>?recursive=1`; `truncated=false`; 1.459 entradas tipo blob. Clasificación por primer componente de ruta, sin inferir ejecución:

| Carpeta | Blobs | Clasificación provisional |
|---|---:|---|
| `src/` | 269 | Web: app, features, components, platform, styles y assets; activo/legacy por archivo pendiente |
| `cloud-server/` | 455 | Cloud, SQL, pruebas, scripts; no todos son runtime |
| `tests/` | 288 | Pruebas Web/integración/e2e/harness, no ejecutadas |
| `scripts/` | 165 | Soporte/benchmark/laboratorio, no runtime por defecto |
| `src-tauri/` | 78 | Desktop excluido salvo interfaces Web |
| `docs/` | 87 | Documentación e hipótesis, no código operativo |
| `.github/` | 34 | Workflows, incluidos archivados |
| `public/` | 6 | Assets Web |
| `deploy/` | 11 | Despliegue/config, solo lectura de artefactos |
| `BLUEPRINT/` | 11 | Diseño/documentación, estado por confirmar |
| `dev-beats/` | 16 | Datos/fixtures desarrollo |
| `release/` | 5 | Artefactos release |
| `migration/` | 4 | Herramientas migración |
| `Local PostgreSQL-Setup-Tasks-temp/` | 2 | Setup temporal |
| `patches/` | 1 | Parches |
| `supply-chain/` | 1 | Metadatos supply chain |
| raíz | 26 | Manifiestos, configuración, entrypoints por confirmar |

**Subclasificación reproducible:** `src/`: `features` 190, `components` 22, `assets` 19, `app` 9, `platform` 8, `lib` 9, otros 12. `cloud-server/`: archivos directos 133, `catalog` 25, `migrations` 42, `tests` 230, `scripts` 22, otros 3. `tests/`: `component-dom` 118, `integration` 52, `e2e-web` 25 y otros 93. `scripts/`: directos 105, `catalog-lab` 45, `backup` 8, `catalog-bench` 5, `wry-patches` 2.

**SQL:** `cloud-server/migrations/0001_control_plane.sql` hasta `0042_catalog_reused_bots.sql` (42 archivos). Nombre no prueba migración aplicada; catálogo aparece en 0026–0042. **Pendiente:** inventario por archivo con denominador de código operativo, separación activo/legado, relaciones dinámicas y ownership. No atribuir C1 a la lectura del árbol.

## Corte panorámico 13:00 @ `4e66638051effe888e66a885010065d98fc7df17`
Contraste por lectura directa de `catalogLibraryProvider.tsx:1-110`, `catalogApi.ts:1-110`, `catalogQueryStore.ts:1-110`, `CatalogGalleryWorkspace.tsx:1-19` y `CatalogAppShell.tsx:70-99,125-145,180-193`.

| Subsistema en `src/features/library/catalog/` | Entradas y responsabilidades verificadas estáticamente | Estado |
|---|---|---|
| Composición | `catalogLibraryProvider.tsx` fabrica servicios por cuenta/época: API, commands, store, interaction, playback, media, mutations, caches y transfer; `teardown` es parte del contrato | ACTIVO en composición POSTGRES, C2 solo de tramo |
| UI Gallery | `CatalogGalleryWorkspace.tsx` delega a `CatalogAppShell.tsx`; este conecta GalleryChrome, BeatCard, VirtualGallery y Player | ACTIVO en rama catálogo, C2 parcial |
| Consulta | `catalogApi.ts` declara DTO, filtros, errores y transporte HTTP de metadatos; `catalogQueryStore.ts` controla bloques, cursores, estados y límites de memoria | ACTIVO en rama catálogo, C2 parcial |
| Medios | `catalogLibraryProvider.tsx:79-110` crea DirectPort condicional a capabilities, transfer, media y cachés; import dinámico `catalogDirectPort` (o `catalogLabDirectPort` solo DEV) | ACTIVO condicional; implementación interna PENDIENTE |

No se han enumerado todos los archivos de esos subsistemas ni clasificado sus tests. Los 1.459 blobs siguen siendo denominador total del repositorio, no cobertura funcional.


## Corte panorámico 14:00 @ `4e66638051effe888e66a885010065d98fc7df17`
Sin delta de rama. Nueva subclasificación **por lectura de contenido**, sin cambiar denominador de 1.459 blobs: `cloud-server/catalog/queries.js` = motor ACTIVO de consulta SQL (parseo, canonicalización, filtros, páginas; C2 solo tramos); `cloud-server/catalog/cursor.js` = módulo de firma/verificación HMAC de cursores, sin DB/red (C2 de interfaz y errores); `src/features/library/catalog/catalogApi.ts` = HTTP metadata + clave local; `catalogQueryStore.ts` = estado y reutilización de bloques. La ruta `routes.js` monta GET /catalog/v1/beats sobre `queries.listBeats`. No contar migraciones aplicadas ni declarar C0 por archivo exhaustivo: clasificación activo/legado del resto sigue pendiente.

## Delta de inventario 15:00 — HEAD `9680c73da477cc9bcd201a036490d736bb6a7b12`
Compare contra `4e66638051effe888e66a885010065d98fc7df17`: 11 commits, seis rutas modificadas (3 módulos Cloud: `direct-transport-control.js`, `http-containment.js`, `server-core.js`; 2 tests Cloud: `abuse-controls.test.cjs`, `direct-managed-token-retry.test.cjs`; 1 documento post-LIVE). **No se ha regenerado árbol recursivo ni denominador** para HEAD nuevo: los 1.459 blobs y distribución por carpetas pertenecen al SHA anterior y no deben presentarse como conteo certificado del nuevo. Los tres módulos Cloud afectados son activos por rutas/llamadas ya documentadas, pero el detalle de cambios y dependencias transversales requiere delta exhaustivo.

## Corte 16:00 — delta HEAD `45ec5b27e778127414537d01d170e0b972777768`
GitHub compare `9680c73da477cc9bcd201a036490d736bb6a7b12`→HEAD: 3 commits y tres archivos modificados: `cloud-server/direct-transport-control.js` (gateway ACTIVO, requiere revalidación), `cloud-server/tests/direct-managed-token-retry.test.cjs` (prueba escrita), `docs/plans/catalogo-postgresql/PENDIENTES-POST-LIVE-2026-11-20.md` (documento, no runtime). No hay cambios Web en este delta. Árbol completo del nuevo HEAD NO regenerado; los 1.459 blobs siguen certificados únicamente para SHA inicial. Nuevo avance panorámico: `useCatalogGalleryScope.ts` controla borradores React de filtros, mientras `catalogQueryStore.ts` posee sort y consulta; `CatalogAppShell.tsx` conecta UI con ambos. Estado activo verificado por imports/callers @9680c73da477cc9bcd201a036490d736bb6a7b12, no prueba de bundle desplegado.


## Corte panorámico 17:00 — HEAD `b6b999526f77054a199c74fadb39d2171ac4eb75`
Compare con `45ec5b27e778127414537d01d170e0b972777768`: **4 commits, 20 rutas** (14 modificadas y 6 añadidas, según compare: 11 Cloud incluyendo 2 tests y `state-dir.js` nuevo, 3 deploy/scripts AWS nuevos, 1 script de prueba UI nuevo, 1 script de audio modificado y 2 docs; clasificación exacta por listado de compare, no conteo de árbol). En realidad el listado contiene **20 rutas: 13 Cloud (11 modificadas, 2 añadidas), 3 deploy/scripts AWS añadidas, 1 script de prueba UI añadido, 1 script audio modificado y 2 docs (1 añadida, 1 modificada)**. No hay cambios en `src/` del delta. El total 1.459 corresponde SOLO al SHA inicial: árbol recursivo y denominador activo @HEAD aún pendientes.

**Nuevo sistema inspeccionado por contenido:** `cloud-server/state-dir.js` (31 líneas) es nuevo módulo de ruta de estado persistente; `server.js:1-95` lo importa y llama `assertProductionStateDir()` al iniciar. Clasificación: Cloud runtime ACTIVO por import directo; `state-dir.js` resuelve `BEATGALER_STATE_DIR`, permite fallback local y bloquea configuración productiva ausente, inexistente o dentro de release. No verificar configuración real. `cloud-server/catalog/native-transport-provisioning.js` modificado: membresía externa bajo lock, `ready` requiere prueba; lectura focalizada, no C3. Archivos nuevos `deploy/aws/*`, `scripts/aws/deploy.sh` son scripts de despliegue, **no ejecutados**; `scripts/catalog-lab/probe-e2e-ui.mjs` es prueba/laboratorio, no evidencia runtime.


## Corte panorámico 18:00 — HEAD `c59ec82b9dbf63a5158fa2cdfee27b71a27ba7e8`
Compare `b6b999526f77054a199c74fadb39d2171ac4eb75`→rama LOCAL: 2 commits, tres rutas modificadas: `cloud-server/runtime-operability.js` (Cloud runtime ACTIVO, contenido inspeccionado @HEAD), `cloud-server/tests/runtime-operability.test.cjs` (test escrito, no ejecutado), `docs/plans/catalogo-postgresql/EVIDENCIA.md` (documentación, no runtime). No cambia `src/`, `cloud-server/catalog/queries.js` ni `cursor.js` ni `catalogQueryStore.ts` en ese delta. **Denominador 1.459** continúa siendo únicamente del SHA inicial; no se ha reconstruido árbol completo @HEAD.
Submódulo nuevo clasificado por lectura: `runtime-operability.js:3-103` configura límites HTTP, identidad de despliegue, dependencia de PostgreSQL y rutas `/healthz` y `/readyz`; importa `operations-runtime`. ACTIVO probable por integración Cloud, montaje exacto en HEAD pendiente de reconfirmación; C1 parcial, C2 de tramo. `/healthz` no verifica PostgreSQL; `/readyz` sí realiza `SELECT 1` cuando hay pool. No inferir salud del producto real.


## Corte panorámico 19:00 — reproducción Web y delta de tests
Código inspeccionado @ `b52649f04a1f7166763c7d26f40ac4b3337828c8`: `src/features/library/catalog/catalogPlaybackSession.ts` (sesión/cola/shuffle, ACTIVO por provider); `catalogMediaClient.ts` (grants, lease, MSE/Blob, artwork, ACTIVO por provider); `catalogLibraryProvider.tsx` (compositor por cuenta y cleanup, ACTIVO); `useCatalogGalleryScope.ts` (puente UI/audio, ACTIVO). Son **cuatro módulos concretos**, no un inventario exhaustivo de `src/`. Dependencias: session→media por `acquireSource`; provider→ambos; scope→session y `useAudio`. Estado legado: ninguno inferido de esos imports; Desktop excluido.
Compare `b52649f04a1f7166763c7d26f40ac4b3337828c8`→rama LOCAL: ahead 2, 5 rutas modificadas: `cloud-server/tests/catalog/catalog-fence.integration.cjs`, `catalog-native-cli.integration.cjs`, `catalog-schema.integration.cjs`, `catalog-search-text.integration.cjs` (tests escritos; no ejecutados) y `scripts/catalog-suites.json` (manifiesto de suites, no runtime). No cambios de los módulos Web anteriores. Los **1.459 blobs** corresponden únicamente al SHA inicial; árbol completo y denominador activo del HEAD nuevo **PENDIENTES**. Sin porcentaje de comprensión.


## Transición oficial a main — 2026-11-20 20:00 CST
HEAD `ad8f8d0436bba5c3f663a301440ebf977200d953`; fuente anterior LOCAL y sus 1.459 blobs son **HISTÓRICOS**, no denominador de main. Comparación con último SHA investigado `b52649f0`: 8 commits, 174 rutas cambiadas (151 added, 14 modified, 9 removed). Grupos observados en delta: `.agents/skills/` documentación de herramientas; `DESIGN/` laboratorio de UI, no asumir producción; `BLUEPRINT/` documentación; `cloud-server/tests/catalog/` pruebas; `cloud-server/scripts/step15-*` arneses retirados; `.github/workflows/` CI. Código operativo Web `src/features/library/catalog/` y Cloud `cloud-server/catalog/` verificado por lectura puntual @main; PostgreSQL es dependencia declarada en provisioner. Estado de INDEX legacy **INCIERTO** hasta AUD-010. Árbol recursivo main y conteo por carpeta pendientes; no inventar cobertura.


## Corte 21:00 — main `ad8f8d0436bba5c3f663a301440ebf977200d953`
Compare respecto al corte main 20:00: identical, 0 archivos afectados. Revisión panorámica por contenido @SHA: `src/app/WebGalleryWorkspace.tsx` (entrada/composición Web ACTIVO), `src/features/library/catalog/catalogComposition.ts` (flag/selección ACTIVO), `LibraryCompositionGate.tsx` (presentación estados ACTIVO), `cloud-server/server-core.js` (bootstrap Express, routers catalog, auth/billing y handlers legacy coexistentes; ACTIVO). `package.json` contiene suites legacy INDEX y Desktop aún enumeradas: scripts de test **no prueban alcanzabilidad runtime**. Clasificación INDEX Web Gallery: rama legacy renderiza aviso de retiro; Cloud INDEX y otros entrypoints INCIERTOS. Denominador completo main pendiente; no reutilizar 1.459 de LOCAL.


## Panorama main 22:00 — árbol completo @ `ad8f8d0436bba5c3f663a301440ebf977200d953`
GitHub Git Trees recursivo `?recursive=1`: **truncated=false; 1.582 blobs** (conteo de archivos, NO de módulos activos ni cobertura). Grupos representativos: `cloud-server/tests/` 218, `src/features/` 190, `tests/component-dom/` 118, `DESIGN/MASTER/` 52, `DESIGN/shared/` 44, `cloud-server/migrations/` 42, `cloud-server/catalog/` 25, `.github/workflows/` 32, `src/app/` 8; Desktop `src-tauri/` fuera de alcance. Los conteos son por prefijo de dos niveles, no sumas de sistemas exclusivos. `cloud-server/catalog/legacy-fence.js` y `cloud-server/index-reconciliation.js` existen: estado operativo por caller aún INCIERTO. `server-core.js` monta router nativo; rutas upload mencionadas en logger no prueban registro. `ensureEmptyIndexForStorage` es no-op inyectado en lifecycle. El inventario de 1.582 constituye denominador físico de main, **no denominador de código operativo**; clasificar archivo por archivo y dependencias sigue pendiente.
