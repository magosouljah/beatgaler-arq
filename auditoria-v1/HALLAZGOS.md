# Índice de hallazgos (propiedad del Director)

**Ningún hallazgo de la nueva campaña ha sido confirmado todavía.** Los siete informes anteriores de `pasada-1/zonas/` son material histórico a revalidar en el SHA vigente. No migrar automáticamente sus conclusiones como defectos actuales.

Estados permitidos: `CONFIRMADO`, `RIESGO`, `HIPÓTESIS`, `DESCARTADO`, `NO_VERIFICABLE`. Cada ID debe enlazar a `runs/`, código exacto, líneas, SHA, escenario, impacto, causa raíz, evidencia en contra si existe y causa de la clasificación. Duplicados se fusionan por causa raíz, conservando referencias anteriores.

| ID | Resumen | Estado | Severidad | SHA | Evidencia | Próxima prueba |
|---|---|---|---|---|---|---|
| — | Sin hallazgos verificados aún | — | — | — | — | — |

## Revisión Director 2026-11-20 05:00 — AUD-001 (checkpoint 04:30)

- **R-001 — RIESGO, no bug confirmado**, `BeatGaler@4e66638051effe888e66a885010065d98fc7df17`: `cloud-server/catalog/routes.js:75-79` llama primero `authority.provisionLibrary`, después `transportProvisioner.ensureForUser`; `authority.js:168-185` devuelve contexto si ya existe biblioteca POSTGRES; `src/features/library/catalog/catalogApi.ts:194-215` solo reaprovisiona con `LIBRARY_NOT_PROVISIONED`. Secuencia estática verificada: fallo de membresía tras crear biblioteca puede impedir reintento desde la resolución de contexto. **No demostrado:** ausencia de reparación por otras rutas, ni incidencia real. Comprobar invocadores adicionales y estado PENDING.
- **H-002 — HIPÓTESIS de impacto / anomalía estática del comparador**, `src/features/library/catalog/catalogApi.ts:222-225`: orden lexicográfico de cadenas decimales UTF-8; `'d'` codifica `100` y `'c'` `99`, por lo que puede invertir orden numérico. **No probado:** impacto en consultas/caché ni equivalencia con servidor. Seguir usos y pruebas antes de elevar a bug de producto.
- Fuente: [checkpoint 04:30](runs/20261120T0430-investigador-AUD-001.md). No se ejecutaron tests.

## Contraste Director — 2026-11-20 06:00
- **R-001 permanece RIESGO:** confirmada separación entre COMMIT de biblioteca y efecto externo de membresía, con GET posterior que no reintenta. **Contraejemplo:** `routes.js` llama a `ensureForUser` en IMPORT/REPLACE y direct/session; por ello NO afirmar recuperación imposible ni bug operativo confirmado. Evidencia primaria `authority.js:168-245`, `routes.js:71-79,130-135,179-184`, `catalogApi.ts:194-216` @ 4e66638051effe888e66a885010065d98fc7df17.
- **H-002 permanece HIPÓTESIS de impacto:** `catalogApi.ts:222-225` compara serializaciones decimales de bytes lexicográficamente. Ejemplo lógico `100` < `99` como cadenas, pero falta trazar consumidores y efectos. No elevar a bug.

## Contraste Director — 2026-11-20 10:00
- **H-002: anomalía del comparador CONFIRMADA estáticamente, impacto HIPÓTESIS.** `catalogApi.ts:224-227` compara `TextEncoder().encode(tag).join(',')` como texto. Ejemplo `A` (65) frente a `é` (195,169) invierte orden numérico UTF-8. `catalogQueryStore.ts:109,355-358` usa la clave para identidad/reutilización de consulta. No se ha probado que produzca claves iguales para filtros diferentes, ni daño a resultados; no elevar a bug operativo. [09:30](runs/20261120T0930-investigador-AUD-001.md).
- **R-001 sigue RIESGO**, sin prueba de bloqueo permanente; test `catalog-native-transport-provisioning.test.cjs` solo usa dobles y no cubre GET contexto posterior ni UI.

## Revisión v2.1 — 2026-11-20 12:00
- **H-002:** CONFIRMADO únicamente como anomalía estática de comparador en `src/features/library/catalog/catalogApi.ts:224-227` @ `4e66638051effe888e66a885010065d98fc7df17`: compara serializaciones decimales UTF-8 lexicográficamente y nunca devuelve 0 en igualdad. Contraejemplo estático: `compare("a","a")=1`; no se demostró colisión, fallo de UI ni equivalencia de contrato SQL. Impacto HIPÓTESIS; no bug operativo certificado. Revalidado con archivo a SHA y [informe 11:30](runs/20261120T1130-investigador-AUD-001-cierre-tramos.md).
- **R-001:** RIESGO preservado sin elevar: COMMIT SQL separado de membresía, pero existen otros disparadores de reparación. No evidencia nueva de fallo permanente; AUD-004 estudiará alcanzabilidad UI.
- **AUD-001 PARCIAL:** cierre administrativo no cambia la clasificación de los hallazgos. Ningún bug operativo nuevo confirmado.

