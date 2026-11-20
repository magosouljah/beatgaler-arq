# AUD-003 — canonicalización de filtros y H-002 (13:30 CST, 2026-11-20)

**Estado:** HECHO para comparación estática de identidad; PENDIENTE validación de integración y tests. **Fuente:** `magosouljah/BeatGaler@4e66638051effe888e66a885010065d98fc7df17`; comparación de rama `local/landing-gallery-unificada` con SHA: identical, 0 commits. **No se ejecutaron tests ni se accedió a producción.**

## Mapa de responsabilidades y recorrido
`UI (filtros/sort)` → `catalogQueryStore.setQuery/setSort` → `filtersKey` (identidad **local**, no hash de cursor) → `loadFirst` → `catalogApi.listBeats` → GET `/catalog/v1/beats` → `queries.parseListRequest` → `filterHashOf` y SQL `filterSql` → respuesta de PostgreSQL → bloques Gallery.

- `src/features/library/catalog/catalogApi.ts:98-115`: `buildQuery` serializa estado, sort, búsqueda, etiquetas repetidas, includeMode, cursores y límites sin canonicalizar etiquetas; `:153-156` usa GET y `:223-227` produce clave local. La API transporta metadatos, bearer/cookie, errores tipados; no medios.
- `src/features/library/catalog/catalogQueryStore.ts:355-360`: `setQuery` compara la clave con `snapshot.queryKey`; si coincide **y hay bloques**, evita nueva carga. Si no, publica filtros/sort/clave y llama `loadFirst`. `setSort` delega a `setQuery`. Owner de identidad y bloques: query store, no servidor.
- `cloud-server/catalog/queries.js:85-146`: `byteSort` deduplica y ordena por `Buffer.compare(Buffer.from(...,'utf8'))`; `canonicalQ` recorta y pasa a minúsculas; `parseListRequest` valida enums, límites, booleanos, tamaño de q/tags, cursor/edge y produce `filterHash` SHA-256 de JSON canónico sin sort. `:164-213` `filterSql` aplica búsqueda y etiquetas ANY/ALL, exclusión; los valores de etiquetas se comparan como texto exacto en SQL. La ordenación de etiquetas canonicaliza el conjunto, no determina el orden de beats; el sort de beats lo define `TUPLES` en `:39-56`.

## Contraste adversarial
**CONFIRMADO estáticamente — H-002:** el comparador cliente de `catalogApi.ts:225` compara las cadenas de dígitos decimales de bytes, no bytes. Ejemplo ASCII: `'d'` (100) y `'c'` (99): cliente considera `'d' < 'c'` porque `'100' < '99'`, servidor ordena `'c' < 'd'` por 99 < 100. Un segundo contraejemplo es `compare('a','a') = 1` (nunca 0), violando la convención de comparador. No se ha demostrado fallo observable en Gallery.

**Invariante favorable comprobable estáticamente:** para etiquetas únicas, el comparador cliente define un orden lexicográfico consistente de representaciones decimales distintas, aunque no sea el mismo orden UTF-8 del servidor. La deduplicación Set antes de ordenar significa que permutar `['c','d']` no debería cambiar `filtersKey`; ambos órdenes del mismo conjunto producen una clave local igual. En el servidor ambas permutaciones producen el mismo `filterHash`. **No afirmar colisión de conjuntos distintos ni corrupción de cursor** por este defecto sin otro contraejemplo.

**Diferencia de contrato:** cliente incluye `sort` en `filtersKey` (`:225-226`), servidor lo separa del `filterHashOf` (`queries.js:106-108`), aunque `parseListRequest` lo conserva para la consulta. Esto es esperable para identidades con propósitos diferentes; no implica defecto.

**RIESGO/NO_VERIFICABLE:** diferencias de serialización de JSON/Unicode, etiquetas vacías y normalización del cursor aún no se contrastaron con `cursor.js` ni pruebas escritas; no afirmar igualdad byte a byte de hashes. La cadena de error de SQL es `queries.js:228-244`: timeout 57014 → 503 CATALOG_QUERY_TIMEOUT, otros errores → 503 CATALOG_UNAVAILABLE; no se ha seguido hasta UI en este lote.

## Cobertura propuesta y modificación futura
- `catalogApi.ts`: C2 del tramo `buildQuery/filtersKey`; para corregir H-002, usar comparación real de bytes y devolver 0 ante igualdad; confirmar antes que no altera identidad de cachés persistidas.
- `queries.js`: C2 de canonicalización y predicados SQL (tramos `:85-213`), no del motor completo ni transacciones/cursor.
- `catalogQueryStore.ts`: C2 del tramo `setQuery/setSort`, no de todo el store.
- **C3:** NO propuesto; faltan pruebas escritas relevantes, rutas de cursor y demostración de efectos end-to-end.

## Pendientes separables para Director
1. Verificar `cursor.js` y pruebas de canonicalización Unicode/etiquetas; distinguir hash de filtro, firma de cursor y clave local.
2. Falsar efectos de H-002 sobre caché con contraejemplo de dos conjuntos distintos que colisionen (si existe), o cerrar el riesgo de colisión.
3. Mantener AUD-004 recuperación de membresía y AUD-005 debounce/sort como microlotes independientes.

**No se modificó BeatGaler ni ningún registro canónico.**
