# Informe de la mañana · Operación nocturna 2026-11-21

**Rama de integración:** `local/noche-20261121-int` (BeatGaler), base `cfcfb1d`, punta `3f009a7` — **CI final verde: V1 44899994382 ✔, catalog-checks 44899994389 ✔** (05:43). **Nada tocó `main`, producción, AWS, Telegram, Polar ni el PG 5432.** Todo es **fakes** (o PG16 efímero de CI); nada probado con proveedor real.

## 1. En tres líneas
- **19 tareas INTEGRADAS con CI verde** en la rama de integración: limpieza (arneses huérfanos, constantes INDEX, filtro de CI), 2 arreglos pequeños con prueba (orden perdido con el debounce de búsqueda/tags; fuga de listener en el menú de color de tags), pruebas de comportamiento nuevas o reforzadas en 43 archivos de prueba (muchas sustituyen pruebas que solo leían el texto del código), y 14 pruebas nuevas en PostgreSQL real (equivalencia PATCH/REPLACE y constraints de migraciones).
- **Se encontraron 2 fallos reales de reproducción/borrado** (C09, C10), documentados con pruebas rojas en ramas aparte, **sin arreglar**: necesitan tu decisión.
- **No avanzó:** la retirada de la cadena INDEX del login (C01), bloqueada por una duda de latencia del primer play. Codex Cloud no se pudo orquestar (sin entorno visible para el CLI).

## 2. Tareas
Ejecutor: Codex local (2→3 en paralelo; noche-b/c/d) salvo indicación. Diff total de int: 58 archivos, +1909/−2083; código de producción tocado solo en 15 archivos (tipos, comentarios, 2 arreglos). Revisión cruzada: subagente Claude (Opus en riesgo medio). CI = `ci.yml` (Web+Cloud) / `catalog-checks` (PG16).

| ID | Qué | Estado | Commit | CI |
|---|---|---|---|---|
| C15 | Filtro de paths de catalog-checks cubre todo su manifiesto (Q3-01 de ChatGPT) · Claude | INTEGRADA | 448bef7 | cc 44894426890 ✔ |
| C02 | Borra arneses manuales huérfanos `tests/playback-compare/-e/-g/-post-fix` (0 refs) | INTEGRADA | 7b6012d, 1eb465e | V1 44894556493 ✔ |
| C04 | Caracteriza `normalizeTag` vs `normKey` (20 casos) | INTEGRADA · **STOP-DESIGN** | a6537c7 | V1 44894859541 ✔ cc 44894859613 ✔ |
| C03a–f | Pruebas de comportamiento en lugar de inspección de texto (arranque/atajos, backup/catálogo, KDF/bóveda, identidad/sesión, papelera, revocación/migraciones) | INTEGRADAS (C03d con corrección de Claude; C03e revertida y reintegrada) | 70aad5e, 075dd02, 4f030bc, 4a1e30b+f37765b, f63e1cb, c5dcf0d | V1 44898986343 ✔ |
| C05 | `RELEASED` en el tipo de query-set; `BLOCKED` caracterizado | INTEGRADA · **STOP-DESIGN** | c22b878+1cbe248 | V1 44896739232 ✔ cc 44896739223 ✔ |
| C06 | Tipo explícito para el scope de GalleryChrome (JS emitido idéntico byte a byte) | INTEGRADA | 1210c79 | ídem |
| C07 | Quita 5 constantes `LIBRARY_INDEX_*` sin uso y comentarios falsos tras T25 | INTEGRADA | e565f16 | V1 44897500615 ✔ cc 44897500643 ✔ |
| C08 | **Arreglo:** el debounce de búsqueda/tags reponía el orden anterior (R-002) | INTEGRADA | c77ad25 | V1 44896545198 ✔ cc 44896545102 ✔ |
| C20 | Caso tags→orden para C08 | INTEGRADA | b2c1669 | V1 44898986343 ✔ |
| C22 | **Arreglo:** fuga de listener en `TagColorMenu` (rompía CI de forma reproducible) | INTEGRADA | 189b656 | V1 44898986343 ✔ |
| C14 | PG: equivalencia PATCH vs REPLACE/IMPORT (EQ-01/02/03/06), matriz Q7 de ChatGPT | INTEGRADA | 65ffa1e | rama cc 44897482141 4/4 ✔ · int V1 44898036193 ✔ cc 44898036248 ✔ |
| C17 | PG: CHECK de 0042 (`REUSED_UNROTATED`) y UNIQUE de 0041 | INTEGRADA | 862c4f1 | rama cc 44898546233 6/6 ✔ · int V1 44899319398 ✔ cc 44899319412 ✔ |
| C21 | PG: EQ-08/09/12 (sin metadata, `{}`, conflicto de versión) | INTEGRADA | ae4aeca | rama cc 44898949367 7/7 ✔ · int V1 44899319398 ✔ cc 44899319412 ✔ |
| C25 | PG: PATCH `crop:null` en EQ-03 | INTEGRADA · Claude (respaldo) | 8402354 | rama cc 44899490327 8/8 ✔ · int V1 44899994382 ✔ cc 44899994389 ✔ |
| C09 | Lease tardío del Player | **BLOQUEADA · fallo REAL** (prueba roja, no fusionada) | f86b65c (`local/noche-c09`) | rojo esperado |
| C10 | Borrado individual con el beat sonando | **BLOQUEADA · fallo REAL** (prueba roja, no fusionada) | 833d027 (`local/noche-c10`) | rojo esperado |
| C01 | Retirar la cadena INDEX del login | **BLOQUEADA** · STOP-DESIGN latencia + STOP-CONTRACT | — (solo diagnóstico) | — |
| C11, C12, C16, C23, C24 | Diagnósticos de solo lectura (Desktop en el bundle, billing legacy, matriz de migraciones, consumidores de BEAT_PATCHED, anclas de un test de PR) | LISTOS | — | — |
| C13 | Pruebas de billing en PG | DESCARTADA (sus workflows no corren en ramas `local/**`) | — | — |

