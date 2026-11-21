# Etapas 1–3 — pruebas reparadas, npm test/CI y piloto F1 (2026-11-21)

**Rama:** `local/limpieza-preparacion-20261121` (BeatGaler). Commits locales, sin push ni merge. **Base:** [LINEA-BASE](LINEA-BASE.md) en `ad8f8d0`. Pruebas ejecutadas en local y aisladas (worktree limpio o el checkout con entorno por allowlist y guard de red); PostgreSQL efímero propio en 54329. Sin AWS, Telegram, bases reales ni credenciales.

## Etapa 1 — pruebas obsoletas (commit `dcdc094`)

| Prueba | Arreglo |
|---|---|
| 3 archivos de `tests/integration` + `webStartupCloudResolutionRace` (la última pasaba en vacío) | Las aserciones de texto sobre cableado retirado en T25 se sustituyen por la **nueva prueba de comportamiento** `tests/component-dom/webGalleryWorkspaceComposition.behavior.test.tsx` (5 tests: legacy → estado retirado; POSTGRES → workspace con era/época/revisión; espera sin servicios ni cuenta; nunca la preconexión Direct del pipeline INDEX). Las aserciones de texto restantes describen el estado actual |
| `regression-direct-manager-only.mjs` | Wrappers Direct sin `indexPinAuthority`. Las comprobaciones de autenticación de rutas `/transport/*` retiradas pasan a ser una guarda AST: **ninguna ruta retirada puede volver a registrarse** |
| `run-regressions.mjs` | Las guardas de papelera/INDEX del Cloud retirado pasan a ser guardas de retirada; flood-wait en `direct-transport-control.js`; papelera de Ajustes vía `trashSource` (E58); nuevo `--skip-release` |
| `v1-public-browser-guard.test.mjs` | La aserción de ruta se comprueba de forma relativa, independiente de la plataforma |

Resultado: integration **184/184**, component-dom **661/661**, regresiones Web/Cloud PASS.

## Etapa 2 — npm test y CI (commit `07c925c`)

- `npm test` = `test:web` (typecheck, unit TS, component-dom, integration, `test:node`, `test:regressions:v1`) + `test:cloud` (`scripts/run-cloud-tests.mjs` + catálogo `unit`/`faults`). Sin Rust/Desktop ni guardas de release.
- **`scripts/run-cloud-tests.mjs`:**
  - Ejecuta cada archivo en su propio proceso, con entorno por allowlist, guard de red loopback, AWS sin configuración y diagnósticos fuera del repo.
  - Usa `dotenv` inerte (`cloud-server/tests/helpers/no-dotenv.cjs`), verificado con un `.env` falso.
  - **Se niega a ejecutarse** si `cloud-server/` contiene credenciales o estado locales. Motivo, comprobado en el código: `scripts/auth-identity-preflight.cjs` carga `cloud-server/.env` al importarse, y `direct-transport-control.js:537` / `master-storage.js:4` leen `master-session.txt` por ruta fija.
  - Con `--integration`: PostgreSQL efímero en loopback indicado de forma explícita, una base nueva por archivo, nunca el 5432 local fuera de CI ni `postgres-live`, y borra solo las bases que creó.
- **CI:** nuevo `ci.yml` (push a `main` + dispatch) con los jobs `web` y `cloud` (unitarias + integración con service container). `catalog-checks.yml` se dispara ahora con **cualquier migración** y con `cloud-server/catalog-*.js`. Los filtros de rutas están verificados con minimatch: las migraciones disparan ambos workflows; los cambios solo de docs, Desktop o DESIGN no disparan ninguno. **Los workflows de PR no se tocaron**, porque pueden ser checks requeridos de la protección de `main` y eso no se puede comprobar en local.
- Verificado en local: `test:web` PASS; `test:cloud` **88/88** + catálogo unit/faults; integración **15/15**.

## Etapa 3 — piloto F1: HTTP del catálogo Web (commit de esta etapa)

