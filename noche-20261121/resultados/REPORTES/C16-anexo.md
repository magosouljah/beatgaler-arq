# C16 · Anexo de inspección estática

## Comandos y resultados

- `git status --porcelain=v1 --branch` · `## local/noche-c14` sin entradas antes y después. Git avisó que no puede leer el ignore global. `git rev-parse --short HEAD` · `65ffa1e`.
- `git ls-files 'cloud-server/migrations/003[1-9]_*.sql' 'cloud-server/migrations/004[0-2]_*.sql'` y `git ls-files ':(glob)**/*.integration.cjs'` · `SQL=12 INTEGRACIONES=36`.
- `git grep -n -E '\b(<objetos DDL separados por |>)\b' -- ':(glob)**/*.integration.cjs'` · código 0 en las 12 búsquedas por archivo, incluso si el único resultado pertinente era un fixture. Véanse los recuentos abajo. Los objetos con nombre se extrajeron de `CREATE` / `ALTER TABLE` y se completaron con columnas, restricciones y literales leídos en cada SQL.
- `git grep -n -E 'CREATE POLICY|ALTER POLICY|ENABLE ROW LEVEL SECURITY' -- 'cloud-server/migrations/003[1-9]_*.sql' 'cloud-server/migrations/004[0-2]_*.sql'` · `grep RLS exit=1` (sin coincidencias).
- `git grep -n -E 'attstattarget|pg_stats|last_autovacuum|REUSED_UNROTATED|catalog_trash_entries_export_idx|catalog_beats_search_null_idx|catalog_native_activation_direct_token_exposure_check' -- ':(glob)**/*.integration.cjs'` · código 1 (sin coincidencias exactas). Los casos en `catalog-native-cli.test.cjs` se inspeccionaron aparte.
- `Get-Content -Raw scripts/catalog-suites.json | ConvertFrom-Json` y extracción de `SUITES` con `Get-Content -Raw .github/workflows/catalog-checks.yml` · `CI push=18 suites PG=13 PG-en-push=13` y `PASS inspección estática`. `integration` ejecuta el caso de ciclo de vida del arnés, y la cadena DDL se comprueba en T03. `perf` y T20 están pendientes, sin casos, fuera de `SUITES`.
- Lectura de los cuerpos con `Get-Content` y búsqueda cruzada en `cloud-server/catalog/` con `git grep -n -E` · revisada la relación con las aserciones. `ci.yml` llama al runner Cloud de nivel superior. El cruce de los demás `*.integration.cjs` no aportó aserciones del cambio de estas migraciones.

| Migración | Líneas devueltas por `git grep` de objetos DDL | Archivos distintos |
|---|---:|---:|
| 0031 | 4 | 3 |
| 0032 | 2 | 1 |
| 0033 | 8 | 3 |
| 0034 | 3 | 1 |
| 0035 | 4 | 2 |
| 0036 | 22 | 9 |
| 0037 | 104 | 15 |
| 0038 | 6 | 3 |
| 0039 | 5 | 1 |
| 0040 | 150 | 15 |
| 0041 | 11 | 1 |
| 0042 | 24 | 18 |

## Títulos exactos de las pruebas

Las integraciones consignadas están configuradas para PostgreSQL efímero. Las filas 0036 y 0042 incluyen pruebas de contexto que no verifican el efecto nuevo. Los títulos de schema 52, 66 y 77 acreditan el alcance de la aplicación del DDL.

