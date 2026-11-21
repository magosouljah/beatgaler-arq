# Operación nocturna 2026-11-21 · Plan v2 (Codex primero)

**Estado:** DISEÑO, nada iniciado. v1 respaldada en `BeatGaler-plan-backups/20261121-plan-nocturno-v1/` (SHA-256 `8a853571…b06a`).
**Base de código:** `local/limpieza-preparacion-20261121` @ `cfcfb1d` (F1 incluido; sin fusionar). `main` @ `ad8f8d0`, **protegida desde 2026-11-21** (PR obligatorio, enforce_admins, sin force-push ni borrado).
**Hora del diseño:** 03:16 (−06:00). Ventana útil hasta ≈06:45 salvo que el propietario la amplíe (`HORA_CIERRE`).

## 0. Decisiones del propietario vigentes

1. Apilar sobre la rama de revisión; diagnóstico y retirada seguidos, con STOP si se toca la reproducción; commits locales sí.
2. **Codex Cloud obligatorio.** Tantos agentes simultáneos como permitan realmente la suscripción y los límites, siempre en tareas independientes. Su configuración no bloquea los demás carriles.
3. **Prioridad a Codex** (la suscripción termina en 6 días): sobre todo simplificaciones de código y pruebas de comportamiento. **Claude = director, integrador y revisor**; ejecuta solo como respaldo.
4. **ChatGPT ya trabaja.** Cuatro tareas horarias: Q3 (CI/workflows), Q4 (integridad SQL), Q7 (equivalencia F3) y revisión de cambios, más una auditoría final a las 06:30. Nadie más investiga Q3, Q4 ni Q7; solo se **verifican** sus resultados cuando aparezcan.
5. **Cola dinámica sin tiempos muertos**, ampliable con las investigaciones P01–P07.
6. **Seguridad innegociable:** nada de producción, `main`, despliegues, servicios reales ni secretos. Integración solo en ramas `local/noche-*` y con CI en verde. Push **solo** de `local/noche-*` (Codex Cloud trabaja desde GitHub y CI corre en push).

---

## 0.1 Estado real de Codex Cloud (comprobado ≈03:50) — NO orquestable esta noche

- El entorno **BeatGaler** existe en la web (Codex Cloud → Entornos, `magosouljah/BeatGaler`, privado).
- El CLI 0.169.1 responde siempre «no cloud environments are available for this workspace», también tras `logout`/`login` del propietario y ejecutándolo desde el repo.
- `codex cloud list --json` **no ve** la tarea de humo lanzada desde la web (`tasks: []`). El integrador no puede despachar ni recoger tareas Cloud.
- **Resultado de la tarea de humo (lanzada a mano desde la web):** Node **v24.22.3** / npm **11.19.1** (el proyecto exige Node 22.23.2–<23 y npm 10), HEAD **`ad8f8d0` = main** (no la rama pedida), 427 paquetes en `node_modules` y **sin PG**.
- **Pendiente de día (propietario):**
  1. Fijar Node 22 en el entorno.
  2. Comprobar que la tarea usa la rama elegida.
  3. Averiguar por qué el CLI no ve el workspace (¿versión del CLI o espacio de trabajo?).
- **Consecuencia para esta noche:** el carril Cloud queda `SIN_ORQUESTACIÓN`. Para maximizar Codex, el carril local sube a **2 Codex locales** (3 si la RAM libre es ≥5 GB). Sus pruebas pesadas se serializan con el cerrojo; las suites completas, en CI. Claude solo dirige, integra y revisa; ejecuta como respaldo de tareas de pruebas si un Codex queda bloqueado por cuota.

## 1. Recursos y capacidades comprobados (2026-11-21, 03:14)

| Recurso | Medido | Uso |
|---|---|---|
| PC | Athlon 3000G, 2 núcleos/4 hilos · 13,4 GB RAM (3,2 GB libres con VS Code + app ChatGPT) · **C: 0,7 GB libres** · E: 17,7 GB | Carga local mínima: integrador + 1 Codex local como máximo. **Una prueba pesada a la vez.** Si C: sigue sin espacio, se apaga solo el carril local y la nube sigue. |
| GitHub | Repos `BeatGaler` y `beatgaler-arq` **públicos** → Actions gratis. `ci.yml` ≈1,6 min y `catalog-checks` ≈5 min; ambos corren en push a `local/**` y tienen PG16 efímero | **CI es el juez de «probado».** El PC no ejecuta suites completas. |
| Codex CLI 0.169.1 | `exec`, `exec review`, `cloud exec/status/list/diff/apply` y `--attempts`; autenticado (`cloud list` → «No tasks found») | Despacho y recogida desde el integrador, sin TUI. |
| Codex Cloud | **Entorno: NO existe todavía** (la CLI no crea entornos; se crea en la web). **No hay un límite de concurrencia documentado** (búsqueda 2026-11-21) | Capacidad **medida en rampa** (§6), no supuesta. |
| ChatGPT | 4 tareas horarias + auditoría 06:30 (según el propietario). **A las 03:14 no hay ramas `local/noche-chatgpt-*`** ni en `beatgaler-arq` ni en `BeatGaler` | Se consulta GitHub en cada ciclo; lo que no esté publicado no existe. |
| Claude Code 2.1.322 | Subagentes (opus/sonnet/haiku), Bash en segundo plano con aviso al terminar, `/loop` | Integrador único + revisores. |

