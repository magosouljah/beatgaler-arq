> **HISTÓRICO — congelado el 2026-11-21. No es estado vigente.** Evidencia de la pasada 1 sobre `5cb6ccc`. Entrada vigente: [README](../../README.md).

# Zona 07 — Pruebas, CI, scripts e infraestructura

**Origen:** informe de sub-agente de solo lectura, pasada 1. **Commit:** `5cb6ccc`. **Fecha:** 2026-11-11.
**Marcas:** FIRME = leído en repo/historial de CI; PROVISIONAL = inferido.
Alcance: `gh` usado solo con `run list` / `run view --json jobs`. No se ejecutó ninguna prueba ni se leyeron logs de CI. Duraciones = `updatedAt − startedAt`.

## F. Pruebas y CI

### F1. Inventario de suites

| Grupo | Archivos | Runner | Protege | Script npm | Workflow que lo ejecuta |
|---|---|---|---|---|---|
| `tests/component-dom` | 98 (~451 casos) | vitest + jsdom | UI Web: 48 `web*` (transporte navegador, reproducción), 11 `catalog*`, pagos 4, auth | `test:component:dom` | Completo solo en `direct-persistent-vault-assignment` y `test-desktop-portability`; 9 archivos en `web-production-build`; los `catalog*` en `catalog-checks` |
| `tests/integration` | 52 (~191) | vitest + jsdom | Frontend; 35 de 52 solo leen código fuente | `test:integration` | Igual que arriba; 1 archivo en `web-production-build` |
| `tests/unit` + `tests/component` | 8 + 1 | tsc → node | Lógica pura | `test:unit:ts` | Igual que arriba |
| `tests/e2e` + `tests/e2e-harness` | 9 + 7 | wdio + tauri-service | Desktop | `test:e2e:desktop`, `test:e2e:import/downloads/recovery` | Ninguno |
| `tests/e2e-web` | 25 (6 .md, 4 e2e, 8 `.test.*`) | wdio Chrome / node:test | Web real multi-cuenta (Stage1, Step15, v1-public), humo | Solo `test:web:smoke` | Humo en los dos workflows "completos"; el resto, ninguno |
| `tests/playback-b…g`, `-compare`, `-direct`, `-post-fix` | 42 (17 .md) | scripts ad hoc | Investigación de reproducción (Phase 2) | Solo `test:playback:transport-boundary` (1 archivo) | Ninguno |
| `tests/catalog-harness` | 8 | wdio Chrome + vite | Catálogo en navegador | Ninguno (suite `web` de `scripts/catalog-check.cjs`) | Ninguno: el push no incluye `web` |
| Sueltos `tests/v1-*.test.*` (7), `step15-…guard`, `apply-dependency-patches`, `web-wav-master`, `visual/` | 12 | node:test / bash | Despliegue y operaciones V1 | Ninguno | Ninguno |
| `cloud-server/tests/catalog` + `catalog-harness` | 33 + 6 (~217) | node:test vía `catalog-check.cjs` | Catálogo PostgreSQL | Ninguno | `catalog-checks` |
| `cloud-server/tests` raíz | 122: billing 25, direct 22, postgres 12, cuentas ~25, library/index/project ~12 | node plano / node:test (56) | Pagos, cuentas, control-plane PG, transporte servidor / INDEX | `test:unit:cloud` (36), `test:auth-hardening` (18), `test:billing-v1` (13) + 4 `*-pg` | `billing-v1-*`, `auth-*`, `d6`, `d7`, `direct-persistent`, `f3-*` |
| `scripts/regression-*` | 17 | node plano | Guardas de texto fuente | `test:regressions` | `direct-persistent`, `d6`, `web-production-build` |
| `src-tauri` (Rust) | 63 `#[test]` | cargo | Desktop | `test:unit:rust` | Solo workflows Desktop manuales |

