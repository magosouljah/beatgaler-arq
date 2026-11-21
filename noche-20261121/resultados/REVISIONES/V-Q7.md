# V-Q7 — Verificación de Q7-F3 (ChatGPT) contra código @cfcfb1d (solo lectura, sin ejecutar nada)
Rutas bajo `cloud-server/catalog/`. Tests bajo `cloud-server/tests/catalog/`.

| # | Afirmación del informe | Veredicto | Evidencia real |
|---|---|---|---|
| a | REPLACE con metadata siempre borra/reinserta tags y "recalcula facetas" aunque tags no cambien | **PARCIAL** (SQL confirmado; matiz en facetas) | operations.js:411-423: con `intent.metadata`, DELETE tag_groups + DELETE tags + INSERT tags y `tagsChanged = true` fijo (423), sin comparar `tagsEqual` (PATCH sí: commands.js:82,222). Facetas: operations.js:465-469 hace snapshot+`applyFacetDelta` (delta, no recuento completo); el delta neto sería 0 pero se ejecuta. Coste real menor que el "O(grupo)" que describe el comentario T20 (commands.js:75-81). Sin cambio de resultado. |
| b | REPLACE incrementa versión aunque metadata sea idéntica | **CONFIRMADO** (y también sin metadata) | operations.js:425 `version = version + 1` incondicional; revisión +1 y evento en 458-464. |
| c | Mismo validador y projectBeat en los tres caminos | **PARCIAL** | Validador único `rules.validatePatch`: operations.js:92 (IMPORT/REPLACE), commands.js:194 (PATCH, con `allowArtworkRemoval:true`), commands.js:492 (bulk). `codec.projectBeat`: operations.js:393 (IMPORT), 415 (REPLACE), commands.js:68 vía `beatRowsFromDoc` (PATCH). Diferencias: REPLACE/IMPORT rechazan `artwork` (no patchable); `has_artwork` en IMPORT/REPLACE sale de las partes (operations.js:397,425, `has_artwork OR`), en PATCH de la proyección (`p.hasArtwork`, beat-projection.js:44; commands.js:86-88). REPLACE aplica metadata con merge propio (operations.js:413-414) en vez de `applyPatchToDoc` (commands.js:45-49); mismo mapeo crop→image_crop. |
| d | PATCH no-op no incrementa versión/revisión ni emite evento | **CONFIRMADO** | commands.js:218-220: `!changedDoc && !artworkSlot` → `{noop:true, revision: ctx.revision}`; bumpRevision (232) y emitEvent (237) solo en la rama else. Ojo: el no-op SÍ registra la operación idempotente (recordOperation, tras 240). |
| e | BEAT_PATCHED con payload distinto PATCH vs IMPORT/REPLACE | **CONFIRMADO** | PATCH: `{fields:[...], artworkUnlinked?}` (commands.js:237). IMPORT/REPLACE: `{kind, slots:[...]}` (operations.js:464). Mismo `kind` de evento; bulk (commands.js:621) usa otro camino. Consumidores no auditados aquí. |

Filas restantes de la matriz (revisadas por consistencia):
- Ausente/null y defaults IMPORT: CONFIRMADO (`??` en operations.js:110-113; `metadata:null` = ausencia, 91).
- legacy_json/SHA/bytes: CONFIRMADO misma fórmula (commands.js:67-74; operations.js:393-401, 415-419).
- search_text: CONFIRMADO mismo codec (U+001F en beat-projection.js; no re-leído línea a línea).
- Versión/revisión IMPORT=1, REPLACE+1: CONFIRMADO (operations.js:401/425). Artwork: PATCH `artwork:null` commands.js:195,210,226-231 (incluye +1 versión si solo artwork): CONFIRMADO.
- Nota línea: el informe cita commands.js:153-162 para bumpRevision/emitEvent; real 150-160 aprox. (menor).

## Pruebas F3-EQ ya existentes (no duplicar)
| ID | Estado | Dónde |
|---|---|---|
| EQ-01 PATCH vs REPLACE misma metadata | NO existe | REPLACE solo con `{name}` en catalog-operations.integration.cjs:182,194 (test «REPLACE: versión esperada…», L174) |
| EQ-02 REPLACE rating + tags previos, facetas / coste | NO existe | facetas-delta cubre PATCH/trash/bulk/rename, no REPLACE (catalog-facets-delta.integration.cjs:85) |
| EQ-03 omitidos/crop:null/metadata:null | PARCIAL | PATCH: catalog-commands.integration.cjs:86 «PATCH: … campos no editados intactos» (crop, extra_field); REPLACE/IMPORT null: no |
| EQ-04 BPM/Key límites | PARCIAL | PATCH `bpm:'128.50'`→'128.5', `key:'c minor'`→'cm' (commands:92); search-text L123 (`99.5`, `F# minor`); REPLACE/IMPORT no |
| EQ-05 Unicode/SHA/U+001F | PARCIAL | catalog-search-text.integration.cjs (PATCH, oráculo vs recómputo, ~L117-123, 219 'ñu'); IMPORT/REPLACE no |
| EQ-06 PATCH no-op / REPLACE idéntica +1 | PARCIAL | PATCH no-op: catalog-commands.integration.cjs:86 (L101-102 `[true,'2','2']`); REPLACE metadata idéntica: no |
| EQ-07 rollback ante error DB | NO existe para PATCH/REPLACE | solo delta negativo aborta: catalog-facets-delta.integration.cjs:144 |
Extra: evento BEAT_PATCHED comprobado en IMPORT/REPLACE (catalog-operations.integration.cjs:114, 67) y PATCH (commands:109; artwork-unlink:141), sin comparar payloads.

Conclusión: ningún fallo funcional; la única diferencia real de trabajo es (a). Informe fiable salvo el matiz de facetas (delta, no recuento).
