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
