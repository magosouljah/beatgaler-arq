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
