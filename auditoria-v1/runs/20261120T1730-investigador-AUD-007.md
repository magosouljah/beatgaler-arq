# AUD-007 — cursores y bloques Gallery (investigación estática)
Fecha: 2026-11-20 17:30 CST. Asignación: PLAN.md dirección 17:00. Código: `magosouljah/BeatGaler@b6b999526f77054a199c74fadb39d2171ac4eb75` (SHA fijado por Director). HEAD remoto observado al iniciar: `c59ec82b9dbf63a5158fa2cdfee27b71a27ba7e8`; NO se mezcló con la evidencia del lote. Solo lectura, sin tests.

## HECHO — mapa de tres módulos
1. `cloud-server/catalog/queries.js:98-123,284-374` es dueño de canonicalización de petición y paginación SQL. `listBeats` recibe userId/query, abre `readTx`, filtra por usuario/generación/estado, aplica filtros y orden por tupla completa, obtiene `limit+1`, calcula ordinales, y emite `nextCursor`, `previousCursor`, `resumeCursor`. `finishPage` firma fuera de transacción y rechaza páginas serializadas >2 MiB (413).
2. `cloud-server/catalog/cursor.js:25-34,41-83` es dueño de claves y autenticidad, NO de coherencia SQL. Token = payload JSON canónico base64url + HMAC-SHA256; firma activa y verifica versión, kid, canonicalización y firma constante en tiempo. Firma inválida/kid desconocido -> 400 CURSOR_INVALID; clave retirada con firma válida -> 409 CURSOR_STALE. El HMAC no cifra.
3. `src/features/library/catalog/catalogQueryStore.ts:96-170,190-226,229-241,292-353` es dueño de estado de bloques residentes, filtros/sort, revisión, generaciones, inflight, errores, límites y prefetch. Solicita páginas con `api.listBeats`, valida era/epoch/generación/revisión/ordinal/duplicados, verifica solapamientos y expulsa bloques fuera de límites. Respuestas de generaciones anteriores se descartan.

## Flujo y contratos
`Gallery viewport → observeViewport (store:345-353) → loadNext/loadPrevious (302-337) → CatalogApi.listBeats → GET /catalog/v1/beats → queries.listBeats (309-374) → readTx/SQL → cursor.sign → CatalogPage → validatePage/checkOverlap → publish/evict`. La ruta HTTP y el adaptador API son fronteras identificadas, no auditados profundamente en este microlote.

Caso válido: primera página de 240, `nextCursor` exclusivo sobre última tupla; siguiente página usa misma combinación tenant/vault/generación/era/epoch/revisión/perfiles/filtros/sort/limit, devuelve ordinal esperado y se concatena. `resumeCursor` es inclusivo en primera tupla del bloque residente (queries.js:358). `previousCursor` usa tupla anterior en sentido inverso, reordena respuesta y maneja primer bloque solapado (store:317-336).

Errores: cursor alterado -> 400; filtros/sort/limit distintos -> 400 REQUEST_MISMATCH (queries.js:289-296); revisión/contexto distinto -> 409 CURSOR_STALE (297-301). Store:190-226 recupera una vez por generación con reset a primera página y aviso; segundo stale -> error manual. 401 -> unauthenticated; 503 -> unavailable si no hay bloques; error en borde con bloques conserva contenido y registra edgeError (store:203-209). La protección de continuidad incluye ORDINAL_GAP, DUPLICATE_ID y CONTEXT_MISMATCH (store:141-166).

## Falsación / límites
**CONFIRMADO estáticamente:** el cursor está ligado a identidad de petición y revisión; los bloques no se unen sin validación de ordinal/revisión. **RIESGO:** un cambio concurrente repetido puede agotar el único reset automático y requerir intervención; es una política explícita, no bug probado. **HIPÓTESIS pendiente:** estabilidad de la navegación hacia atrás bajo combinación de filtro selectivo, refresh y evicción; no hay contraejemplo demostrado. **NO_VERIFICABLE:** consistencia real bajo concurrencia PostgreSQL, tiempos y errores HTTP en producto. No se ejecutaron tests ni se verificaron fixtures de cursor específicos en este turno; no atribuir C3.

## Cobertura propuesta
`queries.js` C2 parcial (listBeats/keyset), `cursor.js` C2 parcial (firma/validación), `catalogQueryStore.ts` C2 parcial (páginas/bloques/recuperación). Ningún archivo C3 completo; módulos restantes del repo sin cambio de cobertura. El recorrido no demuestra que toda ruta de API o todos los tests estén cubiertos.

## PENDIENTE / próximos microlotes
Revisar pruebas escritas de cursores y bloques, la ruta HTTP exacta y adaptador CatalogApi; contrastar `readTx`/aislamiento SQL, edge=last, cursor de facets y refresh multibloque. Proponer al Director cerrar AUD-007 PARCIAL y conservar estas fronteras en lote nuevo. Siguiente asignación solo del Director.
