# Línea base de pruebas — BeatGaler V1 (`main@ad8f8d0`, 2026-11-21)

**Qué es:** el estado real de las suites Web y Cloud **antes de cualquier limpieza**, ejecutadas solo en local y con bases efímeras. Sirve para comparar cada cambio futuro: un test que hoy falla no es una regresión nueva. **No se modificó código ni tests.**

## 1. Cómo se ejecutó (aislamiento)

| Medida | Detalle |
|---|---|
| Código | Worktree desacoplado `E:\777\app\BeatGaler-baseline-wt` en `ad8f8d0` (sin `.env`, `master-session.txt` ni `transport-bots.local.json`: los archivos ignorados del checkout principal **no existen** ahí). `node_modules` por junction, retirada al terminar. |
| Entorno | `env -i` con allowlist mínima ([run-isolated.sh](herramientas/run-isolated.sh)): sin variables heredadas, `HOME/USERPROFILE` falsos, `AWS_CONFIG_FILE`/`AWS_SHARED_CREDENTIALS_FILE` inexistentes, `AWS_EC2_METADATA_DISABLED=true`, `TEMP` en E: (C: lleno), `DIRECT_DIAGNOSTICS_DIR` fuera del repo. |
| Red | Guard del repo `catalog-net-guard.cjs` precargado en **todo** proceso Node (`CATALOG_NET_POLICY=loopback`) + [deny-dev-pg.cjs](herramientas/deny-dev-pg.cjs), que bloquea el puerto 5432 (clúster de desarrollo de WSL). Resultado: **0 intentos de red bloqueados** en Cloud; ningún acceso externo. |
| PostgreSQL | Clúster **propio y efímero** PG 18.3 en WSL (`/tmp/bg-baseline-pg`, 127.0.0.1:54329, superusuario de laboratorio, contraseña aleatoria fuera del repo), detenido al terminar ([pg-start.sh](herramientas/pg-start.sh)). El clúster de desarrollo `18/main:5432` **no se tocó**. CI usa PG 16 en el catálogo: diferencia de versión. |
| Servicios reales | Ninguno: ni AWS, ni Telegram, ni Polar, ni producción. |
| Efecto en repos | Worktree y checkout principal sin cambios en archivos versionados después de las pruebas. |

## 2. Resultados

Tipo según la [clasificación heurística](datos/clasificacion-tests.json): **C** = comportamiento (ejecuta módulos), **F** = solo inspecciona texto fuente, **M** = mixto, **E** = estático o compilación.

| Suite | Comando (en el worktree, vía `run-isolated.sh <etiqueta> …`) | Tipo | Resultado |
|---|---|---|---|
| Typecheck Web | `node node_modules/typescript/bin/tsc --noEmit` | E | **PASS** (54 s) |
| Build Web | `node node_modules/vite/bin/vite.js build --mode web` (y con `VITE_CATALOG_API_ENABLED=true`, como producción) | E | **PASS** ×2 (≈37 s) |
| Unit TS | `node scripts/run-unit-tests.mjs` | C | **PASS** 8 suites + 1 componente |
| Catálogo `unit` | `node scripts/catalog-check.cjs unit` | C | **PASS** 20/20 casos (112 tests) |
| Catálogo `faults` | `… faults` | C | **PASS** 4/4 (21 tests) |
| Catálogo `T08` / `T11` / `T13` | `… T08`, `… T11`, `… T13` | C | **PASS** 6/6, 3/3 (17 tests), 5/5 |
| Vitest `tests/component-dom` | `vitest run tests/component-dom --environment jsdom` | C (107) · F (8) · M (3) | **PASS 656/656**, 0 omitidos, 0 FAIL (118 archivos)¹ |
| Vitest `tests/integration` | `vitest run tests/integration --environment jsdom` | **F (33)** · C (13) · M (4) | **180 PASS / 4 FAIL** en 3 archivos¹ |
| Cloud sin DB, por archivo | [cloud-runner.sh pass1](herramientas/cloud-runner.sh): `node cloud-server/tests/<f>` ×90 | C (79) · M (19) · F (2) | **88/88 tests PASS** (38 con `node:test` = 289 tests; 50 scripts con `assert` por código de salida). 2 no son tests (§4) |
| Cloud con PostgreSQL efímero | `cloud-runner.sh pass2` (15 `*.integration.cjs`) | C | **15/15 PASS**² (77 tests `node:test` + 7 scripts) |
| Test de catálogo fuera de toda suite | `node --test cloud-server/tests/catalog/catalog-native-transport-provisioning.test.cjs` | C | **PASS** 3/3 |
| Regresiones Web (`test:regressions`) | `node scripts/run-regressions.mjs` + 4 scripts `regression-*` | F/M | **FAIL** en el paso 7 de 11; los demás pasos ejecutados PASS (§3) |
| Tests Node de `tests/` raíz | `node --test tests/<f>` ×7 y `tests/playback-f/transport-boundary.test.mjs` | C/F | **7 PASS / 1 FAIL** (dependiente de Windows, §3) |