| Migración | Archivo:línea | Nombre del test | Suite en push |
|---|---|---|---|
| DDL común | cloud-server/tests/catalog/catalog-schema.integration.cjs:52 | fresh: todas las migraciones (0001–0042), idempotente y catálogo vacío en LEGACY | T03 ✓ |
| DDL común | cloud-server/tests/catalog/catalog-schema.integration.cjs:66 | aplicación concurrente desde DB vacía: un solo ledger, sin duplicados | T03 ✓ |
| DDL común | cloud-server/tests/catalog/catalog-schema.integration.cjs:77 | upgrade 0001-0025 → 0026 conserva datos legacy y no importa nada | T03 ✓ |
| 0031 | cloud-server/tests/catalog/catalog-direct.integration.cjs:98 | camino feliz: ticket → envío del «navegador» → recibo → verificación PROVIDER → commit, sin un solo byte por el gateway del servidor | T12 ✓ |
| 0031 | cloud-server/tests/catalog/catalog-direct.integration.cjs:121 | ticket sin informe tras un fallo de envío: otro ticket queda bloqueado (PART_UNCERTAIN, sin reenvío) | T12 ✓ |
| 0031 | cloud-server/tests/catalog/catalog-direct.integration.cjs:134 | informe REJECTED → nuevo ticket con el mismo random_id → recibo → commit (un mensaje) | T12 ✓ |
| 0031 | cloud-server/tests/catalog/catalog-direct.integration.cjs:155 | respuesta perdida (el mensaje SÍ existe): UNCERTAIN → sin reenvío → la reconciliación NO adopta sola (E5/C7.8) y queda para revisión | T12 ✓ |
| 0031 | cloud-server/tests/catalog/catalog-direct.integration.cjs:232 | aislamiento: otro usuario no obtiene ticket, informe ni recibo; PROJECT exige Access (plan) antes del ticket; informes inválidos se rechazan | T12 ✓ |
| 0031 | cloud-server/tests/catalog/catalog-backup.integration.cjs:132 | backup en A → purge posterior → restore aislado: estado de A, restore_hold + época+1, capacidades revocadas, workers apagados, época vieja rechazada | T19 ✓ |
| 0032 | cloud-server/tests/catalog/catalog-playback.integration.cjs:121 | rondas N=0/1/2/240: cada miembro exactamente una vez, remaining exacto, ronda completa sin sorteo (m=0), mapping vacío al terminar; la canción actual se consume al abrir si N>1 | T14 ✓ |
| 0032 | cloud-server/tests/catalog/catalog-playback.integration.cjs:142 | idempotencia y CAS: replay devuelve el mismo beat sin consumir otro; sequence vieja → 409; 5 avances concurrentes con la misma sequence → exactamente uno; consume explícito (inverso) y doble consume sin descuento; no miembro | T14 ✓ |
| 0032 | cloud-server/tests/catalog/catalog-playback.integration.cjs:170 | equivalencia SQL ↔ modelo puro con RNG inyectado (N=12): misma secuencia de slots y mismo mapping disperso; N grande: 300 avances distintos con ≤300 filas de mapping | T14 ✓ |
| 0032 | cloud-server/tests/catalog/catalog-playback.integration.cjs:193 | revisión externa → ROUND_STALE (sin mezclar revisiones); ronda nueva sobre el conjunto READY nuevo reconstruida en lotes preservando consumidos: la unión de ambas rondas es exactamente la biblioteca | T14 ✓ |
| 0032 | cloud-server/tests/catalog/catalog-playback.integration.cjs:232 | medios (E77): acceso por referencia directa (caché por época/revisión, sin concesiones de bytes), lectura del navegador completa y por rangos, multipart con hash, denegado en TRASH y recuperado al restaurar, otra cuenta | T14 ✓ |
| 0033 | cloud-server/tests/catalog/catalog-purge.integration.cjs:116 | E81 eliminación definitiva: el beat sale del catálogo y de la Gallery sin esperar a Telegram (PURGED, tombstone, cuota liberada una vez, evento) con manifiesto de limpieza durable; luego journal → delete → MessageEmpty → DELETED; límite por revisión; idempotencia y peticiones concurrentes | T15 ✓ |
| 0033 | cloud-server/tests/catalog/catalog-purge.integration.cjs:164 | E81 archivo compartido y bloqueos: compartido/retenido → el beat sale del catálogo y el objeto se CONSERVA (el otro beat intacto; se borra cuando ya nadie lo usa); OPAQUE / operación en vuelo → el beat sigue en la papelera; cleanup apagado / restore_hold → limpieza diferida durable que se reanuda por evento explícito | T15 ✓ |
| 0033 | cloud-server/tests/catalog/catalog-purge.integration.cjs:219 | E81 Telegram falla: rechazo → REJECTED (no se reintenta solo); timeout sin efecto → solo consulta, presente → nuevo intento → DELETED; timeout con efecto → consulta → DELETED sin reenviar; sin respuesta → UNCERTAIN aparcado y reanudado por evento; journal caído → diferido sin delete; tope de intentos. El beat nunca vuelve ni queda en PURGING | T15 ✓ |
| 0033 | cloud-server/tests/catalog/catalog-purge.integration.cjs:262 | E81 reinicio y concurrencia en la limpieza: reinicio tras enviar el delete → la reanudación solo consulta (sin reenviar); reinicio antes del journal → se completa; mismo objeto con borrado en vuelo en otra purga → espera sin efecto; dos workers no procesan el mismo objeto; lease viejo no confirma | T15 ✓ |
| 0033 | cloud-server/tests/catalog/catalog-purge.integration.cjs:314 | E81 papelera y restos anteriores: restaurar antes de eliminar definitivamente deja el beat intacto; tras eliminar, restore/REPLACE/acceso se rechazan; cancel solo detiene la fase de catálogo; beat PURGING de antes de E81 con una parte ya borrada → sale del catálogo y su limpieza continúa; restore_hold exige journal reconciliado | T15 ✓ |
| 0033 | cloud-server/tests/catalog/catalog-backup.integration.cjs:158 | reconciliación del journal: B (papelera)=DELETED_CONFIRMED; C (ACTIVE en A)=UNRECOVERABLE bloquea; con copia verificada→BYTES_RESTORED→RECONCILED; bytes alterados=BYTES_MISMATCH | T19 ✓ |
| 0034 | cloud-server/tests/catalog/catalog-native-cli.integration.cjs:105 | rebind-chat + reset de un vault legacy sin catálogo: reset exige rebind previo y hash posterior; rebind deja auditoría y cambia el chat por la ruta del control-plane (JSON-compat incluido); reset crea la biblioteca POSTGRES con generación RESET, chat legacy LEGACY_ABANDONED, capacidades revocadas, filas legacy intactas; repetir = ALREADY_APPLIED; otro manifiesto = LIBRARY_ALREADY_NATIVE; después solo rebind-chat puede cambiar el chat | T17 ✓ |
| 0035 | cloud-server/tests/catalog/catalog-backup.integration.cjs:132 | backup en A → purge posterior → restore aislado: estado de A, restore_hold + época+1, capacidades revocadas, workers apagados, época vieja rechazada | T19 ✓ |
| 0035 | cloud-server/tests/catalog/catalog-backup.integration.cjs:158 | reconciliación del journal: B (papelera)=DELETED_CONFIRMED; C (ACTIVE en A)=UNRECOVERABLE bloquea; con copia verificada→BYTES_RESTORED→RECONCILED; bytes alterados=BYTES_MISMATCH | T19 ✓ |
| 0035 | cloud-server/tests/catalog/catalog-backup.integration.cjs:198 | proveedor Telegram inaccesible: sin ausencia probada no se concluye nada (PROVIDER_UNREACHABLE bloquea); verifyBytes propaga el fallo; al recuperarse reconcilia | T19 ✓ |
| 0035 | cloud-server/tests/catalog/catalog-backup-scale.integration.cjs:136 | G4 parcial a 500 beats: backup a archivos → restore vacío → igualdad por tabla, consultas, bytes sanos/alterados/ausentes y tiempos (FAKE) | T19 ✓ |
| 0036 | cloud-server/tests/catalog/catalog-queries.integration.cjs:235 | F01/F02/N01: paridad SQL ↔ oráculo JS (search-js-v1) para búsqueda, tags exactos ANY/ALL/exclusión y orden BPM A2 | T06 ✓ |
| 0036 | cloud-server/tests/catalog/catalog-queries.integration.cjs:399 | 100k sintéticos: EXPLAIN ANALYZE/BUFFERS de primera página, página profunda, edge=last, COUNT filtrado y resolver legacy 10.000; sin Sort global; >10.000 en rango → 409 | T06 ✓ |
| 0037 | cloud-server/tests/catalog/catalog-search-text.integration.cjs:81 | equivalencia exacta: listBeats con search_text == predicado por campos (corpus aleatorio, semilla fija, límites de campo y metacaracteres LIKE) | T19 ✓ |
| 0037 | cloud-server/tests/catalog/catalog-search-text.integration.cjs:115 | escritores: PATCH (nombre, bpm, key, tags) y bulk add/remove mantienen search_text == recomputo; resultados de q correctos | T19 ✓ |
| 0037 | cloud-server/tests/catalog/catalog-search-text.integration.cjs:153 | guarda 0037: un escritor ajeno que cambia name_search/key_search/bpm_display sin search_text lo invalida (NULL) y q sigue acertando por el predicado por campos | T19 ✓ |
| 0037 | cloud-server/tests/catalog/catalog-search-text.integration.cjs:165 | backfill de 0037 sobre datos preexistentes == proyección calculada por el código (mismatches 0) | T19 ✓ |
| 0037 | cloud-server/tests/catalog/catalog-f3-equivalence.integration.cjs:120 | F3-EQ-01 · PATCH y REPLACE materializan la misma metadata para el mismo beat | T09 ✓ |
| 0037 | cloud-server/tests/catalog/catalog-commands.integration.cjs:148 | trash/restore: lote ≤50 atómico (un conflicto → nada aplicado), wrapper con purge_after +14d y export_position monótono, restore al final del orden manual, tombstone → PURGE_PENDING, fallo entre sentencias → rollback íntegro | T07 ✓ |
| 0038 | cloud-server/tests/catalog/catalog-search-text.integration.cjs:189 | 0038: modo de búsqueda determinista por q y uso de índice (GRAMS/TRGM/SCAN) verificado con EXPLAIN | T19 ✓ |
| 0038 | cloud-server/tests/catalog/catalog-search-text.integration.cjs:214 | 0038: aislamiento por tenant, filtros combinados, estado y COUNT == predicado por campos (q de todas las clases) | T19 ✓ |
| 0038 | cloud-server/tests/catalog/catalog-search-text.integration.cjs:269 | 0039: planSearch elige GIN (poco frecuente) o recorrido (frecuente) sin cambiar resultados; COUNT de q de 1-2 caracteres = contador exacto; filas sin proyectar usan el predicado por campos | T19 ✓ |
| 0039 | cloud-server/tests/catalog/catalog-search-text.integration.cjs:165 | backfill de 0037 sobre datos preexistentes == proyección calculada por el código (mismatches 0) | T19 ✓ |
| 0039 | cloud-server/tests/catalog/catalog-search-text.integration.cjs:243 | 0039: contadores == recomputo tras una secuencia aleatoria de INSERT / UPDATE (search_text, state) / DELETE por sentencias de 1 y N filas (semilla fija) | T19 ✓ |
| 0039 | cloud-server/tests/catalog/catalog-search-text.integration.cjs:269 | 0039: planSearch elige GIN (poco frecuente) o recorrido (frecuente) sin cambiar resultados; COUNT de q de 1-2 caracteres = contador exacto; filas sin proyectar usan el predicado por campos | T19 ✓ |
| 0040 | cloud-server/tests/catalog/catalog-schema.integration.cjs:225 | 0040: autovacuum/analyze al 2 % en las tablas grandes y 5 % en facetas/papelera | T03 ✓ |
| 0041 | cloud-server/tests/catalog/catalog-prefix-packs.integration.cjs:135 | umbral y contador derivado: 4 no reconstruyen, el 5.º sí; lote de 12 = una publicación y contador a cero; dispositivo nuevo; Cloud sin bytes | T12 ✓ |
| 0041 | cloud-server/tests/catalog/catalog-prefix-packs.integration.cjs:172 | reemplazo, papelera y subida fallida; ticket único, caducidad, cancelación y validación de entradas; aislamiento | T12 ✓ |
| 0041 | cloud-server/tests/catalog/catalog-prefix-packs.integration.cjs:221 | publicación: verificación del mensaje (marcador y tamaño), compare-and-swap entre dispositivos y fallos que conservan el MAIN y los pendientes | T12 ✓ |
| 0042 | cloud-server/tests/catalog/catalog-native-cli.integration.cjs:63 | activate: inspect aprobado + JSON-compat = SQL + rol antiguo NOLOGIN con 0 backends + bots listos → dry-run sin filas, apply inserta la única fila, repetir = no-op, otro manifiesto = STOP; cada precondición fallida se nombra y no escribe | T17 ✓ |
| 0042 | cloud-server/tests/catalog/catalog-native-cli.test.cjs:94 | REUSED_UNROTATED: exige aprobación real, rol dedicado, cero backends legacy y reporta riesgos sin alegar rotación | unit, T17 ✓ |

