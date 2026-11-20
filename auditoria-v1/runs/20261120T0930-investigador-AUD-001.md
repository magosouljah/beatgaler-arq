# AUD-001 — checkpoint investigador 2026-11-20 09:30

**Código:** `magosouljah/BeatGaler@4e66638051effe888e66a885010065d98fc7df17` (ref explícito de cada archivo). **Asignación:** AUD-001 vigente según PLAN.md leído. **Método:** lectura estática, sin ejecutar tests/servicios ni acceder a producción. Este checkpoint amplía las pruebas escritas y los consumidores reales de filtros; no cierra AUD-001.

## Mapa técnico nuevo: filtros y estado de Gallery

`src/features/library/catalog/catalogApi.ts:224-227` exporta `filtersKey`: convierte filtros y sort en una cadena JSON para identificar una consulta. `src/features/library/catalog/catalogQueryStore.ts:11` lo importa; `:109` lo usa al crear el estado inicial, `:265` al publicar un bloque provisional, `:304` al reiniciar carga y `:355` al calcular la clave de consulta. Por tanto **H-002 no es código muerto**: la anomalía afecta una clave de identidad del estado de Gallery, no directamente el orden SQL de resultados. No se ha demostrado todavía colisión efectiva, corrupción de caché ni comportamiento visible.

Diagrama textual observado:

`catalogApi.filtersKey(filters,sort)` → `catalogQueryStore` (inicialización / seed provisional / reset / nueva consulta) → `snapshot.queryKey` → consumidores aguas abajo **pendientes de seguir**.

### H-002 — contraejemplo del comparador (verificación estática)

El comparador en `catalogApi.ts:225` compara `TextEncoder().encode(x).join(',')` como cadenas lexicográficas, no arrays de bytes numéricos. Ejemplo: bytes ASCII 2 (representación `"50"`) y 10 (representación `"49,48"`) se ordenan inversamente a sus valores numéricos. Para caracteres imprimibles también existe inversión: `"A"` = byte 65 (cadena `"65"`), `"é"` = bytes 195,169 (cadena `"195,169"`); el comparador considera `"195,169" < "65"` aunque 195 > 65. Además nunca devuelve cero para igualdad, aunque `Set` elimina duplicados exactos antes del sort. **Clasificación:** defecto de comparador verificable estáticamente; impacto funcional HIPÓTESIS. Falta comprobar contrato del hash de servidor, estabilidad de claves y consecuencias sobre UI. No afirmar fallo de producción.

## Pruebas escritas inspeccionadas (NO ejecutadas)

- `cloud-server/tests/catalog/catalog-native-transport-provisioning.test.cjs`: tres casos: primera asignación/segunda llamada ready; bot no permitido o no disponible; fallo Telegram permanece pending y nunca marca READY. Usa pool/store/gateway falsos. **No prueba** recuperación automática del GET /context ni secuencia Web→UI.
- `cloud-server/tests/catalog/catalog-routes.test.cjs`: harness HTTP local Express con autoridad y queries falsas. Prueba autenticación 401, provisión 201/200, aislamiento del usuario autenticado frente a query, errores 409/500 y precondiciones de escritura. **No prueba** transporte Telegram real ni UI tras error de provisión.
- `cloud-server/tests/direct-vault-assignment.test.cjs`: fakePool SQL con casos de selección determinista y reparto, persistencia al recrear store, transición pending→ready→repair, mismatch de bot y lock advisory. El fake no demuestra comportamiento transaccional de PostgreSQL real ni carreras reales.

### R-001 — alcance de la evidencia

`catalogApi.ts:194-216` solo aprovisiona cuando GET responde `LIBRARY_NOT_PROVISIONED`. `catalog/routes.js:77` invoca `ensureForUser` después de la provisión; `:130-133` lo invoca para IMPORT/REPLACE y `:180-181` para direct/session. `native-transport-provisioning.js:46-54` retorna si ready o intenta gateway y falla pending. **Riesgo estático:** GET exitoso tras commit SQL no reintenta membresía. **Contraejemplo al fallo permanente:** existen dos endpoints alternativos que sí la reintentan. La alcanzabilidad desde UI y recuperación sin acción manual siguen NO PROBADAS.

## Cobertura propuesta, no certificada

- `catalogApi.ts:224-227`: C2 de tramo; consumidor identificado y error de orden estático. C3 pendiente de contrato y consecuencias.
- `catalogQueryStore.ts:11,109,265,304,355`: C1 parcial, C2 de la relación queryKey solamente; NO C2 del módulo completo.
- Tres archivos de pruebas: C1 parcial de sus escenarios y límites; sin pruebas ejecutadas.
- F02: C2 parcial sin cambio de nivel; R-001 sigue RIESGO.

## Checkpoint siguiente

1. Seguir `snapshot.queryKey` y todos los consumidores de `filtersKey`, distinguir identidad de consulta vs orden de tags y comprobar colisiones reales.
2. Seguir rutas UI que invocan IMPORT/REPLACE o direct/session cuando Gallery queda bloqueada tras error de membresía; comprobar estados de loading/recovery.
3. Contrastar contrato de orden/canonicalización en servidor y tests específicos del cliente.
4. Revalidar SHA remoto antes del próximo lote; no usar code search de main como prueba.

**Límites:** lectura a SHA explícito de los archivos citados, no comprobación de ejecución ni inventario completo; no se realizaron cambios al repositorio BeatGaler.