**Sin ningún script ni workflow (FIRME, por búsqueda de nombre):**
- **Servidor (14):** `access-runtime-consumers`, `billing-web-portal-route`, `capacity-load-harness(.test)`, `deployment-promotion-contract.test.mjs`, `direct-index-operation-liveness`, `direct-managed-token-retry`, `direct-message-download`, `direct-stale-operation-cleanup`, `library-beat-quota.test`, `operations-runtime`, `pending-signup-activation`, `plan-dev-switch-removed`, `post-deploy-smoke.test.mjs`, `postgres-bootstrap-observability`, `startup-vault-recovery`, `user-storage-lifecycle`.
- **Servidor, solo desde scripts de fase** (`v1-local-pg-integration.sh`, `step15-*`, que nadie invoca): 8 integraciones PG (`access-*`, `library-*`, `project-access`, `postgres-cutover`).
- **Frontend:** `tests/e2e/controlled-backend` y `desktop-smoke`, todos los `tests/v1-*`, `apply-dependency-patches.test.mjs`, `web-wav-master.browser.mjs`, `tests/E2EImportHarness.tsx` (duplicado del de `e2e-harness/`), y todos los `stage1-*.test.*` y `phase2-*.test.mjs` de `e2e-web`.
- `wdio.v1-public.conf.mjs` no lo referencia nadie.

`npm test` / `npm run check` incluyen `cargo test` y `build` con parche de Tauri: la puerta local documentada sigue atada a Desktop (FIRME, `package.json`).

### F2. Los 31 workflows

| Grupo | Workflow | Disparador | Ejecuta | Mediana / máx | Estado |
|---|---|---|---|---|---|
| Desktop | `build-macos` | manual | DMG universal | ~15 min / 1 valor atípico de 24 h | 7 de 18 ok; último 21-ago |
| Desktop | `build-windows` | manual | Instalador + Authenticode | ~12 min / 70 min | 17 de 20 ok; último 3-sep |
| Desktop | `fast-build-macos-test` | manual | Build de prueba | ~20 min / 26 min | 1 de 4 ok; 20-ago |
| Desktop | `release-desktop-updater` | manual | Publica release | 50 s | 4 de 4; 21-ago |
| Desktop | `test-desktop-portability` | manual (desde 27-oct) | Único "todo": web + unit + DOM + integración + cloud + regresiones + restore PG + supply chain + Windows/macOS | 2,3 min / 8,7 min | 0 ok en 30 (12 fallos, 18 cancelados) |
| Desktop | `test-windows-authenticode` | PR con paths (incluye `package.json`) | Guard en runner Windows | 31 s | 30 de 30; 7-sep |
| Desktop | `f4-release-controls` | PR paths `release/`, manual | Canales del updater | 16 s | 30 de 30; 5-sep |
| Pagos | `billing-v1-policy`, `-migrations`, `-persistent-checkout`, `-durable-webhook`, `-lifecycle`, `-reconciliation` | PR con paths | `test:billing-v1` + integraciones PG 18 acumulativas | 21–41 s | Verdes; último 27-oct |
| Pagos | `billing-v1-polar-sandbox-e2e-preflight` | PR paths, manual | Todo lo anterior | 56 s | 0 de 30: falla el paso de checkout |
| Pagos | `billing-v1-polar-sandbox-smoke` | manual (secretos Polar) | Humo real contra sandbox | — | Nunca ejecutado |
| Pagos | `f3-17.1`, `17.2`, `18.1`, `18.2` | PR con paths | 1 archivo de test cada uno | ~20 s | Verdes; último 5–12 sep |
| Cuentas | `auth-public-registration-hardening` | PR→main paths, manual | `test:auth-hardening` + 2 integraciones PG | 35 s | 23 de 30 |
| Cuentas | `d6-cross-process-authz` | todo PR | Claim PG entre procesos + contención HTTP | 35 s | 310 de 310 |
| Cuentas | `d7-direct-capabilities` | PR con paths | Capability boundary unit + PG | 36 s | 0 ok en 30: el job unit falla en 0 s |
| Cuentas | `probe-task-5.1-…` | PR con paths | `build:web` + typecheck + 1 regresión | 50 s | 30 de 30 |
| Transporte | `direct-persistent-vault-assignment` | PR paths (`src/features/**`, `tests/**`…) | unit cloud + PG + typecheck/unit/DOM/integración + regresiones + humo web | 74 s / 220 s | 0 ok en 30 |
| Catálogo | `catalog-checks` | push solo a la rama de trabajo, con paths | 19 suites en serie contra PG 16 | 147 s / 517 s | 22 de 29 |
| Catálogo | `catalog-g0-postgres-probe` | push si cambia su YAML | Sonda PG | 20 s | 2 ejecuciones |
| Operaciones | `web-production-build` | PR con paths | 10 archivos vitest + `build:web` + sintaxis de scripts de deploy | 31–52 s | 3 ok de 30; el último (7-nov) verde |
| Operaciones | `public-operations-validation` | PR paths + lunes 11:23 UTC | Caducidad de `security.txt` + `bash -n` | 15 s | 30 de 30 |
| Operaciones | `f3-20.1-observability` | PR con paths | 1 test | 16 s | Verde; 5-sep |
| Otros | `f0-0.20-secret-scan` | todo PR + push a main | gitleaks | 12 s | 321 de 321 |
| Otros | `migration-checks-with-logs` | manual | typecheck + suites + builds | — | Nunca ejecutado |