## Revisión adversarial AUD-002 — 13:00 @ `4e66638051effe888e66a885010065d98fc7df17`
- **R-002 — RIESGO (sort/debounce)**: `useCatalogGalleryScope.ts:157-171` programa timeout con dependencias `[search,includedTags,excludedTags]`, captura `snapshot.sort`; `setSortBy` llama `store.setSort` sin cancelar explícitamente timeout. Escenario plausible: búsqueda pendiente, cambio de sort, vence callback anterior y aplica sort capturado. **No se ejecutó React ni se probó secuencia real**. Falta falsación en AUD-005; no bug confirmado.
- **R-003 — RIESGO (gating de mutaciones)**: `useCatalogGalleryScope.ts:504-507` mapea cualquier status distinto de offline a online; `CatalogAppShell.tsx:68-69,83-91,180-193` usa gating para ciertas acciones. No se verificaron guardas posteriores ni si una mutación llega al servidor bajo error/integrity/quarantined. AUD-006; no bug confirmado.
- **Verificación negativa acotada:** `catalogInteractionStore.ts:178-188` limpia selección al cambiar filtros y no la limpia explícitamente al cambiar sort; esto no demuestra ausencia de otros resets. Informe [AUD-002](runs/20261120T1231-investigador-AUD-002.md) contrastado. R-001 y H-002 sin cambio de clasificación.


## Revisión adversarial AUD-003 — Director 14:00 @ `4e66638051effe888e66a885010065d98fc7df17`
- **H-002 permanece anomalía estática CONFIRMADA, impacto funcional HIPÓTESIS.** `catalogApi.ts:225` compara texto decimal de bytes UTF-8 y no devuelve 0 para igualdad. `queries.js` canonicaliza etiquetas mediante comparación real de bytes; diferencia demostrada (por ejemplo 'd'=100 frente a 'c'=99). Sin embargo `Set` deduplica y el orden cliente es determinista para etiquetas únicas, por lo que **no se probó colisión entre conjuntos distintos** ni pérdida de caché. `filterHash` del servidor omite sort por diseño; `filtersKey` lo incluye: no es defecto por sí mismo. `cursor.js` usa HMAC independiente. [AUD-003](runs/20261120T1330-investigador-AUD-003.md), código @SHA.
- **R-001, R-002, R-003:** sin cambio de estado; no hay bug operativo nuevo demostrado. Pendientes AUD-004/005/006 respectivamente. Sin tests ejecutados.

## Revisión adversarial AUD-004 — Director 15:00
- **R-001 sigue RIESGO** @ `4e66638051effe888e66a885010065d98fc7df17`: `authority.js:168-245` COMMIT SQL previo a membresía; `routes.js:71-79` POST llama ensure y GET :71-73 no; `catalogApi.ts:194-216` POST solo tras 404; `catalogLibraryProvider.tsx:159-207` no retry automático en el efecto; `LibraryCompositionGate.tsx:9-38` blocked sin botón. **Contraejemplo a atrapamiento permanente:** rutas POST IMPORT/REPLACE y direct/session llaman ensure nuevamente (`routes.js:130-135,179-184`). Alcanzabilidad de UI y éxito real NO_VERIFICABLE; ningún bug operativo confirmado. Informe [AUD-004](runs/20261120T1431-investigador-AUD-004.md) verificado estáticamente.
- **Delta:** HEAD `9680c73da477cc9bcd201a036490d736bb6a7b12` cambia gateway `direct-transport-control.js`, contención y server-core; R-001 requiere revalidación selectiva a SHA nuevo. H-002, R-002 y R-003 sin evidencia adicional, no elevar.

## Contraste adversarial AUD-005 — Director 16:00
**R-002 conserva estado RIESGO; mecanismo estático CONFIRMADO** @ `9680c73da477cc9bcd201a036490d736bb6a7b12`: `useCatalogGalleryScope.ts:155-171` crea timer con `snapshot.sort` y dependencias que excluyen sort; `:174-175` actualiza sort inmediato; `catalogQueryStore.ts:355-368` acepta setQuery posterior. Escenario: editar búsqueda, cambiar sort antes de 250 ms y dejar vencer timer → puede restaurarse sort anterior. Contraejemplos: nueva edición de filtros cancela timer; timer que vence antes del sort no revierte nada. No se ha observado navegador ni test, por tanto NO se clasifica como bug operativo confirmado. [Informe AUD-005](runs/20261120T1534-investigador-AUD-005.md). Delta a HEAD `45ec5b27e778127414537d01d170e0b972777768` no modifica estos módulos Web. H-002, R-001 y R-003 sin nueva validación; gateway de R-001 cambió y exige revalidación selectiva.
