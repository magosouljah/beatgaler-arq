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