**Primero, pruebas:**
- `catalogHttpContracts.behavior.test.ts` (10 tests). Comandos de reproducción a través de `createCatalogServices` → sesión, y reintento CSRF **compuesto** con el `fetch` global coordinado: PATCH, transferencia y reproducción. Cubre que se repite una vez con el token nuevo y la misma petición, y que no se repiten los GET ni otros 403.
- `catalogHttpClients.characterization.test.ts` (28 tests). Timeout por cliente, abort del llamador, error de red, errores HTTP, cabeceras por política, limpieza del temporizador y particularidades de cada cliente.
- **Rojo demostrado sobre el código anterior:** 3 fallos en `call` del proveedor. Sin timeout (Next/Shuffle podían quedarse esperando), `TypeError` suelto en lugar de `CatalogNetworkError`, y 401 → `HTTP_401` en lugar de `UNAUTHENTICATED`.

**Simplificación en dos pasos (cada uno verificado):**
1. Los 5 comandos de reproducción pasan a `catalogCommandsApi`, que ya tenía el contrato correcto y cabeceras idénticas para esas rutas. Se elimina `call` del proveedor (5 → 4 implementaciones) y se corrigen los 3 defectos. La idempotencia sigue en el cuerpo, como exige `routes.js`.
2. Núcleo privado `catalogHttp.ts` (77 líneas): credenciales y base por defecto, timeout enlazado al abort y su limpieza, `CatalogNetworkError`, `CatalogApiError` y el mapeo de errores. Los 4 clientes conservan **su política a la vista**: CSRF, era/época, Content-Type, idempotencia/If-Match, lectura y forma de retorno, `Retry-After`, métrica 403 y JSON estricto en media. Clientes: −132/+50 líneas. Las definiciones de temporizador/abort, mapeo 401 y lectura del CSRF por defecto pasan de 4–5 a **1**. `CatalogApiError` se reexporta desde `catalogApi`, así que es la misma clase y no hay ciclo de imports.

**Cambios de comportamiento (solo defectos, cubiertos por pruebas):** los comandos de reproducción tienen ahora un timeout de 20 s, error de red tipado y 401 → `UNAUTHENTICATED`. El mensaje por defecto de sus errores sin texto del servidor pasa de «playback command failed» a «Galer Cloud HTTP n», como en el resto.

**Descartado a propósito:** unificar la política de cabeceras en un único cliente, porque las diferencias son reales (provisión sin era/época, media sin Content-Type si no hay cuerpo). Tampoco se tocó el coordinador CSRF global: sustituye el header por el de la cookie y reintenta, y los clientes mantienen su header para los casos sin coordinador.

**Verificación final (tras los dos pasos):** typecheck PASS; component-dom **699/700** (1 omitido: el caso GET de media, que no existe); integration **184/184**; catálogo **T08 y T13 PASS**; build Web con `VITE_CATALOG_API_ENABLED=true` PASS; `run-regressions --skip-release` PASS (22 guardas). No se tocó código de Cloud, así que la etapa 2 sigue vigente para Cloud.

## Pendientes (no decididos aquí)

1. `npm run test:regressions` completo falla en `version.mjs check`: `VERSION`=0.9.0-beta.1 frente a `package.json`=0.9.0-beta.2 (el bump `407cdf4` no actualizó `VERSION`), y el título HTML no lleva versión. Es una decisión de release/Desktop.
2. `webCsrfFetchCoordinator.ts:8`: un host Tailscale de desarrollo fijo en el bundle de producción. Quitarlo cambia el comportamiento en entornos de desarrollo.
3. Consolidar los workflows de PR (billing, d6, d7, f3-*, web-production-build…), que ahora en parte duplican `ci.yml`. Requiere conocer los checks requeridos de la protección de `main`.
4. `ci.yml` no se ha ejecutado en GitHub (no hubo push). Tampoco se ha comprobado allí `npm ci` + `test:web` en Linux.
5. El arnés `scripts/catalog-check.cjs` no tiene la negativa por credenciales locales; se apoya en su allowlist y su guard. Revisar si algún caso carga `direct-transport-control`.
