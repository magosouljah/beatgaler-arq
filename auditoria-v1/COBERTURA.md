# Cobertura verificable (propiedad del Director)

**Cobertura actual certificada por el nuevo protocolo:** NO ESTABLECIDA. Nunca interpretar eso como 0% de código leído históricamente; solo que aún no hay inventario verificado para esta campaña.

C0: inventariado. C1: contenido leído. C2: responsabilidades, entrypoints, interfaces, dependencias y ownership descritos. C3: contratos, escenarios de fallo y evidencias contrastados; distinguir comprobación estática de runtime. Cobertura de flujos se sigue aparte. Cada subida de nivel debe incluir commit SHA, informe y fundamento; contabilizar archivos de alcance real, no assets o Desktop.

| Sistema/módulo o flujo | Archivos de alcance | Nivel | SHA | Evidencia | Huecos |
|---|---:|---|---|---|---|
| Pendiente de inventario | — | Sin certificar | — | — | Clasificación exhaustiva |

## AUD-001 — Certificación parcial @ 4e66638051effe888e66a885010065d98fc7df17
| Elemento | Nivel | Evidencia y límite |
|---|---|---|
| `src/features/library/catalog/catalogComposition.ts` | C2 estático | Código leído por Director: flag, tres modos y mensajes de bloqueo; no pruebas ejecutadas |
| `src/app/WebGalleryWorkspace.tsx` | C2 estático | Código leído por Director: montaje por identidad, composición y lazy legacy; runtime no verificado |
| `src/features/library/catalog/LibraryCompositionGate.tsx` | C2 estático | Código leído por Director: estados resolving/legacy/catalog/blocked y ausencia de fallback a INDEX en blocked |
| `src/features/library/catalog/catalogApi.ts` | C1 parcial | Tipos y cabecera inspeccionados; contratos de red completos pendientes |
| F01 arranque→Gallery | C2 parcial | [Informe AUD-001](runs/20261120T0330-investigador-AUD-001.md) + contraste de tres módulos; Cloud/SQL pendiente |

Resto de propuestas C2 del Investigador **no certificadas** todavía: se requiere contraste primario de archivos. No se calculan porcentajes sin inventario de alcance completo. Ningún C3 concedido.

## AUD-001 — Ampliación 06:00 @ 4e66638051effe888e66a885010065d98fc7df17
| Elemento | Nivel certificado | Evidencia y límites |
|---|---|---|
| `cloud-server/catalog/authority.js` (resolveContext/provisionLibrary) | C2 parcial estático | Director contrastó líneas 168-245; resto de módulo pendiente |
| `cloud-server/catalog/routes.js` (context/provision y llamadas de recuperación) | C2 parcial estático | Director contrastó líneas 48-79,130-135,179-184; montaje/middlewares pendientes |
| `cloud-server/catalog/native-transport-provisioning.js` | C2 parcial estático | Director contrastó líneas 19-59; store y gateway pendientes |
| `src/features/library/catalog/catalogApi.ts` (resolveContext/filtersKey) | C2 parcial estático | Director contrastó líneas 194-225; consumidores de filtersKey pendientes |
| F02 provisión→membresía | C2 parcial estático | Contraste primario y [checkpoint 05:25](runs/20261120T0525-investigador-AUD-001.md); sin pruebas ejecutadas, C3 pendiente |
No se calculan porcentajes: inventario aún no clasificado.

## Revisión 07:00 — AUD-001 @ 4e66638051effe888e66a885010065d98fc7df17
- `cloud-server/catalog/routes.js`: C2 parcial estático ampliado a wrapper de autenticación y respuestas 503; montaje no verificado.
- `cloud-server/catalog/native-transport-provisioning.js`: C2 parcial estático ampliado a lock/ready/pending/gateway; store y gateway pendientes.
- `cloud-server/server.js:1-123`: C1 parcial (composición inicial inspeccionada); sin C2 hasta seguir montaje y dependencias.
- F02: C2 parcial, no C3. Pruebas mencionadas en [informe 06:30](runs/20261120T0630-investigador-AUD-001.md) sin contraste primario por Director. Sin porcentaje de cobertura por falta de inventario clasificado.

## Revisión Director 08:00 — AUD-001 @ 4e66638051effe888e66a885010065d98fc7df17
- `cloud-server/server.js:304-313`: C1 parcial; orden de carga de `server-core` comprobado.
- `cloud-server/server-core.js:115-138,1114-1121`: C2 **de tramo**, montaje Express, CORS/parsers y frontera bearer; no C2 del módulo completo ni de sesiones.
- `cloud-server/catalog/routes.js:48-79`: C2 parcial, conexión efectiva de router y autenticación por handler comprobadas.
- F02: C2 parcial ampliado al montaje efectivo; C3 pendiente por stores, gateway, sesión y pruebas escritas. Evidencia [07:32](runs/20261120T0732-investigador-AUD-001.md), contrastada con código a SHA. Inventario de alcance sin clasificar; porcentajes no disponibles.


