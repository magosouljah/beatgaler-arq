# C03b · Anexo de diagnóstico y mutaciones

| Archivo en cloud-server/tests/catalog | Lectura o inspección anterior e invariante | Comportamiento ejercido y decisión |
| --- | --- | --- |
| catalog-backup-infra.test.cjs | JSON de CloudFormation para retención, KMS, TLS e IAM; bash -n y regex de seguridad sobre scripts; aviso de que el respaldo SQL no contiene los bytes de Telegram. | Se conservan las guardas declarativas y operativas. El script real rechaza un destino inseguro y un checksum de manifiesto incorrecto antes de invocar OpenSSL, PG o AWS. Archivos locales sintéticos, herramientas externas bloqueadas por funciones de Bash. |
| catalog-backup.test.cjs | El readFileSync lee el artefacto generado en disco. La comparación de BLOCKING inspeccionaba el valor exportado. | Se sustituye la comparación por finalizeRestore con pool en memoria: los ocho tipos vigentes producen el estado y los hallazgos esperados, con escritura simulada acotada al restore solicitado. |
| catalog-contract.test.cjs | Guard de esquema sobre SQL; inventarios estáticos de imports, módulos y rutas prohibidas (E77, T25); fixture y manifiesto JSON. | Se conservan las guardas. Se despacha por el router Express real, sin sockets: contexto válido y cuatro rutas históricas de bytes rechazadas con 501 NOT_IMPLEMENTED. |
| catalog-authority.test.cjs | authority.js no puede escribir catalog_account_deletions; la autoridad tampoco expone métodos de borrado. Los patrones restantes observan consultas que recibe el pool. | Se conserva la guarda estática del INSERT y de métodos. La factoría real rechaza las dos formas habilitadas del flag antes de consultar o conectar. |
| catalog-native-cli.test.cjs | El readFileSync lee el inventario generado, y los patrones SQL se aplican a consultas del fake. | Se conservan las verificaciones existentes. Ante un error SQL, inspect ejecuta ROLLBACK, libera el cliente, propaga el fallo y no escribe un inventario de salida. |

Cada fila se ejecutó con fakes y archivos temporales. La mutación de Bash se aplicó a una copia bajo E:\777\tmp. Las de JavaScript compilaron en memoria una única copia mutada por ejecución. El worktree conservó los archivos originales.

| Mutación temporal | Fallo observado | Resultado del test focalizado |
| --- | --- | --- |
| pg-restore.sh acepta un destino sin restore | El destino production avanza al control del manifiesto y termina con 3 en lugar de 2. | FAIL, exit=1, 0 pass, 1 fail |
| pg-restore.sh omite sha256sum -c del manifiesto | Se alcanza la función falsa de OpenSSL, UNEXPECTED_TOOL openssl. | FAIL, exit=1, 0 pass, 1 fail |
| backup.js excluye BYTES_MISSING del conjunto crítico | El restore queda RECONCILED cuando debe quedar BLOCKED. | FAIL, exit=1, 0 pass, 1 fail |
| routes.js vuelve a registrar PUT /transfer/upload/:token con una respuesta vacía | La ruta retirada devuelve 200 en lugar de 501. | FAIL, exit=1, 0 pass, 1 fail |
| authority.js ignora el flag de borrado en la factoría | Falta la excepción esperada al construir la autoridad con true. | FAIL, exit=1, 0 pass, 1 fail |
| native-cli.js omite ROLLBACK | El fake detecta que el cliente se libera sin revertir. | FAIL, exit=1, 0 pass, 1 fail |

Reproducción local con el entorno aislado del reporte. El comando es node E:\777\tmp\c03b-mutations.cjs. El lanzador usa node --test --test-reporter=tap --test-name-pattern y valida la causa del fallo de cada caso. Los TAP de las mutaciones están en E:\777\tmp\c03b-mutant-*.tap.
