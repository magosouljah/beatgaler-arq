# C02b · Evidencia de inspección

`rg.exe` 15.2.0 (binario local de Codex, fuera de PATH). Las búsquedas generales excluyeron `.git`, `node_modules`, archivos de credenciales prohibidos y, antes del borrado, el contenido de las tres carpetas candidatas.

| Inspección | Resultado |
| --- | --- |
| `rg -n -P -i -- 'playback-(?:post-fix\|[eg])(?![\w-])' package.json scripts .github/workflows tests src cloud-server docs` | Exit 1, 0 coincidencias antes y después. El separador de alternativas es el pipe de la expresión regular. |
| Mismo patrón con `.` y `--hidden` antes de borrar | Exit 0, 3 líneas: `.gitignore:74:/tests/playback-e/traces/`, `.gitignore:75:/tests/playback-e/analysis.json` y `.gitignore:76:/tests/playback-g/timelines.json`. Son reglas para artefactos generados. |
| Mismo patrón en los otros `tests/playback-*` enumerados por `rg --files` | Exit 1, 0 coincidencias en 28 archivos. Cubre rutas relativas, imports dinámicos y texto. |
| `rg -n -P` con el patrón de directorios conservados `playback-(?:direct\|[bcdf])(?![\w-])` | Exit 0. `package.json:26,64` ejecuta F. `scripts/run-playback-b.mjs:7,8,102` usa Direct y B. `scripts/run-playback-direct.mjs:7,8,243` usa Direct y registra hashes de C y D. `tests/playback-direct/worker.mjs:4–5` importa C y D. |
| `rg -n -P` por nombres de los cinco entrypoints entre comillas, en los ámbitos solicitados con `.github` completo | Exit 1, 0 referencias fuera de la zona. La búsqueda amplia de nombres, sin comillas, encontró homónimos propios de B, D y Direct. |
| `rg -n -P` por globs de `tests/`, `playback-*` y llamadas a `glob/readdir` sobre `tests` | Exit 0, 9 líneas: los 2 `tests/**` en CI y direct-persistent-vault-assignment son filtros de disparo; las 7 líneas restantes son filtros de Cloud. La primera ejecución incluyó opciones después de `--` y devolvió exit 2; se corrigió y repitió. |
| `rg` de comandos y descubrimiento en manifiestos, workflows, configuraciones y arneses | Node enumera sus pruebas, Vitest se dirige a `tests/component-dom` y `tests/integration`, el unitario TS usa lista explícita, el tsconfig principal incluye `src`, y Cloud/catálogo tienen arneses separados. Los 5 scripts retirados son `.mjs` de ejecución manual, sin sufijo de prueba. |

| Carpeta | Motivo en `git log --oneline -- tests/<carpeta>` y archivos retirados |
| --- | --- |
| `playback-e` | `06548db`. Experimento histórico de escritura MTProto, reconstrucción de trazas y reproducción manual del buffer compartido. F conserva la regresión automatizada de dos escrituras independientes y su contenido en ambos órdenes. Eliminados `README.md`, `RESULTS.md`, `rebuild-report.mjs`, `run-suite.mjs`, `writer-race.mjs`. |
| `playback-g` | `06548db`. Analizador y renderizador manuales de trazas de latencia ya recogidas por Task0. Task0 e instrumentación quedan fuera del borrado. Eliminados `README.md`, `RESULTS.md`, `TIMELINES.md`, `analyze.mjs`, `render-timelines.mjs`. |
| `playback-post-fix` | `06548db`. Informe histórico de atribución de latencia tras el parche. Eliminado `RESULTS.md`. |

Preflight: `git branch --show-current` → `local/noche-c02`; `git log -1 --oneline` → `7b6012d chore(tests): retira comparador manual de reproducción huérfano`; `git status --short --untracked-files=all` y `git diff --name-only HEAD` sin cambios previos. Git emitió una advertencia de acceso al ignore global, también al verificar el diff. El comando combinado inicial para eliminar archivos fue rechazado por la política de shell antes de ejecutarse. Se aplicó el borrado de los 11 archivos por ruta exacta y se retiraron las carpetas vacías con `Remove-Item -LiteralPath` (exit 0). `Test-Path` devolvió `False` para las tres.