**Cuello de botella real:** la revisión y la integración (≈10–15 min de integrador por tarea + 5 min de CI), no la CPU de la nube. Por eso hay un techo práctico de **6 tareas Cloud simultáneas**, aunque el servicio permita más: con más, el trabajo se acumularía sin revisar.

---

## 2. Roles

| Rol | Quién | Hace | No hace |
|---|---|---|---|
| Integrador único | Claude Code CLI (Opus, esfuerzo medio), terminal | Asigna, despacha Codex, aplica los diffs, comprueba alcance, ordena revisiones, fusiona en int, hace push, lee CI, mantiene TABLERO e informe | Programar tareas de la cola (salvo como respaldo) |
| Ejecutores principales | **Codex Cloud ×N** (rampa 3→6) | Código y pruebas de la cola en contenedor limpio; pruebas focalizadas allí | Push, PR, red durante la tarea, secretos |
| Ejecutor local | **Codex local ×1** (`codex exec`, `wt\noche-b`) | Tareas ligeras, o lo que necesite Windows, si la nube está llena o sin entorno | Pruebas pesadas sin cerrojo |
| Revisores | Subagentes Claude: Sonnet por defecto, **Opus** en C01/C08 y en código con riesgo medio | Revisión cruzada de cada diff de Codex; verificación de hallazgos de ChatGPT | Editar código |
| Revisor recíproco | `codex exec review` | Revisa lo poco que escriba Claude como respaldo | — |
| Auditor | ChatGPT (ya activo) | Q3, Q4, Q7, revisión horaria, auditoría 06:30 | — |
| Juez | GitHub CI | `ci.yml` + `catalog-checks` sobre int | — |

---

## 3. Flujo de una tarea Cloud

```
TABLERO: C0N  COLA → ASIGNADA
  integrador: sha=$(punta de int en origin)
     codex cloud exec --env $ENV --branch local/noche-20261121-int "<cabecera 11.B + ficha C0N>"
     → task_id, base_sha anotados en TABLERO
  vigía (script en 2º plano): `codex cloud list --json` cada 120 s → sale al cambiar un estado → despierta al integrador
  terminada → integrador en wt\noche-apply:
     git switch -c local/noche-c0N <base_sha>; codex cloud apply <task_id>
     mover noche/REPORTE-C0N.md a BeatGaler-noche\REPORTES (nunca al código)
     alcance + secretos → commit (mensaje del REPORTE + «Ejecutor: Codex Cloud <task_id>»)
     revisión cruzada (subagente Claude) → OK
     git -C wt\noche-int merge --no-ff local/noche-c0N → push int → CI
  CI verde → INTEGRADA · CI rojo → revert -m 1 (commit nuevo) → REABIERTA (1 reintento)
```

**Carpetas** (todas en E:):