**Nombres de fase que siguen protegiendo algo vivo:**
- `f0` (escaneo de secretos), `d6` (control-plane PG), `probe-5.1` y `f3-20.1`: vivos, con nombre obsoleto. `probe-5.1` es de facto el único "la web compila" en verde.
- `d7`: protege un módulo vivo (`direct-capability-boundary.js`, requerido por `server.js`), pero siempre en rojo.
- `f3-17.1`, `17.2`, `18.1`: prueban `billing-checkout.js`, `billing-webhook.js`, `billing-entitlements.js`, que ningún archivo no-test requiere. PROVISIONAL (no se descarta carga dinámica).
- `f4`: solo Desktop.

**Solapamientos (FIRME):**
- `f3-18.2` ejecuta el mismo `billing-reconciliation.test.cjs` que `billing-v1-reconciliation`.
- `f3-17.2` ejecuta el mismo `billing-webhook.test.cjs` que `billing-v1-durable-webhook`.
- `f3-17.1` y `billing-v1-persistent-checkout` no se solapan: módulos distintos, y el antiguo parece muerto.
- Entre los `billing-v1-*`: `test:billing-v1` corre en 6 workflows, la integración de migraciones en 5, `checkout-pg` en 5, `webhook-pg` en 4. Un PR que toque `cloud-server/migrations/**` lanza 5 workflows de pagos casi idénticos.

`deployment-promotion-contract` no es un workflow: es `cloud-server/deployment-promotion-contract.mjs` más un test huérfano.

### F3. Duraciones y lo que corre realmente

- **Push típico a la rama de trabajo:** solo `catalog-checks`, y solo si toca sus paths (FIRME). Los otros 29 se disparan por PR, programado o manual; no hay PR abierto.
- **Tendencia de `catalog-checks`:** 45–67 s (8-nov) → ~210 s (9–10 nov) → 490 y 517 s (11-nov). Hoy son unos 8,6 min.
- **Qué domina:** el paso único `catalog-check` (469 de 513 s). Contenedores ~30 s, `npm ci` ~7 s.
- **Fallos:** 7 de 29 (24 %), cada uno seguido de un push de arreglo. Al menos 3 fueron aserciones de texto o conteo, no de comportamiento: número de migraciones fijo (`29b2823`, `7825b8a`) y una cabecera SQL que rompió un test de contrato (`5392b2f`). `5cb6ccc` vuelve a "renumerar a 40 migraciones".
- **Reejecución dentro del mismo push:** `scripts/catalog-suites.json` contiene 127 referencias a 61 ejecutables únicos. `run-vitest.mjs` aparece 13 veces y `postgres-schema.test.cjs` 12. Las 17 integraciones PG corren una vez cada una.
- **Hueco de paths:** el YAML solo lista las migraciones 0026–0030; existen 0031–0040. Un push que solo toque una migración nueva no dispara CI (FIRME).
- **Suites completas de frontend:** ninguna ejecución verde en CI en el historial visible. `direct-persistent` falla en "TypeScript unit, component and integration suites" (66 s) y antes en la guarda `regression-direct-manager-only`, lo que salta `test:unit:cloud`. Causa no investigada (sin logs).
- **Coste real de esas suites:** bajo. El `component-dom.log` versionado (sep) marca 27,7 s para 68 archivos; `integration.log`, 13,9 s para 42; el paso DOM en CI, 35 s. PROVISIONAL para el tamaño actual.
- **Antes de un despliegue:** nada obligatorio. `scripts/deploy-web-production.ps1` solo hace `npm ci` + `build:web` y humos posteriores (FIRME).
- **Si se abriera PR a `main`:** ~20 workflows en paralelo, 1,5–3,5 min de reloj, con 3–4 rojos crónicos. No correría `catalog-checks`: es solo push y lleva `if: github.ref == …/local/landing-gallery-unificada`. Tras un merge, el catálogo quedaría sin CI (FIRME).
- **Más de 2 meses sin ejecutarse:** todos los de Desktop, `f3-*`, `f4`.
- **Rama ajena:** `Design Lab standalone` (no existe en esta rama) hizo 274 ejecuciones en 9 días con 53 % de fallos.

