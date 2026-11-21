# C04 · Anexo de normalización de tags

Las entradas y salidas de la tabla usan escapes JSON para distinguir espacios que se ven igual. La prueba ejecuta `normalizeTag`, `validatePatch`, `projectBeat` y los transformadores de comandos masivos con datos sintéticos.

| Entrada | `normalizeTag` | `projectBeat().tags[].normKey` | Alcance de la divergencia |
| --- | --- | --- | --- |
| `"  Lo   Fi  "` | `"lo fi"` | `"lo   fi"` | Ambas rutas para una cadena ya guardada. PATCH rechaza la entrada. |
| `"lo\tfi"` | `"lo fi"` | `"lo\tfi"` | Ambas rutas para una cadena ya guardada. PATCH rechaza la entrada. |
| `"lo\u00a0fi"` | `"lo fi"` | `"lo\u00a0fi"` | Ambas rutas para una cadena ya guardada. PATCH rechaza la entrada. |
| `null`, `undefined`, `42` | `"null"`, `"undefined"`, `"42"` | Omite los tres elementos | PATCH rechaza los tipos y los comandos masivos solo normalizan strings. |

- Entrada nueva. `commands.js:191–208` valida PATCH y `operations.js:84–114,389–422` valida la metadata de IMPORT/REPLACE. Los tags aceptados llegan ya normalizados. `commands.js:489–516` impide reemplazar la lista con BULK_PATCH y normaliza los operandos de `tagsOp` y el destino de TAG_RENAME antes de escribir.
- Dato persistido. `commands.js:54–68,612–622` lee `legacy_json`, compara los tags existentes con `normalizeTag` en add/remove y proyecta el documento resultante con `projectBeat` al escribirlo. Si el tag permanece (por ejemplo, al añadir otro tag), la misma cadena pasa por ambas reglas en el mismo flujo. REPLACE con metadata sin tags también vuelve a proyectar las cadenas guardadas. El restore físico carga las filas del volcado y luego adopta la base (`scripts/backup/pg-restore.sh:29–33`, `cloud-server/catalog/backup.js:162`). La presencia de esos valores en datos reales queda sin verificar.
- Renombrado. `routes.js:119–120` pasa `from` al comando. `commands.js:451–471,514–516,529,559–564` colapsa los espacios en `from` y busca por igualdad con el `norm_key` ya proyectado. Una fila con clave `"lo   fi"` queda fuera por esa clave. Si el beat entra por otra fila con clave `"lo fi"`, el transformador del documento compara ambas etiquetas como `"lo fi"`. Es una inferencia del código sobre esas filas, sin ejecutar SQL.
- Coincidencias. Las cadenas válidas nuevas y las variantes que solo difieren en mayúsculas o espacios extremos producen la misma clave. Ambas funciones pasan a minúsculas sin convertir NFC/NFD entre sí ni transliterar `ß`. La proyección conserva cadenas vacías con clave vacía y PATCH las rechaza.
