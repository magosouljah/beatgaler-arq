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