### F4. Pruebas que no protegen o están duplicadas

- **Texto fuente en vez de comportamiento, frontend (FIRME, conteo por grep):** 38 de 52 archivos de `tests/integration` usan `readFileSync`; 35 no importan nada de `src/`. Ejemplo: `tests/integration/appPlaybackExtraction.test.ts` hace `expect(appSource).not.toContain('cookingPlaybackUrlRef')`. Son los 25 `app*Extraction`, `appMigrationCharacterization` (18 lecturas) y varios `issue97*Contract`.
- **Ídem en DOM y scripts:** 11 de 98 en `component-dom` (8 sin import de `src`). `scripts/run-regressions.mjs` (559 líneas, 68 lecturas, ~250 aserciones de texto) y los `regression-phase9cd/12/12b/12c` son del mismo tipo.
- **Servidor:** 23 de 122 tests raíz leen archivos (~11 con aserciones regex sobre el fuente; p. ej. `plan-dev-switch-removed.test.cjs`, `d8-ro-resolutions.test.cjs`) y 11 de 33 de catálogo. Estimación: ~20–25 % del servidor toca texto fuente y ~10 % depende principalmente de él (PROVISIONAL).
- **Investigaciones puntuales:** `tests/playback-*` (42 archivos, 17 .md) y Stage1/Phase2 en `tests/e2e-web`. Solo `playback-f/transport-boundary.test.mjs` tiene script. Ojo: `tests/playback-b/worker.ts` lo leen 3 tests de integración y `scripts/regression-web-bound-temp-rpc.mjs`, que sí corre en 2 workflows.
- **Desktop:** `tests/e2e` (9), `e2e-harness` (7), 63 tests Rust, ~41 scripts y 7 workflows.
- **INDEX legacy, morirán con él (PROVISIONAL, por nombre):** `atomic-library-index`, `fresh-vault-index-bootstrap`, `vault-index-pointer-store`, `master-index-flood-wait`, `direct-index-operation-*`, `library-index-publication.*`, `direct-session-start-index-degraded`; en frontend `issue97IndexPriority`, `mtcuteIndexLivenessGuard`, `atomic-library-index-ci`, `phase2Task2*`. Los 22 `direct-*` dependen de la decisión de transporte.
- **Código aparentemente muerto con test propio:** los tres módulos `f3` citados.

### F5. Opciones (sin elegir; combinables)