¹ 8 archivos de component-dom y 2 de integration no cargan `@mtcute/wasm/mtcute.wasm?url` en el worktree. La causa es que `node_modules` vive fuera de la raíz de Vite (*Denied ID*), un **artefacto del método de aislamiento**. Repetidos en el checkout principal (mismo SHA, solo `CLAUDE.md` modificado y sin `.env` en la raíz): **69/69** y **3/3 PASS**. Las cifras de la tabla ya los incluyen.
² 4 fallaron primero por un defecto de mi runner, que no creó las bases vacías. Repetidos con la base creada: PASS. `direct-persistent-legacy-lazy.postgres` **depende del orden**: en CI se ejecuta después de `direct-vault-assignment.postgres` sobre la misma base, que le deja el esquema. Con ese orden: PASS.

## 3. FAIL reales (no corregidos; ninguno es un fallo de comportamiento del producto demostrado)

Los cuatro marcados «obsoleto tras T25» buscan texto que eliminó el commit `b52649f` (comprobado con `git log -S`).

| Test | Causa | Tipo |
|---|---|---|
| `tests/integration/appStartupBootstrapExtraction.test.ts` | Espera `import { preconnectRememberedWebDirec…` en el texto fuente de la Gallery | F, **obsoleto tras T25** (preconexión antigua retirada) |
| `tests/integration/issue97PlaybackOptimization.test.ts` | Espera `useEffect(() => { preconnectRemembere…` en el texto | F, obsoleto tras T25 |
| `tests/integration/issue97RuntimeWebFollowup.test.ts` (2) | Igual, y además espera `function storedBeatTopicCandidates(` en el texto de `server-core.js` (topics/INDEX retirados) | F, obsoleto tras T25 |
| `scripts/regression-direct-manager-only.mjs` (paso 7 de `run-regressions.mjs`) | Exige que el *wrapper* Direct reciba `indexPinAuthority`, retirado en T25 | F, obsoleto tras T25. Corta la cadena: los pasos 8–10 se ejecutaron aparte (PASS) y el 11 (empaquetado Windows/Desktop) no se ejecutó |
| `tests/v1-public-browser-guard.test.mjs` | Espera la ruta POSIX `/workspace/tmp/…` y recibe `E:\workspace\tmp\…` | Depende de la plataforma (Windows); **probablemente PASS en Linux (SUPUESTO)** |

## 4. No ejecutadas, omitidas o que no son pruebas

