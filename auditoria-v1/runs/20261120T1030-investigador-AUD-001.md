# AUD-001 — checkpoint 2026-11-20 10:30 (Investigador)

**Fuente:** `magosouljah/BeatGaler@4e66638051effe888e66a885010065d98fc7df17` (rama LOCAL; GitHub compare `identical`, 0 commits y 0 archivos de delta). **Método:** lectura estática a SHA explícito; no se ejecutó código ni tests. **Asignación:** AUD-001 sigue ASIGNADO en PLAN; no se crea otro lote.

## Pregunta incremental
¿Qué hace realmente `filtersKey` en el estado de consultas, en la caché de primera página y en los refreshes, y qué consecuencias se pueden probar del comparador?

## Mapa técnico verificado
- `src/features/library/catalog/catalogApi.ts:223-227`: `filtersKey(filters, sort)` normaliza `q` (trim + lowercase), deduplica tags mediante Set, los ordena con `byBytes`, serializa estado, búsqueda, modo, tags incluidos/excluidos y orden. **Estado propietario:** ninguno; función pura, identificador de consulta, no cursor firmado.
- `src/features/library/catalog/catalogQueryStore.ts:109,355-359`: store posee `snapshot.queryKey` y bloques. `setQuery` calcula la clave; si es igual y existen bloques evita `loadFirst`; si cambia publica filtros/orden/clave y carga primera página. `:261-265` siembra caché provisional; `:268-284` revalida contra SQL, y ante error retira copia. `:371-405` procesa mutaciones mediante `notifyLibraryChanged` → `refreshResident`, conservando tarjetas mientras solicita páginas nuevas; en error con bloques conserva último estado. `:339-346` permite retry de errores de borde.
- `src/features/library/catalog/catalogLibraryProvider.tsx:94`: callback `onFirstPage` guarda primera página bajo `queryKey` solo si coinciden era/época/generación; `:170-205` tras `/context` listo calcula `filtersKey` de consulta de arranque, busca entrada local por identidad, siembra provisional y lanza revalidación. El provider destruye servicios anteriores al cambiar composición/cuenta (`:179-181,203-205`).
- **Diagrama:** UI (filtros/orden) → store.setQuery → filtersKey → snapshot.queryKey → [clave igual y bloques: no recarga | clave diferente: loadFirst] → API catálogo; primera página confirmada → onFirstPage → caché IndexedDB; arranque → /context ready → identidad de autoridad → cache.pick(filtersKey) → seedFirst provisional → revalidate → página PostgreSQL / error.
- **Ownership:** `catalogApi` define identidad determinista de consulta; `catalogQueryStore` posee estado de bloques/generaciones/errores; `catalogLibraryProvider` compone servicios y controla ciclo de vida y recuperación desde caché. El servidor es autoridad de páginas; caché es provisional, no fuente final.

## Hallazgos y contraejemplos
**H-002 — DEFECTO ESTÁTICO confirmado, impacto no probado.** `catalogApi.ts:224`: `new TextEncoder().encode(a).join(',') < ...join(',')` compara cadenas decimales, no bytes UTF-8. Contraejemplo abstracto: byte 2 vs byte 10 → `'2' > '10'` aunque 2 < 10. Además para a===b retorna 1, violando contrato de comparador. **No se ha probado una colisión de claves ni error UI**: para el mismo conjunto deduplicado, el orden erróneo puede seguir siendo determinista; el backend no utiliza esta función para ordenar SQL. No elevar a bug operativo sin escenario de dos consultas equivalentes con claves diferentes o contrato externo vulnerado.
**R-001:** esta pasada no añade prueba sobre recuperación Telegram; conservar RIESGO sin ascenderlo a fallo.
**Posible riesgo adicional, NO_PROBADO:** en `catalogQueryStore.ts:355-356`, si dos consultas semánticamente diferentes produjeran la misma clave, se reutilizarían bloques. No hay colisión demostrada y JSON serializa campos separados, por lo que NO registrar como bug.
**Verificación negativa:** `catalogLibraryProvider.tsx:186-194` no muestra la caché antes de contexto ready y comprueba identidad de autoridad antes de sembrarla; no sostiene la hipótesis de usar caché como autoridad independiente.

## Tests, límites y cobertura propuesta
En este checkpoint no se inspeccionaron nuevos tests; los informes previos describen pruebas con fakes, no ejecución. C2 **de tramos** propuesto: `catalogApi.ts:223-227`, `catalogQueryStore.ts:109,261-284,339-405`, `catalogLibraryProvider.tsx:94,170-205`; F01 y estado de Gallery C2 parcial. **No C3**: faltan llamadas UI concretas a `setQuery`, implementación de `cache.pick/write`, contrato SQL de filtros y tests de normalización/canonicalización.

## Próximo checkpoint
Seguir callers UI de `setQuery`/`setSort`, contrato backend de normalización y orden de tags, y pruebas escritas de caché. Después investigar alcanzabilidad UI de reparación de membresía (R-001). No modificar registros canónicos.
