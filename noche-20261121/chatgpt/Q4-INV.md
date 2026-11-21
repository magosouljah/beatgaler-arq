# Q4 — pasada independiente 2 — 2026-11-21

Alcance: lectura de `magosouljah/BeatGaler` ramas `local/limpieza-preparacion-20261121` y `local/noche-20261121-int`; sin ejecutar CI ni cambiar código. Referencias SHA abajo son SHA de blob de GitHub, no SHA de commit.

## Hallazgo nuevo Q4-02 — pruebas de migración con SQL simulado
**NOT_PROVEN para migraciones 0031–0042 en la prueba del runner**. `cloud-server/tests/postgres-migration-runner.test.cjs:10-35` crea `makePool` con un cliente falso cuyo `query` devuelve éxito para cualquier SQL no reconocido; `:82-97` aplica `listMigrations()` a ese fake. Blob SHA `47fc117ac3c5e9f1a52112dba2327bd3f53f1a8d`. Esa prueba verifica orden, ledger, checksum y llamadas al lock, pero **no ejecuta DDL real**. No implica que las suites de integración PG carezcan de migraciones reales; se necesita trazar esas suites antes de emitir tal conclusión.

**Acción Codex:** añadir prueba PG real que aplique 0031–0042 en BD efímera, verifique `schema_migrations` y objetos/constraints esperados, reejecute sin cambios, inyecte error en una migración de prueba y compruebe rollback y ledger sin versión parcial. No usar producción.

## Hallazgo nuevo Q4-03 — CI dispara suites, no garantiza prueba por migración
`.github/workflows/catalog-checks.yml:5-28` incluye push `main` y `local/**` y filtro `cloud-server/migrations/**`; `:69-72` selecciona suites y `:91-104` las ejecuta. Blob SHA `9d335a841bb0c322d11b36bb37aac37e9d8c88f7` idéntico en ambas ramas. El workflow **no define evento pull_request**, y el disparo no demuestra cobertura individual de 0031–0042 ni que una ejecución concreta haya pasado.

**Acción Codex:** construir matriz 0031–0042: archivo, objeto/constraint, prueba PG real, suite invocada por push, resultado de ejecución con run ID. Marcar NOT_PROVEN donde no exista prueba de comportamiento. Evaluar PR trigger solo como propuesta; no modificar CI en esta pasada.

## Invariante purge — precisión importante
`cloud-server/catalog/purge.js:2-20` describe separación de commit lógico y eliminación física con journal, gateway y ausencia comprobada; `:88-108` ejecuta transacción SQL y commit, y `:98-100` exige autoridad/era/epoch. Blob SHA `e676f15d69befc4d92de1d56d525d49e7f1188a9`. Es **evidencia de diseño y código**, no prueba de durabilidad física en Telegram real. El comentario `:19` indica cleanup real apagado en T24 y fakes.

**Acción Codex:** tests PG con fault injection para commit lógico y cleanup, crash tras manifest, journal fallido y proveedor incierto; verificar que no se borra físicamente sin prueba y que restore no resucita PURGED. Separar claramente SQL real de gateway simulado.

## Resto de invariantes
Tenant, revision, idempotencia, locks, derechos y restore: conservar cartografía de pasada previa; esta pasada no aporta evidencia suficiente para elevar cobertura a PASS. No se ha demostrado un defecto nuevo de aislamiento ni de cuota.

## Limitaciones
No se ejecutó GitHub Actions ni se inspeccionó el contenido individual de las doce migraciones. Los SHA anteriores son de los archivos leídos. No afirmar que las 0031–0042 están rotas; el hueco confirmado es de **evidencia específica**. No se modificó BeatGaler ni main.

## Pasada 3 — cobertura específica 0034–0042 (2026-11-21)

**Hallazgo nuevo Q4-04 — contrato textual se detiene en 0033.** En `magosouljah/BeatGaler` rama `local/noche-20261121-int`, `cloud-server/tests/postgres-schema.test.cjs:143-169` contiene aserciones individuales para 0031, 0032 y 0033 y el archivo termina en línea 169: **no hay aserciones individuales para 0034–0042 en este test**. Blob SHA `8bd767ac960d20f8bc9e2d9ce237b1469efc4516`. Esto no prueba ausencia de tests en otras suites; sí identifica una asimetría concreta del contrato de esquema.

**Hallazgo nuevo Q4-05 — cableado CI comprobado con precisión.** `scripts/catalog-suites.json:360-374` registra `postgres-schema.test.cjs` y `postgres-migration-runner.test.cjs` en la rama integradora (blob `de2754d5537e1f2b049e504be46f1d493fb2262d`). `.github/workflows/catalog-checks.yml:8-28,65-73,91-107` incluye `cloud-server/migrations/**` en filtros de push y ejecuta suites contra PostgreSQL efímero (blob `b1fca51caf7a011215fe340f4f3312127e61f3fe`). El workflow de la rama integradora **sí añadió** `cloud-server/tests/postgres-migration-runner.test.cjs` al filtro de cambios, respecto a la rama de preparación (blob anterior `9d335a841bb0c322d11b36bb37aac37e9d8c88f7`). El runner sigue usando un pool simulado (blob `47fc117ac3c5e9f1a52112dba2327bd3f53f1a8d`); no confundir su PASS con DDL real. No se verificaron run IDs ni resultados de CI.

**Acción Codex prioritaria:** extender el contrato explícito 0034–0042 con verificaciones de objetos y restricciones esperados y, por separado, probar esos objetos en PostgreSQL efímero tras aplicar la cadena. Construir matriz archivo de migración → aserción textual → aserción PG real → suite CI → run ID. No duplicar pruebas ya existentes: buscar primero por objeto/constraint. **Estado:** hueco de cobertura específica en `postgres-schema.test.cjs` confirmado; integridad rota NO DEMOSTRADA.