| Elemento | Motivo |
|---|---|
| Catálogo `integration`, `T03`, `T05`–`T07`, `T09`, `T10`, `T12`, `T14`–`T17`, `T19` (24 archivos de `cloud-server/tests/catalog`) | **No ejecutables localmente por diseño.** El descriptor `catalog-test-descriptor.json` solo admite el service container de CI (`host: postgres`, PG 16, `instance_id gha-…`), y parchearlo está prohibido. Evidencia registrada, **no verificada en esta sesión**: CI `catalog-checks` 44845218018 verde (E89, `EVIDENCIA.md`) |
| Catálogo `web` (Chrome + wdio) | Requiere un chromedriver en caché dentro del `TEMP` de C:, y C: está lleno (55 MB). No ejecutado |
| `perf`, `T18`, `T20`, `T21` | Registradas `pending` (sin casos) |
| `postgres-live.integration.cjs` | Prohibido (escribe en DB por `DATABASE_URL` heredada) |
| `postgres-restore.verify.cjs`, `*.worker.cjs` | Herramienta de verificación y procesos hijo de otras integraciones, no suites |
| `cloud-server/tests/capacity-load-harness.cjs` | Herramienta: sale con error sin `--target`. No es test |
| `cloud-server/tests/email-verification-fake-pool.cjs` | Helper sin tests (salida vacía, exit 0) |
| `npm test` / `test:fast` / `test:unit:cloud` (agregados) | **Rotos:** `test:unit:cloud` referencia `fresh-vault-index-bootstrap.test.cjs` y `vault-index-pointer-store.test.cjs`, eliminados en T25. Además incluyen `cargo test` (Desktop). Sus archivos existentes se ejecutaron uno a uno |
| Rust/Tauri, `test:e2e:desktop*`, empaquetado, `build-*`, updater | Desktop fuera de alcance |
| `tests/e2e-web` (24), `tests/e2e`, `tests/visual`, `test:web:smoke` | Requieren servidores en marcha, navegador o cuentas reales; no ejecutados |
| `tests/playback-b/-c/-compare/-d/-direct/-e/-g/-post-fix` | No los referencia ningún runner actual, salvo scripts de fase antiguos; no ejecutados. Candidatos a revisión en la limpieza |
| Polar sandbox (`smoke`, `e2e`), `aws-secret-provider-smoke` | Servicios reales |

## 5. Hallazgos para la limpieza (comprobados)

1. **Ningún workflow ejecuta en `push` a `main` las suites Web generales ni Cloud.** `tests/integration`, `test:unit:cloud` y los billing solo corren en `pull_request` o `workflow_dispatch`; en `push` solo corren `catalog-checks` (con filtro de rutas), el escaneo de secretos y el design lab. Que los cambios lleguen a `main` sin PR es un **SUPUESTO** coherente con los 4 tests obsoletos que nadie detectó.
2. **El filtro de `catalog-checks` no incluye las migraciones 0031–0042**.
3. **Inspección de texto fuente:** 33 de 50 archivos de `tests/integration` son F y 4 son M. Ante una refactorización pura fallarán sin que cambie el comportamiento, y no la protegen. Las suites que sí protegen un refactor son component-dom (107 C), el arnés del catálogo y Cloud (79 C).
4. **Orden implícito:** `direct-persistent-legacy-lazy.postgres` depende de que otro test haya dejado el esquema creado.
5. Un test de catálogo (`catalog-native-transport-provisioning.test.cjs`) no pertenece a ninguna suite.

## 6. Repetir la línea base

```bash
git -C E:/777/app/BeatGaler worktree add --detach E:/777/app/BeatGaler-baseline-wt <SHA>   # si no existe
cmd //c "mklink /J E:\777\app\BeatGaler-baseline-wt\node_modules E:\777\app\BeatGaler\node_modules"
cmd //c "mklink /J E:\777\app\BeatGaler-baseline-wt\cloud-server\node_modules E:\777\app\BeatGaler\cloud-server\node_modules"
R=<logs>/run-isolated.sh; $R <etiqueta> <comando de la tabla §2>
# PG efímero (solo pass2): wsl -d Ubuntu -u postgres -- bash .../pg-start.sh ; al final pg-stop.sh
# AL TERMINAR quitar las junctions ANTES de borrar el worktree (rmdir solo quita el enlace):
cmd //c "rmdir E:\777\app\BeatGaler-baseline-wt\node_modules" && cmd //c "rmdir E:\777\app\BeatGaler-baseline-wt\cloud-server\node_modules"
```

Las herramientas están en [herramientas/](herramientas/); en ellas los logs viven fuera de los repos (`E:\777\app\BeatGaler-baseline-logs\`). Datos: [resultados.json](datos/resultados.json) (saneado) y [summary.txt](datos/summary.txt). **Para un cambio, repetir solo las suites afectadas** y compararlas con esta tabla. Los FAIL de §3 no cuentan como regresiones mientras no cambie su causa.