## 3. Capacidad Codex Cloud
**No orquestable:** `CODEX_ENV_ID.txt` vacío y `codex cloud list` → `tasks: []` toda la noche (§0.1). Máximo simultáneo **0**; no hubo errores de límite porque no se envió nada. En su lugar: **3 Codex locales** (RAM libre 6,25 GB a las 04:37), **26 ejecuciones (24 completas; 1 cortada al editar su script; 1 fallida por cuota a las 05:29: «You’ve hit your usage limit… try again at 8:23 AM») ejecuciones** sin errores de cuota.

## 4. ChatGPT
| Rama (beatgaler-arq) | SHA final | Verificación |
|---|---|---|
| `local/noche-chatgpt-q3` | 33085d9 | Q3-01 **CONFIRMADO** y resuelto (C15). Q3-03 **CONFIRMADO**: la suite `web` del catálogo (requiere Chrome) nunca corre en catalog-checks. Q3-02/04: decisión. |
| `local/noche-chatgpt-q4` | be3f321 | Q4-02 **PARCIAL**: el runner usa SQL simulado, pero `catalog-schema.integration` aplica toda la cadena en PG real; faltaban pruebas por objeto → C16 (matriz) + C17. |
| `local/noche-chatgpt-q7` | 15372c2 | V-Q7: (b)(d)(e) CONFIRMADOS, (a)(c) PARCIALES; sin fallo de datos. → C14 + C21 (11 pruebas PG PASS). |
| revisión horaria / auditoría 06:30 | no publicada como rama a las 05:38 | — |