| Carpeta | Contenido |
|---|---|
| `E:\777\app\wt\noche-int` | Integración. `node_modules` solo si hay que medir C01 en local. |
| `E:\777\app\wt\noche-apply` | Aplicar diffs; sin `node_modules`. |
| `E:\777\app\wt\noche-b` | Codex local; con `node_modules`. |
| `E:\777\app\BeatGaler-noche\` | `TABLERO.md`, `REPORTES\`, `REVISIONES\`, `locks\`, `logs\`, `CODEX_ENV_ID.txt`, `INFORME-MAÑANA.md` |

Los documentos que valga la pena conservar van a `beatgaler-arq`, rama `local/noche-20261121`.

---

## 4. Reglas de no-conflicto (sin cambios de fondo)

1. **Un solo integrador:** solo él asigna, aplica, fusiona, hace push y escribe en TABLERO.
2. **Zona exclusiva por tarea**, declarada en TABLERO antes del despacho. Dos tareas activas nunca comparten archivo. El diff que se salga de la zona se rechaza.
3. **Archivos con candado** (una tarea a la vez y solo si figuran en su zona): `package*.json`, `cloud-server/package*.json`, `.github/**`, configuraciones de vite/vitest/tsconfig, `tests/component-dom/setup*`, `scripts/run-cloud-tests.mjs`, `scripts/catalog-check.cjs` y descriptores de suites, `CLAUDE.md`, `AGENTS.md`.
4. Cada tarea parte de la punta de int en el momento del despacho. Ponerse al día = `merge`, **nunca rebase**.
5. **Cerrojo local** `locks\heavy.lock` para tsc, vite, vitest con más de un archivo y la suite de Cloud. El integrador evita las pruebas pesadas locales: CI las ejecuta.
6. Worktrees limpios; `TEMP`, `TMP` y `npm_config_cache` en E:. Codex local con `-s workspace-write -c shell_environment_policy.inherit=core` (sin red y sin variables heredadas).
7. **Nunca en la cola:** refs/purge, Direct/mtcute (`catalogDirectPort`, `webTransport*`), sesión/CSRF (`webCsrfFetchCoordinator`), `server-core-auth-bridge-loader`, idempotencia, derechos pagados, guards SQL, migraciones, `refreshGroupsAndFacets` (P05 dice «sin callers» y la memoria de T09 dice «necesaria»: **contradicción registrada, no tocar**), Desktop/Tauri (implementación), borrar workflows, F3 (extracción), F4, F5 y F6 (cambios de producción).

---

## 5. Cola dinámica

**Criterio de prioridad:** cambio verificable por CI > prueba de comportamiento nueva > diagnóstico documental. A igual prioridad, menor riesgo primero.

| ID | Tarea | Tipo | Riesgo | Zona exclusiva | Depende | Revisor | «Hecho» |
|---|---|---|---|---|---|---|---|
| **C01** | F2: retirar la cadena INDEX del bundle Web (ex Q1) | simplificación | medio-alto | `src/components/AccountGate.tsx`, `src/features/playback/webRememberedDirectPreconnect*`, `…/webStartupPlaybackCoordinator*`, `src/platform/webAdapter.ts`, `src/features/cloud/webGalerCloudTransport*`, sus pruebas en `tests/component-dom/` y `tests/catalog-harness/fakeWebStartupPlaybackCoordinator.ts` | — | **Opus** | Diagnóstico + retirada de lo probado + prueba «el login no carga webGalerCloudTransport ni llama rutas retiradas» + CI verde + **medición local de arranque y primer play** (integrador, con cerrojo) sin empeorar |
| **C02** | Retirar `tests/playback-compare*` (-e, -g, -post-fix) si están huérfanas (ex Q2) | simplificación | bajo | esas 4 carpetas | — | Sonnet | 0 referencias demostradas + borrado + CI verde |
| **C03a…C03i** | Pruebas **SOLO_FUENTE / MIXTO** → pruebas de comportamiento, lotes de 5 archivos (44 + 32 candidatas en `linea-base-20261121/datos/clasificacion-tests.json`) | pruebas | bajo-medio | los 5 archivos del lote + sus pruebas nuevas; fuera de las zonas activas | — | Sonnet | Cada prueba nueva **falla** si se rompe el comportamiento (mutación temporal demostrada en el REPORTE); la antigua se retira solo si la nueva es igual o más fuerte; CI verde |
| **C04** | Caracterizar `metadata-rules.normalizeTag` vs `beat-projection.normKey` (P05: hipótesis de divergencia) | pruebas | bajo | prueba unitaria nueva en `cloud-server/tests/catalog/` | — | Sonnet | Pruebas puras que documentan el comportamiento real. Si hay divergencia: STOP-DESIGN con ejemplos, **sin arreglarla** |
| **C05** | Estados del cliente frente a SQL: `CatalogQuerySet.status` sin `RELEASED` y `CatalogBulkStatus` sin `BLOCKED` (P05) | contrato + pruebas | bajo-medio | tipos en `src/features/library/catalog/catalogCommandsApi.ts`/`catalogApi.ts` + pruebas nuevas | — | Opus | Prueba de qué hacen los consumidores al recibir esos estados; tipo corregido solo si el comportamiento es seguro y no cambia la UI; CI verde |
| **C06** | Tipar `chromeScope` en el adaptador de GalleryChrome (P04-5) | simplificación de tipos | bajo | el adaptador y sus tipos (no el render) | — | Sonnet | tsc PASS + **el JS del build no cambia** (comparación de chunks sin hashes) + CI verde |
| **C07** | Comentarios obsoletos de flag/INDEX y constantes `LIBRARY_INDEX_*` sin uso (P02-P1) | simplificación | bajo | archivos listados en el diagnóstico, **excepto** auth-bridge y sus marcadores literales | — | Sonnet | Cero usos demostrados (incluidas las pruebas de texto) + CI verde |
| **C08** | R-002: prueba de intercalado search/tags/sort con debounce (P04-4) | pruebas (+ arreglo mínimo) | medio | prueba nueva en component-dom (+ transición de query si se confirma el fallo) | — | **Opus** | Prueba que reproduce o descarta el fallo. Si lo reproduce: arreglo mínimo sin cambio visual; si exige diseño → STOP-DESIGN y la rama no se fusiona |
| **C09** | R-004: lease tardío del Player (diferido/cancelación) (P04-1) | solo pruebas | bajo | prueba nueva | — | Opus | Prueba de comportamiento PASS, sin tocar producción |
| **C10** | R-003: delete individual con 401/409/offline y Player desalojado (P04-2) | solo pruebas | bajo | prueba nueva | — | Sonnet | Ídem |
| **C11** | Desktop dentro del bundle Web (`src/platform/index.ts`) — diagnóstico + medición (ex Q6) | doc | nulo | solo lectura | **C01 integrada** | Sonnet | KB por chunk, grafo y 1–2 costuras propuestas; sin implementar |
| **C12** | Billing LEGACY (`billing-checkout.js`, `billing-webhook.js`, `billing-entitlements.js`): grafo de callers productivos (P06-7) | doc | nulo | solo lectura | — | Sonnet | Tabla de callers por entrypoint con pruebas de `rg`/grafo; sin borrar |
| **C13** | Pruebas de los huecos de billing P06 (a)–(d) | pruebas PG | bajo (solo pruebas) | archivos de prueba nuevos | PG disponible (entorno Cloud con PG, o CI demostrado que las recoge) | Opus | Pruebas nuevas PASS en CI, sin tocar producción |
| **C14** | F3: pruebas de equivalencia PATCH vs IMPORT/REPLACE | pruebas PG | bajo | archivos de prueba nuevos | **matriz Q7 de ChatGPT publicada** + PG | Opus | Ídem |
| **V-x** | Verificar cada hallazgo publicado por ChatGPT (Q3, Q4, Q7, revisión) contra el código | verificación | nulo | lectura | aparición en GitHub | — (subagente Sonnet) | CONFIRMADO / NO REPRODUCIDO con archivo:línea; si se confirma, se propone una tarea C nueva |

**Despacho inicial (cuando haya entorno Cloud):** C01, C02, C03a. Rampa: C04, C06, C03b, C05, C07, C09, C10, C03c… El carril local, desde el minuto 0: C07 (o C02 si la nube no está lista).

**Ampliar la cola.** Cuando queden menos de 3 tareas en COLA, el integrador añade tareas desde las tablas de candidatos de P01–P07 o desde hallazgos V-x. Solo entran si cumplen todo esto:
- son cambios internos equivalentes, o pruebas nuevas;
- su zona es exclusiva;
- CI las verifica;
- no tocan la lista §4.7;
- no requieren una decisión de producto.

Cada tarea nueva lleva ficha (objetivo, zona, criterio de hecho, revisor) en TABLERO antes del despacho.

**Plazos máximos:** C01 2,5 h · el resto 1 h. Al vencer: se recoge lo que haya; si no es fusionable, la tarea pasa a BLOQUEADA y no se insiste.

---

## 6. Capacidad Codex Cloud: medida, no supuesta

1. **Prueba de humo** (§11.E) con el entorno nuevo: confirma Node 22, `npm ci` y si PG está disponible. Si falla, el carril Cloud pasa a `SIN_ENTORNO` y siguen el local y Claude.
2. **Rampa:** empezar con 3 tareas. Se añade 1 cuando se cumple todo esto:
   - las activas están en ejecución (no en cola) desde hace ≥5 min;
   - no hay error de límite;
   - hay ≤2 tareas terminadas esperando revisión.
3. **Techo:** 6 (por el cuello de botella de integración, §1).
4. **Límite observado:** si un envío devuelve error de cuota, límite o concurrencia, o una tarea sigue en cola más de 10 min, se fija `techo = activas actuales` y se anota el mensaje literal en TABLERO. Un solo reintento a los 15 min.
5. **Cuota agotada:** se pausa el carril Cloud y se anota la hora de reinicio. El carril local sigue si la cuota es distinta; si es la misma, Claude toma como respaldo solo tareas de pruebas (C03, C09, C10).
6. Siempre `--attempts 1` (best-of-N gasta cupo sin aportar a tareas acotadas).

---

## 7. «Probado» = las cinco barreras

1. **Alcance:** `git diff --name-only` ⊆ zona; sin `.env`, `Claude outputs/`, imágenes, secretos ni `diagnostics/telegram-direct-control.txt`.
2. **Evidencia del ejecutor:** el REPORTE incluye los comandos focalizados y su resultado (PASS/FAIL literal) dentro del contenedor.
3. **Revisión cruzada** sin hallazgos bloqueantes. Un hallazgo real vuelve a Codex **una vez** como tarea de seguimiento con el mismo ID.
4. **CI verde** en int tras la fusión (`ci.yml` + `catalog-checks`), con run id en TABLERO.
5. **Etiqueta honesta:** cada fila dice «fakes» o «proveedor real». Esta noche todo es fakes.

---

## 8. ChatGPT: consumo de resultados

- En cada ciclo (y en el vigía, cada 10 min):
  - `gh api repos/magosouljah/beatgaler-arq/branches` → filtrar `local/noche-chatgpt-*`;
  - lo mismo en `BeatGaler` por si acaso.
- Si aparecen: leer (`gh api …/contents` o `git fetch` en un clon de arq), anotar en TABLERO (rama, SHA, hora) y abrir una V-x por hallazgo verificable.
- Si no aparecen: TABLERO dice «no publicado (hh:mm)». **No se supone su contenido ni se reasigna Q3/Q4/Q7.** Excepción: C14 depende de Q7; si a las 05:00 no existe, C14 se descarta esta noche (no se reinvestiga).
- La auditoría de las 06:30 lee la int publicada; por eso la integración final termina a las **06:15**.

---

## 9. Continuidad

| Situación | Respuesta |
|---|---|
| Entorno Cloud aún no creado | Carril local + Claude de respaldo arrancan ya; el vigía mira `CODEX_ENV_ID.txt` y, cuando aparece, prueba de humo y rampa. |
| Tarea Cloud fallida o sin diff | Leer su salida (`codex cloud status/diff`); 1 relanzamiento con la causa añadida; después BLOQUEADA. |
| `codex cloud apply` en conflicto | Rama desde `base_sha` (el registrado) y después `merge` de int; si el conflicto sale de la zona → BLOQUEADA. |
| CI rojo tras fusionar | `git revert -m 1` (commit nuevo) → REABIERTA. |
| Prueba que falla sin causa en el cambio | STOP-TEST en el REPORTE → BLOQUEADA → siguiente. |
| Cuota de Claude agotada | TABLERO siempre al día antes de cada espera. Las tareas Cloud siguen corriendo; nada se fusiona hasta volver. Para reanudar: §11.F. |
| C: < 2 GB, E: < 3 GB o RAM < 1,5 GB | Se apaga el carril local; la nube sigue. STOP-ENV anotado. |
| Necesidad de servicio real, secreto, `main` o borrado no autorizado | STOP de esa tarea; las demás siguen. |

## 10. Horario (ajustable con `HORA_CIERRE`)

| Hora | Hito |
|---|---|
| ≈03:30 | Arranque, Paso 0, carril local |
| Cuando exista el entorno | Prueba de humo y rampa Cloud |
| 05:30 | Último despacho Cloud |
| 06:15 | Integración final, push y CI |
| 06:30 | Auditoría de ChatGPT |
| 06:45 | `INFORME-MAÑANA.md` |

Si el propietario amplía `HORA_CIERRE` (por ejemplo, para aprovechar Codex durante el día), todo se desplaza igual.

---

## 11. Prompts y pasos

### 11.0 Propietario: crear el entorno Codex Cloud (≈5 min, navegador)

Es el único paso que no se puede hacer desde la terminal: la CLI no crea entornos.

1. chatgpt.com/codex → **Settings → Environments → Create environment**. Los nombres exactos de los menús pueden variar.
2. **Repositorio:** `magosouljah/BeatGaler`. Si pide acceso a GitHub, concédelo solo a `BeatGaler` (y a `beatgaler-arq` si lo ofrece).
3. **Nombre:** `beatgaler-noche`. Imagen universal, **Node 22**.
4. **Variables y secretos: ninguno.**
5. **Acceso a internet del agente: OFF.** El script de setup sí tiene red.
6. **Setup script:**
   ```bash
   set -euo pipefail
   node --version
   npm ci --no-audit --no-fund
   (cd cloud-server && npm ci --no-audit --no-fund)
   # PG efímero propio (opcional; si este bloque falla, bórralo y las suites PG quedan para CI)
   if command -v apt-get >/dev/null; then
     (apt-get update -qq && apt-get install -y -qq postgresql >/dev/null && echo "PG instalado") || echo "PG no disponible"
   fi
   ```
7. Guardar, copiar el **ID del entorno** (aparece en la página o la URL del entorno, o en el selector de `codex cloud`) y escribirlo en `E:\777\app\BeatGaler-noche\CODEX_ENV_ID.txt`. También se puede pegar en el prompt §11.A. Mientras no esté, el integrador avanza con el resto.

### 11.A Integrador — PROMPT DEFINITIVO DE ARRANQUE

> Se pega en `claude`, abierto en una terminal en `E:\777\app\BeatGaler` (no en VS Code).

```markdown
# Operación nocturna 2026-11-21 · INTEGRADOR ÚNICO (Claude = director, integrador, revisor)

Lee entero E:\777\app\BeatGaler-arq\noche-20261121\PLAN-NOCTURNO.md (v2); manda sobre este resumen. Rige CLAUDE.md completo. Objetivo: máximo avance útil y PROBADO por hora (§7), no máximo número de agentes.

## Autorizaciones del propietario (2026-11-21)
- Commits locales y push SOLO de ramas `local/noche-*` (BeatGaler) y `local/noche-20261121` (beatgaler-arq). Nada más se publica.
- Ejecutores: **2 Codex locales** (`codex exec`, worktrees `noche-b` y `noche-c`; un 3.º `noche-d` si la RAM libre es ≥5 GB), subagentes Claude como revisores y respaldo. Codex Cloud NO orquestable esta noche (§0.1): no lo intentes salvo que aparezca `CODEX_ENV_ID.txt` Y `codex cloud list` vea tareas.
- Borrar en ramas nocturnas código y pruebas demostrados muertos (C01, C02, C07). Nada llega a `main` esta noche.
- Prohibido siempre: push/merge/PR a main, force-push, rebase, reset, clean, stash, borrar ramas/tags, despliegues, Telegram/AWS/Polar/PG reales, el PG 5432 de WSL, leer .env/credenciales/auth.json, tocar `Claude outputs/`, imágenes, `stash@{0}`, `backup/*`, `archive/*` o `BeatGaler-baseline-wt`.
- No reinicies auditorías ya hechas ni reasignes Q3/Q4/Q7 (son de ChatGPT).
- Codex: `C:\Users\GTA7\AppData\Local\OpenAI\Codex\bin\5b4923dff14fbe66\codex.exe`. ENV_ID = «______» (si está vacío, léelo de E:\777\app\BeatGaler-noche\CODEX_ENV_ID.txt cuando aparezca). HORA_CIERRE = 06:45.

## Paso 0 (≤25 min; lo que falle apaga SOLO su carril)
1. Preflight: rama, HEAD = cfcfb1d, `git status`; `main` protegida (`gh api …/branches/main/protection`).
2. Recursos: C:, E: y RAM libre. Si C: < 2 GB → carril local OFF y se avisa en TABLERO; la nube sigue.
3. Crear E:\777\app\BeatGaler-noche\{REPORTES,REVISIONES,locks,logs} y TABLERO.md con la cola §5 (estados, zonas, dependencias).
4. Fijar TEMP/TMP=E:\777\tmp y npm_config_cache=E:\777\cache\npm.
5. `.git/hooks/pre-push`: rechaza cualquier ref que no sea `refs/heads/local/noche-*` (comprueba antes que no haya hooks que se pisen). Aplica también al clon de arq.
6. Crear `local/noche-20261121-int` desde cfcfb1d y hacer push (CI). Worktrees: `E:\777\app\wt\noche-int` y `noche-b`/`noche-c` (y `noche-d` si procede), con `npm ci` en serie y caché en E:.
7. Vigía en segundo plano (script en E:\777\app\BeatGaler-noche\logs, no en el repo): cada 10 min, ramas `local/noche-chatgpt-*` en beatgaler-arq y BeatGaler. Sale con un código y una línea de motivo cuando algo cambia → te despierta. Relánzalo tras cada evento. Los Codex locales corren como Bash en segundo plano (avisan al terminar).
8. Arranca ya los Codex locales: `noche-b` → C01 (riesgo medio-alto, revisor Opus) · `noche-c` → C02, luego C03a… · `noche-d` → C04/C06. Después, cola §5 sin tiempos muertos. Para Codex local, la ficha usa rutas del worktree y deja el REPORTE en E:\777\app\BeatGaler-noche\REPORTES\{ID}.md (no en `noche/`).
9. Las tareas Codex locales trabajan con commits en su rama `local/noche-{id}` (sin `codex cloud apply`); el resto del flujo §3 es igual desde «alcance + secretos».

## Ciclo (por eventos; respaldo `/loop` cada 1800 s)
- Tarea terminada → flujo §3 → cinco barreras §7 → fusionar → push → CI. CI verde = INTEGRADA; rojo = revert y REABIERTA.
- Ejecutor libre → inmediatamente la siguiente tarea de §5 cuyas dependencias estén cumplidas y cuya zona no se solape. Menos de 3 en COLA → amplía §5 con las reglas de allí.
- Revisión: subagente Sonnet (Opus para C01, C05, C08, C09, C13 y C14) con el prompt §11.D. Escribe el hallazgo en REVISIONES\.
- ChatGPT: lo que se publique se verifica (V-x); lo que no, consta como «no publicado».
- C01 integrada → medición local de arranque y primer play con fakes, antes/después (receta E80, con cerrojo). Si empeora → revert y STOP-TEST.
- Latido en TABLERO antes de cada espera. Respeta §4 y §9 sin excepciones.

## Ahorro
Claude no programa si hay un Codex disponible. Haiku para búsquedas, Sonnet para revisiones, Opus solo para ti y las revisiones de riesgo. No leas archivos enteros si basta con buscar. Sin pruebas pesadas locales salvo la medición de C01. `--attempts 1`.

## Cierre
05:30 último despacho Cloud. 06:15 integración final, push y CI (la auditoría ChatGPT de las 06:30 lee esa int). 06:45 INFORME-MAÑANA.md (§11.G) + commit y push de la rama arq. Las tareas sin terminar quedan como BLOQUEADA o EN_CURSO con su task_id para retomarlas.
```

### 11.B Cabecera común para Codex (Cloud o local)

```markdown
Eres un EJECUTOR Codex de la operación nocturna de BeatGaler. Un integrador único (Claude) revisará y fusionará tu trabajo; tú no publicas nada.

OBLIGATORIO antes de empezar: lee CLAUDE.md §5–§9 (manda sobre AGENTS.md, que solo regula la UI) y noche-20261121/PLAN-NOCTURNO.md §4 y §7 del repo beatgaler-arq si lo tienes; si no, aplica estas reglas:
- Toca SOLO la ZONA de tu ficha. Si necesitas salir de ella, detente y explícalo en el REPORTE (STOP-CONTRACT).
- Sin push, PR, rebase ni cambios en package*.json, .github/**, configuraciones de build/test ni descriptores de suites, salvo que la ficha lo diga.
- Sin red, sin secretos y sin servicios reales (Telegram, AWS, Polar, PG real). PG solo si es efímero y local del contenedor, con el centinela `bg_test_lab.lab_identity` que exigen los arneses.
- Sin cambios visuales (Landing, Gallery, BeatCards, Tag Bar, Playbar). No desactives, saltes ni debilites pruebas.
- Pruebas: solo las focalizadas en lo que cambias. Distingue comportamiento de inspección de texto. Las pruebas nuevas deben FALLAR si se rompe el comportamiento: demuéstralo con una mutación temporal que luego reviertes.
- No toques: Direct/mtcute, webTransport*, catalogDirectPort, webCsrfFetchCoordinator, sesión/CSRF, server-core-auth-bridge-loader, idempotencia, refs/purge, derechos pagados, guards SQL, migraciones ni refreshGroupsAndFacets.
- Ante una duda de diseño o de producto: STOP-DESIGN con la pregunta concreta. No elijas por intuición.

ENTREGA: tu diff + el archivo `noche/REPORTE-{ID}.md` (≤20 líneas) con:
- estado (LISTA o BLOQUEADA + STOP-x);
- mensaje de commit propuesto (español, convencional);
- archivos tocados;
- comandos ejecutados con su resultado literal (PASS/FAIL y recuentos);
- mutación demostrada (si añadiste pruebas);
- riesgos;
- qué queda sin probar con un proveedor real.
```

### 11.C Fichas (se añaden a 11.B; el integrador completa `{…}`)

**C01 — F2: cadena INDEX en el bundle Web** (zona: §5 C01)

```markdown
## C01 · Retirar del bundle Web el código que solo servía al INDEX (retirado en T25), sin cambios visibles ni más latencia
Hipótesis (no es un hecho): AccountGate (import dinámico ~l.337) → webRememberedDirectPreconnect.prepareWebDirectForSignIn → webStartupPlaybackCoordinator → webGalerCloudTransport, más el prewarm de webAdapter.
Atención:
- AccountGate.tsx es un núcleo VIVO (token, base de API, logout, tipos de plan; lo usan AuthExperienceGate, SettingsPanel, billing, directTelegramDataPlane e internetArtwork): quita solo su parte INDEX y no cambies su API pública.
- webAdapter usa webStartupPlaybackCoordinator en DIRECT_CODE_IMPORT y en disconnect; puede contener el prewarm/preconnect de Direct B (E72/E73): separa lo INDEX de lo Direct B ANTES de editar.
- Lo que use Desktop se conserva.
Fase A (sin editar): grafo de `vite build --mode web` con VITE_CATALOG_API_ENABLED=true + tsc + rg (quién importa cada pieza, si entra al bundle, si la usa Desktop). Con fakes: login, restaurar sesión, primer play y logout; qué peticiones salen y si alguna va a rutas retiradas. Clasifica cada pieza (MUERTA / INDEX-VIVA / COMPARTIDA / DESKTOP) y las pruebas afectadas. Pon la tabla en el REPORTE.
STOP-DESIGN si una pieza COMPARTIDA exige rediseño o si quitarla puede afectar la latencia de reproducción.
Fase B: retira solo lo MUERTO o INDEX-VIVO. Borra solo las pruebas que cubren exclusivamente código eliminado; adapta las guardas de texto sin debilitarlas; añade la prueba «login/restaurar sesión no carga webGalerCloudTransport ni llama rutas retiradas».
Verifica: tsc; build:web (tamaño del bundle antes/después en el REPORTE); component-dom de los archivos afectados.
```

**C02 — pruebas huérfanas**

```markdown
## C02 · Retirar tests/playback-compare, -e, -g y -post-fix si están huérfanas. ZONA: esas 4 carpetas
1. Demuestra con rg que no hay referencias: package.json, scripts/, .github/workflows/, tests/, src/, cloud-server/, docs/, imports dinámicos y globs. Pon los comandos y su salida en el REPORTE.
2. Mira con `git log` por qué se crearon. Si alguna cubre algo que no tiene otra prueba: STOP-DESIGN y no la borres.
3. Borra solo las que estén demostradamente huérfanas.
```

**C03x — texto fuente → comportamiento (lote)**

```markdown
## C03{x} · Convertir en pruebas de comportamiento estos archivos clasificados SOLO_FUENTE/MIXTO: {lista de 5}. ZONA: esos archivos + pruebas nuevas junto a ellos
Por archivo:
- identifica qué invariante protege la inspección de texto;
- escribe una prueba que ejerza el comportamiento real (mismo runner del archivo);
- demuestra con una mutación temporal que la nueva falla si se rompe;
- retira el assert de texto SOLO si la nueva lo cubre igual o mejor; si es una guarda contractual (p. ej., «ningún byte por Cloud», no importar Tauri en Web), conserva ambas.
Sin tocar código de producción. Si un archivo no admite una prueba de comportamiento razonable, déjalo y explícalo.
```

**C04 — normalizeTag vs normKey**

```markdown
## C04 · Caracterizar cloud-server/catalog/metadata-rules.js normalizeTag frente a beat-projection.js normKey. ZONA: prueba nueva en cloud-server/tests/catalog/ (runner de la suite unit)
Casos: espacios múltiples/internos/extremos, mayúsculas, Unicode (acentos, NFC/NFD, ß, emojis, RTL), vacío y null. Documenta el comportamiento real de cada función y el punto donde divergen.
Si divergen en casos que pueden llegar a ambas (sigue los callers), es STOP-DESIGN con la tabla de ejemplos. NO arregles nada.
Verifica: node scripts/catalog-check.cjs unit.
```

**C05 — estados cliente vs SQL**

```markdown
## C05 · CatalogQuerySet.status (cliente) sin RELEASED (0026) y CatalogBulkStatus sin BLOCKED (0029). ZONA: src/features/library/catalog/catalogCommandsApi.ts, catalogApi.ts (solo tipos) + pruebas nuevas
1. Determina con el código del servidor si esas respuestas llegan realmente al cliente y por qué ruta.
2. Prueba de comportamiento: qué hace cada consumidor al recibirlas (store, UI de bulk o query-set).
3. Si el comportamiento es seguro, añade el estado al tipo y fija la conducta esperada en la prueba. Si exige decidir qué muestra la UI: STOP-DESIGN.
```

**C06 — tipar chromeScope**

```markdown
## C06 · Sustituir `Record<string, any>` de chromeScope en el adaptador de GalleryChrome por un tipo explícito. ZONA: {archivo adaptador + archivo de tipos}
Prohibido tocar el render, CSS o el motor de Toolbar. Criterio: tsc PASS y el JavaScript emitido por `vite build --mode web` es idéntico antes/después (compara el contenido de los chunks sin hashes; pon el método y el resultado en el REPORTE). Si el tipo revela un bug real: anótalo, no lo arregles.
```

**C07 — comentarios y constantes INDEX sin uso**

```markdown
## C07 · Comentarios obsoletos de flag/INDEX y constantes LIBRARY_INDEX_* sin uso (P02-P1). ZONA: {archivos tras el diagnóstico}
1. Inventario con rg (incluidas pruebas de texto que busquen esos literales, scripts y workflows).
2. Quita solo lo que tenga 0 usos. NO toques server-core-auth-bridge-loader ni sus marcadores literales, ni legacy-fence.
3. Verifica: las pruebas que referencian esos archivos.
```

**C08 — R-002 intercalado sort/debounce**

```markdown
## C08 · ¿El último sort puede ser sustituido por un callback diferido de search/tags (debounce 250 ms)? ZONA: prueba nueva en tests/component-dom/ (+ transición de query en {archivo} solo si se confirma)
1. Prueba de comportamiento con temporizadores falsos: secuencias search→sort, sort→tags y sort→search dentro de la ventana; comprobar la query final, la URL, la selección y el Player.
2. Si el fallo NO se reproduce: la prueba queda como guarda.
3. Si SÍ se reproduce: arreglo mínimo en la transición, sin cambio visual ni mover filtros al cliente. Si el arreglo exige una decisión de UX: STOP-DESIGN y deja la prueba en la rama sin «.fails».
```

**C09 / C10 — solo pruebas**

```markdown
## C09 · R-004: lease tardío del Player. Prueba de comportamiento: play → cambio de pista/cancelación antes de que llegue el lease; el lease tardío no debe reemplazar la fuente actual ni filtrar referencias. ZONA: prueba nueva. Sin tocar producción; si encuentras un fallo: STOP-DESIGN con la prueba.
## C10 · R-003: delete individual con 401, 409, offline y con el beat en reproducción desalojado de la ventana. Prueba de comportamiento del feedback y del estado (sin cambios visuales). ZONA: prueba nueva. Igual que C09 ante un fallo.
```

**C11 / C12 — diagnósticos**

```markdown
## C11 · (tras C01) ¿Cuánto de Desktop/Tauri entra al bundle Web desde src/platform/index.ts? KB y gzip por chunk, si algo se ejecuta al arrancar en Web, y 1–2 costuras mínimas con su riesgo y sus pruebas. SOLO LECTURA; salida: noche/C11-desktop-bundle.md
## C12 · Grafo de callers productivos de cloud-server billing-checkout.js, billing-webhook.js y billing-entitlements.js (LEGACY según P06) desde server.js, server-core.js y catalog-worker.js, incluidas las rutas montadas por parches de express. SOLO LECTURA; salida: noche/C12-billing-legacy.md. No borres nada.
```

**C13 / C14 — pruebas PG (solo con PG demostrado)**

```markdown
## C13 · Pruebas de integración para los huecos de billing P06: (a) checkout OPEN expirado sin pago y AMBIGUOUS sin suscripción; (b) downgrade o expiración del grant entre el ticket PROJECT y el commit (IMPORT y REPLACE); (c) proveedor que devuelve listas vacías o truncadas en la reconciliación; (d) gracia con reembolsos. Usa el patrón de cloud-server/tests/billing-*.integration.cjs. ZONA: archivos nuevos. Si una conducta no está definida: STOP-DESIGN (es pregunta de producto), no la inventes.
## C14 · Pruebas de equivalencia PATCH vs IMPORT/REPLACE por campo, según la matriz Q7 publicada por ChatGPT en {rama/SHA} (verifícala antes contra el código). ZONA: archivos nuevos. Toda diferencia encontrada = STOP-DESIGN; no unifiques el escritor.
```

### 11.D Revisión cruzada (subagente Claude)

```markdown
Revisa el diff `{base_sha}...local/noche-{id}` en E:\777\app\wt\noche-apply con la skill code-review en nivel medium. Contexto: CLAUDE.md §7–§8, la ficha {id} y su ZONA {…}, y el REPORTE en E:\777\app\BeatGaler-noche\REPORTES\{id}.md.
Comprueba además:
- que las afirmaciones del REPORTE (PASS, mutación) son plausibles con el diff;
- que ninguna prueba borrada o cambiada pierde cobertura de comportamiento;
- que no hay cambios visuales;
- que no toca nada de la lista §4.7.
Veredicto: APROBAR / CORREGIR (lista concreta) / RECHAZAR (motivo). Escríbelo en E:\777\app\BeatGaler-noche\REVISIONES\{id}.md. No edites código.
```

Cuando el autor es Claude (respaldo): `codex.exe exec review -C E:\777\app\wt\noche-apply --base {base_sha} -o E:\777\app\BeatGaler-noche\REVISIONES\{id}-codex.md "<mismos criterios>"`.

### 11.E Prueba de humo del entorno Cloud

```markdown
Tarea de verificación, NO cambies archivos.
Ejecuta y devuelve la salida literal de:
- `node --version` y `npm --version`;
- `git log -1 --oneline`;
- `ls node_modules | wc -l` y `ls cloud-server/node_modules | wc -l`;
- `command -v psql pg_ctl postgres || echo SIN_PG`;
- `node scripts/catalog-check.cjs unit` (solo el resumen final).
Responde en ≤10 líneas.
```

Esperado: Node 22.x, HEAD = punta de int, `node_modules` presentes y unit PASS. Con PG, se habilitan C13/C14 en el contenedor.

### 11.F Reanudar el integrador

```markdown
Reanuda como INTEGRADOR ÚNICO. Lee PLAN-NOCTURNO.md v2 y E:\777\app\BeatGaler-noche\TABLERO.md.
- Por cada tarea ASIGNADA: `codex cloud status <task_id>` o el proceso local; si ya terminó, procésala (§3); si murió, 1 relanzamiento.
- No repitas fusiones (compara SHA).
- Relanza el vigía.
Mismas autorizaciones y HORA_CIERRE que al arrancar.
```

### 11.G `INFORME-MAÑANA.md` (para el propietario, ≤1 página)

1. **3 líneas:** qué avanzó de verdad (INTEGRADAS con CI verde) y qué no.
2. **Tabla:** ID · ejecutor (Cloud/local/Claude) · estado · rama/SHA · run de CI · «fakes».
3. **Capacidad Cloud observada:** máximo de tareas simultáneas, errores literales de límite, cuota consumida y hora de reinicio.
4. **ChatGPT:** qué publicó (rama/SHA) y qué se verificó (V-x).
5. **Decisiones para ti, con recomendación:**
   - PR de int → `main` (con Sol);
   - Desktop: aislar o separar (C11);
   - workflows (Q3);
   - divergencias STOP-DESIGN (C04, C05, C08…);
   - VERSION vs package.json;
   - host Tailscale.
6. **Riesgos y pendientes reales:** E2E con Telegram de pruebas, G2/G3.
7. **Contradicciones registradas:** `refreshGroupsAndFacets` (P05 vs memoria de T09); worktree viejo con cambios.