| Opción | Cada push | Antes de desplegar | Bajo demanda / archivo | Compromiso |
|---|---|---|---|---|
| A. Push mínimo + puerta única | Secretos + typecheck/build web + catálogo `unit` (~1–2 min) | Todo: catálogo 19 suites (~9 min) + DOM/integración (~1 min) + pagos/cuentas PG (~1 min) en paralelo, ~9–10 min | Desktop, Polar sandbox, LAB/perf | Push rápido; los fallos de integración PG aparecen tarde, el día del despliegue |
| B. Lo mismo de hoy, deduplicado y en paralelo | Catálogo en jobs paralelos y 127→61 ejecuciones (estimado 3–4 min, no medido) | Igual que el push + frontend completo | Igual | Misma protección; más YAML y minutos de runner; no arregla los rojos crónicos |
| C. Un workflow por sistema, por paths | Solo el sistema tocado: pagos 12→1 (~1 min), cuentas 3→1, web 1 (~1,5 min), catálogo | Todos los sistemas | Desktop | Mínima espera; las regresiones cruzadas (`server-core.js` compartido) se escapan salvo corrida completa nocturna o pre-deploy |
| D. Archivar y limpiar primero | Lo que quede vivo | Ídem | A archivo: 7 workflows Desktop, `f3-17.1/17.2/18.1`, `tests/playback-*`, Stage1/Phase2/Step15; los tests de texto fuente, a convertir o retirar | Menos ruido y menos fallos por texto; se pierde la guarda de refactor de `App` y la reactivación inmediata de Desktop (recuperable por git) |

Hecho transversal: hoy ninguna puerta impide desplegar con pruebas rojas ni exige que hayan corrido.

## G. Infraestructura

| Dato | Marca |
|---|---|
| Web estática servida por nginx desde `/var/www/beatgaler-web/current` (symlink a `releases/<fecha>-<sha12>`, conserva 5) | Verificado en repo (`deploy/web/install-web-production.sh`) |
| Dominios `beatgaler.com`, `www` (301), `status.beatgaler.com` (página estática), `api.beatgaler.com` (host SSH y referencia DNS) | Verificado en repo (`deploy/web/beatgaler.com.conf`, instalador) |
| TLS con Let's Encrypt (`certbot --nginx`); recarga con `systemctl reload nginx` | Verificado en repo |
| Cloud API = proceso Node en `127.0.0.1:4000` tras `/beatgaler-api/` (límite 2 MiB; subida PROJECT 2 GiB / 30 min sin buffering) | Verificado en repo (conf) |
| Cómo se instala, arranca o reinicia el proceso Cloud (unidad systemd, usuario, directorio) | No está en el repo; no hay script de despliegue de Cloud ni de migraciones (FIRME, ausencia) |
| EC2 `i-0053e156e4646e799`, `us-east-2`, `t3.micro`, 913 MiB sin swap, EBS gp3 8 GiB, Elastic IP, Amazon Linux 2023, SSM | Según documento (`BLUEPRINT/OPERATIONS/INCIDENT-2026-10-27-EC2-NETWORK.md`), sin verificar |
| PostgreSQL en RDS `galer-cloud-prod` | Según el mismo documento, sin verificar. El contrato `docs/operations/TASK-5.2-AWS-PRODUCTION-CONTRACT.md` dice "RDS o equivalente" y se declara NO-GO / solo preparación |
| Producción exige `DATABASE_URL`, SSL `require`, autoridad `postgres` | Verificado en repo solo como requisito (`scripts/v1-deploy-preflight.mjs`); nadie invoca ese preflight |
| Secretos: AWS Secrets Manager + KMS | Código verificado (`cloud-server/secret-envelope-provider.js`); aprovisionamiento según documento |
| Correo SES | Código verificado (`cloud-server/account-email-ses.js`); uso real sin verificar |
| Versión publicada `v0.9.0-beta.2`, SHA `a8418223…` | Según documento (`BLUEPRINT/CURRENT-STATE.md`, 27-oct) |
| Staging / preview | No existe en el repo; solo el contrato huérfano `deployment-promotion-contract.mjs` |
| Docker, pm2, S3, CloudWatch, Route 53 | Sin menciones en `deploy/`, `docs/operations/`, `BLUEPRINT/`, `scripts/`, `cloud-server/` |

**Cómo llega una versión a producción (verificado en repo; 100 % manual, ningún workflow despliega):**
1. Una persona ejecuta `scripts/deploy-web-production.ps1 -KeyPath <clave SSH>` desde Windows; exige árbol git limpio.
2. `npm ci` → `npm run build:web` → escribe `source-sha.txt` → tar.
3. `scp` a `ec2-user@api.beatgaler.com:/tmp` y `ssh sudo install-web-production.sh`.
4. El instalador verifica DNS y SHA, cambia el symlink, corre certbot, recarga nginx y hace humos locales (`/web-health`, SHA, `/beatgaler-api/auth/health`, `security.txt`). Si falla, restaura release y config anteriores.
5. El script compara el SHA público.

