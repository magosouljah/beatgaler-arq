# C02 · evidencia de inspección estática

Inspección inicial y repetición de las búsquedas tras el borrado. El alcance de `.` incluye package.json, scripts/, .github/workflows/, tests/, src/, cloud-server/ del worktree, docs/ y configuraciones de Vite, Vitest y TypeScript. `$scan` excluye la carpeta evaluada y las rutas sensibles indicadas.

```powershell
# rg 15.2.0: C:\Users\GTA7\.cursor\extensions\openai.chatgpt-26.721.30844-win32-x64\bin\windows-x86_64\codex-path\rg.exe
$scan = @('--hidden','-g','!.git','-g','!node_modules','-g','!.env*','-g','!master-session.txt','-g','!transport-bots*.json','-g','!auth.json','-g','!**/playback-compare/**')
& $rg -n @scan -i 'playback[-_/\\]compare|playback.{0,16}compare|compare.{0,16}playback|a-warm-adopt-100|b-warm-100|comparison\.json' .
rg exit=1

& $rg -n @scan -g '*.{mjs,cjs,js,ts,tsx,json,yml,yaml,ps1,sh}' 'tests[/\\][^\s;,)]*\*|\*\*/[^\s;,)]*(test|spec)|specs\s*:|readdir(Sync)?\([^)]*tests|glob(Sync)?\([^)]*tests|find\s+(\./)?tests|import\.meta\.glob|require\.context' .
.\.github\workflows-archive\f4-25.1-windows-import.yml:14:      - 'tests/e2e-harness/**'
.\.github\workflows-archive\f4-25.1-windows-import.yml:15:      - 'tests/e2e/**'
.\wdio.web.conf.mjs:37:  specs: ["./tests/e2e-web/web-smoke.e2e.mjs"],
.\wdio.v1-public.conf.mjs:13:  specs: ['./tests/e2e-web/v1-public-auth-access.e2e.mjs'],
.\wdio.stage1-real.conf.mjs:104:  specs: ["./tests/e2e-web/stage1-real-multi-account.e2e.mjs"],
.\wdio.e2e.conf.mjs:11:  specs: ["./tests/e2e/**/*.e2e.mjs"],
.\.github\workflows\web-production-build.yml:12:      - 'tests/component-dom/**'
.\.github\workflows\direct-persistent-vault-assignment.yml:25:      - tests/**
.\.github\workflows\direct-persistent-vault-assignment.yml:36:      - cloud-server/tests/direct-persistent-legacy-lazy*
.\.github\workflows\direct-persistent-vault-assignment.yml:37:      - cloud-server/tests/direct-vault-assignment*
.\.github\workflows\d7-direct-capabilities.yml:7:      - 'cloud-server/tests/direct-**'
.\.github\workflows\d7-direct-capabilities.yml:8:      - 'cloud-server/tests/postgres-**'
.\.github\workflows\ci.yml:14:      - 'tests/**'
.\.github\workflows\catalog-checks.yml:17:      - cloud-server/tests/helpers/**
.\.github\workflows\catalog-checks.yml:18:      - cloud-server/tests/catalog-harness/**
.\.github\workflows\catalog-checks.yml:19:      - cloud-server/tests/catalog/**
.\.github\workflows\catalog-checks.yml:25:      - tests/component-dom/catalog*
.\.github\workflows\billing-v1-policy.yml:16:      - 'cloud-server/tests/billing-polar-daily*.cjs'
.\.github\workflows\billing-v1-polar-sandbox-e2e-preflight.yml:9:      - 'cloud-server/tests/billing-polar-daily*.cjs'
.\.github\workflows\auth-public-registration-hardening.yml:16:      - 'cloud-server/tests/*auth*'
.\.github\workflows\auth-public-registration-hardening.yml:17:      - 'cloud-server/tests/*identity*'
.\.github\workflows\auth-public-registration-hardening.yml:18:      - 'cloud-server/tests/*signup*'
.\.github\workflows\auth-public-registration-hardening.yml:19:      - 'cloud-server/tests/*session*'
.\.github\workflows\auth-public-registration-hardening.yml:20:      - 'cloud-server/tests/*email*'
.\.github\workflows\auth-public-registration-hardening.yml:21:      - 'cloud-server/tests/*provider*'
.\.github\workflows\auth-public-registration-hardening.yml:22:      - 'cloud-server/tests/*pending*'
.\.github\workflows\auth-public-registration-hardening.yml:23:      - 'cloud-server/tests/account-lifecycle*'
.\tests\catalog-harness\wdio.catalog-harness.conf.mjs:20:  runner: "local", specs: [path.join(here, "catalog-harness.e2e.mjs")], maxInstances: 1, logLevel: "warn", bail: 0,
.\DESIGN\shared\coverSources.ts:4:const imported = import.meta.glob("./assets/real-covers/*.{jpg,jpeg,png,webp,avif}", { eager:true, query:"?url", import:"default" }) as Record<string,string>;
.\scripts\run-cloud-tests.mjs:45:  const files = readdirSync(testsDir).filter((f) => !NEVER.has(f)).sort();
rg exit=0

& $rg --no-heading -n @scan -g '*.{js,cjs,mjs,ts,tsx}' 'report\.mjs|\b(import|require)\s*\(\s*[^"'\s]' scripts/ tests/ src/ cloud-server/ | Select-String -Pattern 'playback|report\.mjs'
scripts/run-playback-direct.mjs:8:import { summarizeRun, csv, markdown } from '../tests/playback-direct/report.mjs';
scripts/run-playback-direct.mjs:243:  summary.harness_sha256 = Object.fromEntries(['scripts/run-playback-direct.mjs', 'tests/playback-direct/worker.mjs', 'tests/playback-direct/report.mjs', 'tests/playback-direct/build.mjs', 'tests/playback-c/instrument.mjs', 'tests/playback-d/instrument.mjs'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
scripts/run-playback-direct.mjs:246:  const auth = await import(pathToFileURL(path.join(buildDir, 'auth.mjs')));
scripts/run-playback-direct.mjs:247:  const { measureMp3PlayablePrefix } = await import(pathToFileURL(path.join(buildDir, 'mp3.mjs')));
scripts/run-playback-b.mjs:8:import { summarize, metrics, csv, markdown } from '../tests/playback-b/report.mjs';
scripts/run-playback-b.mjs:121:  const auth = await import(pathToFileURL(path.join(buildDir, 'auth.mjs')));
tests/playback-e\rebuild-report.mjs:304:  '`node tests/playback-e/run-suite.mjs --phase main`, luego `--phase controls`, después `--phase supplement`, y `node tests/playback-e/rebuild-report.mjs --collect`; ejecutar finalmente `node tests/playback-e/rebuild-report.mjs` verifica todos los hashes y reconstruye el reporte. Requiere Cloud/PostgreSQL y `.env.stage1` como Test D. Las trazas comprimidas y sus hashes están en `traces/manifest.json`.', ''
scripts/run-phase2-task0-measurements.mjs:6:import { normalizePhase2Task0Run, validateDirectPostgresPreflight } from "./phase2-task0-report.mjs";
tests/playback-direct\report.test.mjs:3:import { summarizeRun, csv } from './report.mjs';
tests/playback-direct\rebuild-report.mjs:4:import { summarizeRun, csv, markdown } from './report.mjs';
tests/playback-direct\rebuild-report.mjs:19:  summary.report_rebuilt_with_sha256 = createHash('sha256').update(fs.readFileSync(new URL('./report.mjs', import.meta.url))).digest('hex');
tests/playback-d\report.mjs:14:if (!series.length) throw new Error('Usage: node tests/playback-d/report.mjs --series d1=dir,d2-warm=dir,d2-raw=dir,... --out tests/playback-d');
tests/playback-d\rebuild-report.mjs:28:const result = spawnSync(process.execPath, [path.join(here, 'report.mjs'), '--series', arg,
tests/playback-c\report.mjs:12:  console.error('Usage: node tests/playback-c/report.mjs --normal dir1,dir2,... [--suppress dir] [--early dir] --out directory');
tests/playback-b\report.test.mjs:3:import { summarize, metrics } from './report.mjs';
tests/playback-b\rebuild-report.mjs:3:import { summarize, metrics, csv, markdown } from './report.mjs';
tests/playback-b\rebuild-report.mjs:6:if (!process.argv[2] || !fs.existsSync(path.join(directory, 'trace.jsonl'))) throw new Error('Usage: node tests/playback-b/rebuild-report.mjs <result-directory>');
tests/e2e-web\phase2-task0-report.test.mjs:7:} from "../../scripts/phase2-task0-report.mjs";
scripts/catalog-bench\catalog-v10-soak.cjs:46:const playbackMod = require(path.join(CLOUD, 'catalog', 'playback.js'));
cloud-server/tests\catalog\catalog-playback.test.cjs:11:const express = require(path.join(__dirname, '..', '..', 'node_modules', 'express'));
cloud-server/tests\catalog\catalog-playback.integration.cjs:30:const { Pool } = require(path.join(__dirname, '..', '..', 'node_modules', 'pg'));
cloud-server/tests\catalog\catalog-playback.integration.cjs:31:const { Api } = require(path.join(__dirname, '..', '..', 'node_modules', 'telegram'));
cloud-server/tests\catalog\catalog-playback.integration.cjs:32:const bigInt = require(path.join(__dirname, '..', '..', 'node_modules', 'big-integer'));
rg exit=0

ls tests/ -Name | Where-Object { $_ -like "playback-*" }  # Antes del borrado
playback-b
playback-c
playback-compare
playback-d
playback-direct
playback-e
playback-f
playback-g
playback-post-fix

git log --oneline -- tests/playback-compare
06548db fix(playback): finalize Phase 2 transport and closure evidence
git exit=0
git log --oneline -- tests/playback-compare-e
git exit=0
git log --oneline -- tests/playback-compare-g
git exit=0
git log --oneline -- tests/playback-compare-post-fix
git exit=0

git show --format= --name-status 06548db -- tests/playback-compare
A	tests/playback-compare/README.md
A	tests/playback-compare/RESULTS.md
A	tests/playback-compare/report.mjs

node node_modules/typescript/bin/tsc --showConfig -p tsconfig.json  # Resumen de salida JSON
tsc --showConfig exit=0; include=src; archivos=226; fuera_de_src=0; allowJs=False

git diff --name-status
D	tests/playback-compare/README.md
D	tests/playback-compare/RESULTS.md
D	tests/playback-compare/report.mjs
git diff --check
git diff --check exit=0
```

El commit 06548db añadió el informe de cierre de Fase 2. Su README documentaba una ejecución manual de dos harnesses y un comando final para combinar los artefactos. report.mjs consume series ya generadas y escribe sus métricas y líneas de tiempo. Las referencias vecinas a report.mjs resuelven a sus propios reportes.

En CI, los dos tests/** están bajo paths. Los comandos de npm para Node enumeran archivos y Vitest recibe tests/component-dom o tests/integration. Los globs de WDIO se limitan a e2e, y la detección dinámica de scripts/run-cloud-tests.mjs usa cloud-server/tests y sufijos de prueba. report.mjs carece de sufijo de prueba. Los tsconfig de unidad y regresión enumeran sus entradas.