## 5. Decisiones para ti (con recomendación)
1. **PR `local/noche-20261121-int` → `main`** (con Sol). Recomiendo revisarlo junto con `local/limpieza-preparacion-20261121` (F1). **Aviso:** el check `pull_request` `direct-persistent-vault-assignment` fallará: `scripts/regression-direct-manager-only.test.mjs` busca 3 anclas que T25 (b52649f) eliminó (C24). El script principal, que sí corre en `npm test`, mantiene la garantía. Recomiendo actualizar las 3 anclas con revisión de Sol (zona Direct).
2. **C09 — Player (fallo real, audible):** si pulsas A y luego B antes de que llegue el acceso de A, suena A («gana el último en llegar, no el último elegido») y además queda un blob retenido tras cerrar sesión. Causa: `catalogPlaybackSession.ts:74/84`. Recomiendo arreglarlo (token por petición + liberar el lease tardío); la prueba roja ya existe.
3. **C10 — Borrado (fallo real):** borrar el beat que suena corta el audio antes de que el servidor confirme (si falla por red/401/409, el usuario pierde el audio igualmente), y un beat borrado sigue en la cola y retiene su lease. Causa: `useCatalogGalleryScope.ts:263-267` y `onAuthoritativeEvent` sin llamadas. Recomiendo: soltar el audio solo tras confirmar y quitar el beat de la cola.
4. **C01 — cadena INDEX en el login:** el login crea un worker INDEX que, de paso, precalienta el mismo worker de mtcute que usa Direct B. Quitarlo ahorra 58 KB y un worker, pero puede cambiar el primer play en frío. Recomiendo autorizar la retirada **condicionada a una medición en frío** del primer play antes/después.
5. **C05 — lotes atascados:** el servidor nunca escribe `BLOCKED` en la operación (solo en el job); la Galería ve «en curso» hasta ~10 min sin aviso. Recomiendo que la operación pase a un estado terminal visible cuando su job se bloquea.
6. **C04 — tags con espacios dobles/tab/NBSP ya guardados:** la proyección los agrupa aparte y los comandos masivos/renombrar los unen. Recomiendo una normalización única (y comprobar si existen en datos reales).
7. **Desktop en el bundle Web (C11):** ~28 KB de Desktop/Tauri se evalúan al arrancar en Web; Desktop completo ya es diferido. Recomiendo la costura 1 (alias de Vite para Web), barata y medible.
8. **Billing legacy (C12):** `billing-checkout/-webhook/-entitlements.js` no se usan en producción; solo sus tests y 4 workflows. Recomiendo retirarlos junto con esos workflows en un PR propio.
9. **Workflows (Q3-02/03):** ni `ci.yml` ni `catalog-checks` corren en `pull_request`, y la suite `web` del catálogo no corre nunca. Recomiendo decidir qué checks exige `main`.
10. **Sincronización entre dispositivos (C23):** el cliente no lee el feed de cambios; lo hecho en otro dispositivo no aparece hasta recargar. Es una decisión de producto, no un fallo de esta noche.
11. Pendientes previos: VERSION vs package.json; host Tailscale en `webCsrfFetchCoordinator`.

## 6. Riesgos y pendientes reales
- Todo está verificado con fakes o PG efímero: **sin E2E con Telegram de pruebas**. G2 NOT_PROVEN y G3 pendiente, sin cambios.
- Las mutaciones de las pruebas PG (C14/C17/C21) se razonaron, no se ejecutaron.
- El `pre-push` instalado esta noche en BeatGaler y beatgaler-arq **solo permite `local/noche-*`**: hay que retirarlo o adaptarlo (`.git/hooks/pre-push`) antes de publicar otras ramas.
- Worktrees de la noche en `E:\777\app\wt\noche-{int,apply,b,c,d}` (con `node_modules`, ~3 GB): borrarlos cuando ya no hagan falta.

## 7. Contradicciones registradas
- `refreshGroupsAndFacets`: P05 dice «sin callers» y la memoria de T09 dice «necesaria». No se tocó.
- Worktree viejo `BeatGaler-baseline-wt` (9254d5d, detached) sigue existiendo; no se tocó.
- La ficha C14 decía «crop:null preserva»: falso. PATCH y REPLACE borran el recorte igual (sin divergencia; el error era de la ficha).

Detalle: `E:\777\app\BeatGaler-noche\TABLERO.md`, `REPORTES\`, `REVISIONES\`.