Cloud y las migraciones PG: procedimiento no versionado; el runbook dice "Deploy/restart the control-plane service" sin comando.

**Contraste documento ↔ código:** `docs/operations/PHASE-3-PUBLIC-LAUNCH-GAP.md` afirma que el instalador no restaura el symlink si falla; el instalador actual sí lo hace (`cleanup_install`). `docs/operations/GITHUB-WORKFLOW.md` dice "29 workflows activos"; esta rama tiene 31, `origin/main` 29, más 3 en `.github/workflows-archive/`.

Workflows de esta zona: `web-production-build` solo compila; `public-operations-validation` es semanal; `f4-release-controls` es del updater de Desktop, no de Web.

## Scripts y residuos

**`scripts/` (119):**

| Propósito | Nº | Ejemplos |
|---|---|---|
| Desktop / empaquetado / updater / release | 41 | `test-windows-*`, `updater-*`, `release-*`, `run-tauri.ps1`, `wry-patches/`, `run-*-e2e.mjs` |
| Guardas de regresión y runners | 21 | `regression-*` (17), `run-regressions`, `run-unit-tests` |
| Catálogo: arnés, LAB, benchmark | 19 | `catalog-check.cjs`, `catalog-suites.json`, `catalog-lab/`, `catalog-bench/` |
| Investigaciones de fase | 18 | `stage1-*`, `step15-*`, `phase2-*`, `run-playback-*` |
| Despliegue / operaciones V1 | 9 | `deploy-web-production.ps1`, `v1-*`, `test-public-operations-pages` |
| Utilidades dev / versión | 8 | `version.mjs`, `github-save`, `fix-*.ps1` |
| Supply chain | 3 | `check-npm-licenses`, `check-workflow-action-pins` |

- **Referenciados directamente** por `package.json` o un workflow: 51. Indirectamente (otro script, test o config): ~49.
- **Sin ningún referente ejecutable: 19:** `apply-phase8b2-runner-patch`, `bg-data-plane-worker.cjs`, `build-release-with-youtube.ps1`, `bump-version`, `set-version`, `distribution.xml`, `macos-postinstall.sh`, `fix-app-casing.ps1`, `fix-remaining-build-errors.ps1`, `prepare-f4-25.1-embedded-driver`, `test-f4-25.1-functional-matrix` (solo workflow archivado), `run-phase2-task2-pointer-attribution`, `run-stage1-multi-account-tests`, `step15-prep-suite`, `check-studio-playbar`, `v1-local-pg-integration.sh`, `v1-local-postgres-recovery.sh`, `catalog-bench/catalog-v10-soak.cjs`, `catalog-bench/generator.smoke.test.cjs`. Varios son puntos de entrada manuales legítimos; "sin referente" no significa muerto (PROVISIONAL).
- **Dependencia viva inesperada:** `vite.config.ts` importa `scripts/stage1-proxy-timing.mjs`, un script de investigación (FIRME).
- **`cloud-server/scripts` (18):** 13 en `cloud-server/package.json`; `post-deploy-smoke.mjs`, `step15-*` (2) y `polar-sandbox-daily-repair-code.cjs` sin script; `catalog-native.cjs` es la CLI del catálogo.

**Residuos:**