## Distinciones que afectan el veredicto

- 0033 · La concurrencia de `purge:116` observa `PURGE_IN_PROGRESS` emitido tras consultar la purga activa en `cloud-server/catalog/purge.js:214–233`. El rechazo por el índice parcial queda sin aislar.
- 0034 · El DELETE de la tabla de auditoría sí alcanza el trigger. El UPDATE directo dentro del mismo caso tiene como objetivo `vaults`, y la CLI rechaza chats ya usados antes de depender de la unicidad de la auditoría.
- 0037/0038 · `commands:148` comprueba el valor de exportación, mientras `search-text:189` compara nombres de índices en el plan generado por PostgreSQL. Los planes del índice de exportación y del índice de filas NULL quedan fuera de esas aserciones.
- 0039 · El caso de upgrade `search-text:165` llama a `mismatches`, que suma el recomputo de `search_text` y `countsDiff` (líneas 69–77). En el caso aleatorio las escrituras válidas se comparan con el oráculo; no se induce un delta negativo.
- 0040 · `pg_class.reloptions` proporciona evidencia de configuración instalada, más precisa que inspección del SQL. En tablas pequeñas el test comprueba solo `vacuum_scale_factor`, y no observa actividad del proceso de mantenimiento.
- 0041 · La app comprueba `building` y el ticket vigente antes de insertar. Las aserciones del estado final y de la carrera de publicación dan evidencia del protocolo, con las restricciones UNIQUE aún sin prueba aislada.
- 0042 · Los fixtures de `FRESH_BOTS` y el caso de `ROTATED` cubren valores anteriores. La prueba unitaria de reutilización aporta evidencia del contrato de la CLI con fakes. El nuevo valor en el CHECK queda pendiente de una integración.
