# AUD-001 — checkpoint investigador 2026-11-20 07:32 (México)

**Código:** magosouljah/BeatGaler, rama local/landing-gallery-unificada, HEAD comprobado `4e66638051effe888e66a885010065d98fc7df17`. Lecturas explícitas a ese SHA. **Estado:** EN_PROGRESO, análisis estático; no tests ejecutados. Protocolo y PLAN actuales consultados antes de investigar. Registros canónicos solo Director.

## Descubrimiento estructural nuevo: montaje real del router (VERIFICADO ESTÁTICAMENTE)

- `cloud-server/server.js:304-313`: después de configurar módulos nativos, carga sincrónicamente `require("./server-core")`. El orden importa: las factories `currentCatalog*` se consultan durante la construcción del router en server-core.
- `cloud-server/server-core.js:44-46`: importa `createCatalogRouter` y el accessor del provisioner; `:78` crea `app = express()`.
- `server-core.js:115-140`: middleware CORS/OPTIONS; body JSON especial de 6 MB para `/catalog/v1/prefix-packs/main`, luego JSON general 256 KB; **`:137-138` monta efectivamente** `app.use(createCatalogRouter({authority: currentCatalogAuthority(), queries: currentCatalogQueries(), commands: currentCatalogCommands(), operations: currentCatalogOperations(), direct: currentCatalogDirect(), transportProvisioner: currentNativeTransportProvisioner(), prefixPacks: currentPrefixPacks(), playback: currentCatalogPlayback(), media: currentCatalogMedia(), purge: currentCatalogPurge(), authenticate: (req,res)=>authenticatedUser(req,res), log:console.warn}))`.
- `server-core.js:1114-1121`: `authenticatedUser` extrae bearer token y llama `getAuthUserFromToken`; sin usuario devuelve 401 y null. La declaración de función es hoisted, por lo que la referencia al montar es válida. No se ha trazado todavía `getAuthUserFromToken` hasta su almacenamiento/expiración.
- `cloud-server/catalog/routes.js:48-69`: si falta authority o queries, el router devuelve 503 para el prefijo; si están, wrapper `handle` invoca autenticación antes del servicio, y mapea errores. `:71-79`: contexto y provisión; POST hace SQL antes de `ensureForUser` opcional.
- `server-core.js:2936`: `app.listen` abre listener HTTP. No demuestra disponibilidad efectiva en despliegue.

**Diagrama:** `server.js start() → configureCatalogAuthority/Queries/Operations/Transport → require(server-core) → express() → CORS + JSON → createCatalogRouter(current* factories, authenticatedUser) → app.use(router) → GET context / POST provision → authority(SQL) → provisioner(membresía)`.

**Responsabilidades/ownership:** server.js posee bootstrap y selección de servicios; server-core.js posee composición Express y autenticación de peticiones; routes.js posee rutas y mapeo HTTP; authority.js posee biblioteca SQL; native-transport-provisioning.js posee transición de membresía externa. El middleware CORS no autentica: autenticación se ejecuta en el wrapper de cada handler si autoridad/queries están disponibles. No inferir autorización completa de cada operación sin leer los servicios.

## Riesgos y contraejemplos

**R-001:** permanece RIESGO, no incidencia confirmada. La cadena POST provision → SQL commit → ensureForUser puede fallar tras commit; GET posterior no invoca ensure. Contraejemplos ya documentados: IMPORT/REPLACE y direct/session llaman ensure. El montaje efectivo del router queda ahora comprobado, pero no demuestra que esas rutas sean alcanzables desde cualquier UI bloqueada.

**H-002:** `src/features/library/catalog/catalogApi.ts:223-226` define `filtersKey`; comparador ordena representaciones decimales de bytes como cadenas, no bytes numéricos. Ejemplo: representación `100` se ordena antes de `99`. Anomalía estática; **no se ha demostrado consumidor ni impacto**. No elevar a bug operativo.

## Pruebas, cobertura y límites

No se ejecutaron tests/CI. Proponer C2 parcial de `server-core.js` SOLO para montaje HTTP (el archivo tiene miles de líneas, no certificar el módulo completo); C2 parcial de flujo F02 hasta montaje/autenticación, no C3. Faltan: trazar `getAuthUserFromToken` y su fuente de sesión; configuración de store de asignaciones y gateway; confirmar consumidores de `filtersKey` por lecturas a SHA (no por code search default); revisar pruebas escritas del montaje y recuperación. Inventario completo aún sin clasificar; no porcentajes.

**Checkpoint siguiente:** 1) seguir `getAuthUserFromToken` hasta autoridad real; 2) verificar assignment store y transiciones PENDING/READY; 3) inspeccionar usos de `filtersKey` en árbol LOCAL y tests pertinentes; 4) contrastar rutas de recuperación UI. Sin escrituras en BeatGaler.