| Elemento | Versionado | Qué es / uso |
|---|---|---|
| `component-dom.log` (566 KB), `integration.log` (820 KB), `regressions.log` | Sí, pese a `*.log*` en `.gitignore` (9-sep) | Salidas antiguas con fallos (1 de 68 y 9 de 42); nadie las usa |
| `PHASE-8A.txt`, `PHASE-9.txt` | Sí (ago) | Notas de E2E Desktop; sin referencias |
| `TESTING.md` | Sí (ago) | Desfasado: describe 3 suites unit y puerta Desktop |
| `GATES.md` | Sí (sep) | Acta histórica de Stage1 / Phase 2, no puertas de CI |
| `VERSION` | Sí | `0.9.0-beta.1` frente a `package.json` `0.9.0-beta.2`; causa documentada del fallo `version:check` |
| `create-dev-beats.ps1` + `dev-beats/` (8 mp3 + 8 txt) | Sí (ago) | Beats de demo; `dev-beats` citado en `src/lib/tauri.ts` y `SetupModal.tsx` |
| `start-beatgaler-cloud.ps1` | Sí | Lanzador local con ruta `E:\777\app\beatvault` (obsoleta); solo lo cita un test huérfano |
| `Local PostgreSQL-Setup-Tasks-temp/` | Sí, 2 .md (sep) | Plan antiguo; sin referencias |
| `plan-postgresql.zip` | No (ignorado por `*.zip`) | No abierto |
| `design-lab/`, `DESIGN/` | No | Solo contienen `dist/` (y `gallery-visual-check`), ignorado; restos de la rama `design/…` |
| `release/` (5 JSON) | Sí | Manifiestos y controles de Desktop; usados por scripts `release-*`, `updater-*`, `f4` |
| `supply-chain/runtime-sources.json` | Sí | Pins de runtimes para builds Desktop |
| `patches/@fuman+io+0.0.21.patch` | Sí | Vivo: se aplica en `postinstall`; su test es huérfano |
| `migration/` (4 .md) | Sí | Plan de migración antiguo |
| `beatgaler-console.jpg`, `Claude outputs/` | No | No tocados |

## Dudas y límites

- No se sabe por qué fallan `d7`, `direct-persistent`, `web-production-build` ni `test-desktop-portability`: solo hay nombre de paso y duración. Hace falta leer logs o ejecutar localmente.
- No se pueden desglosar los ~470 s de `catalog-check` por suite; el salto 215 → 490 s coincide con `72b0c1f` (búsqueda por gramas). PROVISIONAL.
- La ref local `origin/local/landing-gallery-unificada` está en `c6d7b7c` (7-nov), pero CI corrió sobre `3c569c8`: la ref está desfasada. No se puede afirmar si `5cb6ccc` está subido; no tiene ejecución.
- `gh run list` global devuelve 1000 ejecuciones (22-oct → 11-nov); lo anterior se consultó por workflow, 30 cada uno.
- "Huérfano" y "muerto" se basan en búsqueda de nombres y `require` estáticos.
- No se midieron tiempos locales (LAB WSL, benchmarks T20, wdio): si la espera que molesta al propietario es local, no aparece en estas cifras.
- Todo lo de EC2 / RDS proviene de documentos de octubre; no se accedió al entorno.

## Anexo — Desktop/Tauri mezclado con Web (medido por el arquitecto, FIRME)

- 33 de 196 archivos TypeScript de `src` importan `src/lib/tauri.ts` (24 importan valores, 4 solo tipos; el resto mezcla). 6 importan `@tauri-apps/*` directamente.
- `src/lib/tauri.ts`: 1.358 líneas, 136 exports; casi todo son órdenes `invoke` de Desktop (carpetas locales, plantillas, YouTube, offline, updater). Sin Tauri devuelven `null`/`[]`/no-op en silencio (`:50-65`, `:127-134`).
- `src/platform/`: seam con dos adapters (`webAdapter.ts` 186 líneas muy densas, `desktopAdapter.ts` 155), 20 puertos (`contracts.ts` 220), 22 capabilities (`capabilities.ts`). 35 archivos importan `platform`.
- Compuertas `platform.capabilities.*`: `SettingsPanel` 10, `AppShell` 10, `Drawer` 8, `useTrashActions` 3, `useBeatGalerComposition` 3, y 6 archivos más con 1.
- `src-tauri/`: 8 archivos Rust, 15.993 líneas; último commit que lo tocó: `f3e3ac7` (2026-10-21).
- Dependencias Desktop en `package.json`: `@tauri-apps/api`, `plugin-dialog`, `plugin-fs`, `plugin-shell`, `@tauri-apps/cli`, `@wdio/tauri-plugin`, `@wdio/tauri-service`. `npm test` incluye `cargo test`.
- 26 archivos en `tests/` y `scripts/` con nombre Desktop evidente (tauri, desktop, mac, windows, authenticode, updater, portability); la zona 07 cuenta 41 scripts y 7 workflows de Desktop.
