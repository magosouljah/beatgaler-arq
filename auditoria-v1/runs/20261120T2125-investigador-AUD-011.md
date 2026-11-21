# AUD-011 — Montaje HTTP de catálogo y restos INDEX (21:25 CST, 2026-11-20)

## Fuente, mandato y alcance
PROTOCOLO.md v2.1 y PLAN.md leídos antes de investigar; única asignación AUD-011. Código exclusivamente magosouljah/BeatGaler rama main, SHA fijo `ad8f8d0436bba5c3f663a301440ebf977200d953`. Compare `ad8f8d0436bba5c3f663a301440ebf977200d953...main`: identical, 0 commits, 0 rutas; no delta respecto a AUD-010. Solo lectura estática; ninguna prueba/CI ejecutada. Microlote: `cloud-server/server-core.js` y `cloud-server/catalog/routes.js`; `src/features/library/catalog/catalogApi.ts` únicamente como caller de contraste. Desktop excluido.

## HECHO: mapa de montaje, owner y contratos
- `cloud-server/server-core.js:129-135`: instala JSON middleware y **monta** `createCatalogRouter(...)` en Express con servicios de authority, queries, commands, operations, direct, provisioner, prefixPacks, playback, media y purge. `authenticate: (req,res) => authenticatedUser(req,res)`. Owner del routing HTTP: server-core; owner del contrato catalog: routes; datos PostgreSQL: servicios delegados (implementación SQL no inspeccionada aquí).
- `cloud-server/catalog/routes.js:48-68`: crea Router, desactiva cache para /catalog/v1; sin authority/queries instala 503 `CATALOG_UNAVAILABLE` y retorna. Con servicios, `handle` autentica, pasa `String(user.id)`, captura excepciones y mapea errores mediante `respondError`. **Ruta registrada ≠ servicio disponible ni uso real**.
- `routes.js:71-80`: GET `/catalog/v1/context` → authority.resolveContext; POST `/catalog/v1/library/provision` → authority.provisionLibrary, luego transportProvisioner.ensureForUser (si existe), respuesta 201/200; GET `/catalog/v1/beats` → queries.listBeats. Las fallas de provisioner pasan al catch HTTP después de la llamada a authority; reversión SQL no demostrada.
- `routes.js:81`: GET `/catalog/v1/navigation/legacy` **sí está montado** y llama `queries.resolveLegacyNavigation`. Contraejemplo fundamental: que un endpoint contenga “legacy” NO implica INDEX Telegram: aquí resuelve navegación de offsets antiguos dentro de catálogo PostgreSQL. No clasificarlo como API INDEX sin inspeccionar implementación.
- `routes.js:208`: fallback /catalog/v1 devuelve 501 `NOT_IMPLEMENTED` a rutas no registradas, cuando la autoridad está disponible. Si no está, el 503 anterior intercepta.
- `server-core.js:68-75`: objeto bot Proxy rechaza operaciones del service bot manager; no demuestra que toda funcionalidad histórica sea inaccesible.
- `server-core.js:617-620`: `ensureEmptyIndexForStorage` existe y comentario alude a INDEX/desktop. `server-core.js:1377-1381` mantiene constantes `LIBRARY_INDEX_*` (una comentada como “legacy reader only”). **Presencia confirmada, alcanzabilidad INCIERTA**: faltan llamadas, exports y referencias cruzadas. No afirmar eliminación total de INDEX.
- `src/features/library/catalog/catalogApi.ts:177-183`: cliente Web nativo llama context/provision/beats y navigation/legacy bajo /catalog/v1; `catalogApi.ts:1-3` declara explícitamente metadata HTTP sin Telegram/INDEX (comentario, corroborado parcialmente por rutas enumeradas). Este caller NO demuestra que ningún otro cliente Web use endpoints viejos.

### Mapa textual
Web catalogApi → Express server-core (middleware JSON, router) → routes.handle (auth tenant/error) → authority/queries (SQL) y provisioner (membresía externa). En fallo de montaje: /catalog/v1 → 503. En ruta desconocida del catálogo montado: 501. La ruta `navigation/legacy` pertenece a resolución de navegación del catálogo, no es prueba de antiguo INDEX.

## Hallazgos y falsación
1. **CONFIRMADO estático:** router nativo montado y fallback 503/501 condicionado, @SHA líneas anteriores. No equivale a prueba runtime ni de producción.
2. **CONFIRMADO estático:** símbolos/comentarios INDEX permanecen en server-core, pero **NO_VERIFICABLE en este lote** si se ejecutan, están exportados o son muertos. No elevar a bug.
3. **RIESGO de interpretación:** confundir `navigation/legacy` con INDEX produciría falso positivo; su handler delega en `queries.resolveLegacyNavigation` (contraejemplo).
4. **HIPÓTESIS:** pueden persistir rutas HTTP antiguas fuera del router nativo o callers Web distintos. Este lote no examinó el árbol completo, rutas dinámicas ni todas las pruebas escritas; no afirmar ausencia global.

## Pruebas y cobertura propuesta
Se identificaron contratos HTTP y estados de error en código, **sin localizar ni leer tests pertinentes** en este turno; evidencia runtime/CI ausente. `server-core.js` tramo de montaje: C2 parcial; `routes.js` tramo auth/context/provision/legacy/fallback: C2 parcial; `catalogApi.ts` caller nativo: C1 de tramo; C3 ninguno. No porcentajes ni “PASS”.

## PENDIENTE y siguiente microlote sugerido al Director
1. Seguir referencias a `ensureEmptyIndexForStorage`, `LIBRARY_INDEX_*` y handlers `/beats/upload`, `/projects/upload`, `/cloud-files/upload` para probar registro/alcanzabilidad y guards (no asumir que el log de upload registra rutas).
2. Inspeccionar `queries.resolveLegacyNavigation` y tests HTTP de fences; distinguir compatibilidad de URL antigua de INDEX de medios.
3. Enumerar otros entrypoints Web/transport y verificar callers; luego revalidar legacy frente a main y delta futuro.

**HECHO:** frontera HTTP nativa y contraejemplo legacy documentados. **PENDIENTE:** inventario exhaustivo de endpoints INDEX, callers y pruebas. **Sin modificar código, canónicos, servicios ni horarios.**