## Revisión Director 09:00 — AUD-001 @ 4e66638051effe888e66a885010065d98fc7df17
- `cloud-server/server-core.js:1031-1082`: C2 **de tramo** para carga, escritura, creación y consulta de sesiones; no C2 del archivo completo.
- `cloud-server/direct-vault-assignment.js:115-229`: C2 parcial estático para asignación, locks y transición durable.
- `cloud-server/direct-transport-control.js:425-461`: C2 **de tramo** para verificación de membresía; no C2 de gateway completo.
- `cloud-server/catalog/native-transport-provisioning.js:19-59`: C2 parcial contrastado para prueba antes de READY.
- F02 C2 parcial ampliado a stores y gateway; C3 no concedido. Fuente [08:30](runs/20261120T0830-investigador-AUD-001.md) y lectura primaria Director. Pruebas escritas, consumidores `filtersKey`, UI recuperación y concurrencia pendientes. Sin porcentaje por inventario sin clasificar.

## Revisión Director 10:00 — AUD-001 @ 4e66638051effe888e66a885010065d98fc7df17
- `src/features/library/catalog/catalogApi.ts:224-227`: C2 de tramo para generación de clave y anomalía del comparador; no C3 de contrato/caché.
- `src/features/library/catalog/catalogQueryStore.ts:109,355-358`: C1 parcial y relación `queryKey` C2 de tramo; no C2 del módulo entero.
- `cloud-server/tests/catalog/catalog-native-transport-provisioning.test.cjs:1-64`: C1 parcial; prueba escrita con fakes de pending/READY inspeccionada, no ejecutada.
- F01 y F02: continúan C2 parcial, C3 pendiente. Evidencia [09:30](runs/20261120T0930-investigador-AUD-001.md) + contraste primario. Sin porcentaje: inventario sin clasificar.

## Revisión Director 11:00 — AUD-001 @ `4e66638051effe888e66a885010065d98fc7df17`
- `catalogApi.ts:223-227`: C2 de tramo (identidad determinista; comparador defectuoso); contrato servidor pendiente.
- `catalogQueryStore.ts:261-284,355-405`: C2 de tramos (bloque provisional, revalidación, identidad, refresh, errores); módulo completo NO C2.
- `catalogLibraryProvider.tsx:170-205`: C2 de tramo (contexto ready, identidad de caché, ciclo de servicios); caché interna pendiente.
- F01 caché/consulta Gallery: C2 parcial, no C3. [Checkpoint 10:30](runs/20261120T1030-investigador-AUD-001.md) y lectura primaria. Sin tests ejecutados; no porcentaje por inventario sin clasificar.

## Corte v2.1 — 2026-11-20 12:00
Árbol Git recursivo no truncado: **1.459 blobs** clasificados por carpeta (INVENTARIO). Es denominador de repositorio, **NO** denominador de código Web+Cloud operativo. C0 panorámico por árbol para grupos `src` (269), `cloud-server` (455), `tests` (288), `scripts` (165), `cloud-server/migrations` (42, subconjunto de Cloud). No conceder C1/C2 a esos conjuntos por nombre o conteo. Pendiente: enumeración individual de activos/legado y exclusiones para porcentaje legítimo.

**AUD-001: PARCIAL**, conserva C2 **solo en tramos** ya contrastados en secciones anteriores; F01/F02 C2 parcial, ningún C3 certificado. Informe de cierre [11:30](runs/20261120T1130-investigador-AUD-001-cierre-tramos.md), contraexamen independiente de `filtersKey`, `setQuery` y composición a SHA. **AUD-002 ASIGNADO**: callers UI y comportamiento de selección/audio; no hay cobertura anticipada. No tests ejecutados.

## Revisión 13:00 — AUD-002 @ `4e66638051effe888e66a885010065d98fc7df17`
- `CatalogGalleryWorkspace.tsx:5-17`: **C2 estático** wrapper completo.
- `CatalogAppShell.tsx:70-99,125-145,180-193`: **C2 de tramos** controles/tarjetas/virtualización/Player, no módulo completo.
- `useCatalogGalleryScope.ts:115-176,504-507`: **C2 de tramos** filtros/debounce/sort y estado conexión; otros métodos pendientes.
- `catalogInteractionStore.ts:173-205`: **C2 de tramo** selección y conflicto, no store completo.
- `catalogPlaybackSession.ts:77-103`: **C2 de tramo** lease y retry CURSOR_STALE; `setQuery` no contrastado.
- `CatalogVirtualGallery.tsx:74-104`: **C2 de tramo** virtualización y errores.
- `catalogLibraryProvider.tsx:1-110`: **C1 parcial + C2 de tramo** factory de servicios y DirectPort condicional.
- F01 filtros→render y F05 control audio: **C2 parcial estático**; C3 ninguno. AUD-002 **PARCIAL**. Sin pruebas ejecutadas ni porcentajes de comprensión.


## Revisión 14:00 — AUD-003 @ `4e66638051effe888e66a885010065d98fc7df17`
- `catalogApi.ts:98-115,223-227`: C2 **de tramos** (GET/identidad local), no del archivo completo.
- `catalogQueryStore.ts:355-360`: C2 de tramo (setQuery/setSort, reuse).
- `cloud-server/catalog/queries.js:85-146,164-213,228-244`: C2 de tramos (canonicalización, predicados, errores), no de toda paginación.
- `cloud-server/catalog/cursor.js:1-95`: C2 de interfaz de firma/verificación; integración con queries pendiente.
- F01 filtros→SQL: C2 **parcial estático**, C3 no certificado. [AUD-003](runs/20261120T1330-investigador-AUD-003.md) contrastado. AUD-003 cerrado PARCIAL, AUD-004 asignado. No tests ejecutados; 1.459 blobs no son denominador de comprensión.
