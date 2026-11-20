# Plan de auditoría — Director

Protocolo: [PROTOCOLO.md](PROTOCOLO.md). Fuente de código SOLO `magosouljah/BeatGaler@4e66638051effe888e66a885010065d98fc7df17` (rama `local/landing-gallery-unificada`, HEAD comprobado 2026-11-20). Solo lectura. Director dueño de este archivo.

## Asignación vigente: AUD-001 — ASIGNADO

- **Pregunta central:** ¿Cómo selecciona Web la experiencia Gallery activa y cómo entra al catálogo PostgreSQL, incluyendo arranque, sesión, estados de carga y error? Contrastar específicamente la hipótesis histórica «catálogo desactivado por defecto» contra el código ACTUAL, sin asumir que el informe de `5cb6ccc` sigue vigente.
- **Alcance inicial:** `src/main.tsx`, `src/app/WebExperience.tsx`, `src/app/WebGalleryEntry.tsx`, `src/app/WebGalleryWorkspace.tsx`, `src/features/library/catalog/catalogComposition.ts`, `catalogLibraryProvider.tsx`, `LibraryCompositionGate.tsx` y llamadas/imports directos pertinentes. Incluir endpoints Cloud de contexto/provisión solo hasta identificar contratos y responsables; registrar como siguiente lote si excede capacidad.
- **SHA obligatorio:** `4e66638051effe888e66a885010065d98fc7df17`. Leer todos los archivos con ese `ref`, no usar GitHub search/main como prueba.
- **Entregable de comprensión:** diagrama textual entrypoint → routing → autenticación → composición → context/provision → Gallery; responsables de estado, interfaces, flags, errores, recuperación, archivos y líneas, puntos concretos de modificación.
- **Falsación:** verificar si legacy INDEX aún puede activarse en Web y bajo qué condiciones; distinguir código muerto de ruta activa; buscar un camino de fallo y un contraejemplo a cada sospecha.
- **Evidencia:** código a SHA, tests escritos pertinentes, líneas precisas; sin ejecutar tests ni acceder a producto real. Clasificar CONFIRMADO/RIESGO/HIPÓTESIS.
- **Criterio de aceptación:** informe nuevo `auditoria-v1/runs/<fecha>-investigador-AUD-001.md` con llamadas trazadas, mapa técnico, hipótesis históricas reconciliadas, cobertura C1/C2/C3 propuesta por archivo, límites y siguiente paso. No editar registros canónicos.
- **Estado:** ASIGNADO, pendiente de primer informe del Investigador. El Director no reasignará hasta recepción, bloqueo o cierre documentado.

## Campañas posteriores

P0 inventario íntegro y reconciliación de las siete zonas históricas (basadas en `5cb6ccc`); P1 arquitectura y ownership; P2 journeys UI→Cloud→SQL→Telegram; P3 contratos, concurrencia y recuperación; P4 duplicaciones/legado y comprensibilidad; P5 falsación y deltas. Cada lote pequeño debe producir mapa y evidencia, no solo hallazgos.

## Registro

2026-11-20: HEAD comprobado; árbol Git recursivo no truncado, 1,459 blobs; sin informes nuevos registrados al preparar AUD-001. Los hallazgos históricos quedan como hipótesis hasta revalidación.


## Revisión Director — 2026-11-20 04:00 (AUD-001)
Recibido [checkpoint del Investigador](runs/20261120T0330-investigador-AUD-001.md). Estado **EN_PROGRESO**, no aceptado ni reasignado. El Director contrastó a `4e66638051effe888e66a885010065d98fc7df17` tres archivos: `catalogComposition.ts`, `WebGalleryWorkspace.tsx`, `LibraryCompositionGate.tsx`. **Aceptado parcialmente:** flag y modos, lazy legacy, bloqueo sin fallback; mapa/flujo C2 parcial. **No verificado:** runtime de auth, handler Cloud, SQL, flag del bundle desplegado, impacto de `filtersKey`; ningún bug confirmado. Próxima asignación: **continúa AUD-001** con Cloud `/catalog/v1/context` y `/library/provision`, auth y pruebas escritas; cerrar hipótesis de `filtersKey` solo con contraejemplo e impacto. No abrir AUD-002 hasta informe final y revisión. HEAD remoto verificado sin delta: `4e66638051effe888e66a885010065d98fc7df17`.

## Revisión Director — 2026-11-20 05:00 (AUD-001)

Recibido checkpoint [04:30](runs/20261120T0430-investigador-AUD-001.md). Comparación GitHub `4e666380...` vs rama LOCAL: `identical` (sin delta). Contraste primario en `catalogApi.ts:194-225`, `routes.js:48-79`, `authority.js:168-185` y `native-transport-provisioning.js:19-59`: **aceptada secuencia estática** Web→context/provision→SQL→membresía Telegram; no implica ejecución real. R-001 RIESGO; H-002 anomalía estática con impacto HIPÓTESIS, documentados en HALLAZGOS. **AUD-001 continúa EN_PROGRESO, sin reasignación.** Próximo checkpoint: SQL/transacción exacta de `provisionLibrary`, middleware/montaje del router, rutas de recuperación de membresía PENDING y consumidores de `filtersKey`; entregar contraejemplos y tests escritos. C2 parcial sin nuevo C3; inventario total todavía no clasificado. Ningún bug operativo confirmado.

## Revisión Director — 2026-11-20 06:00 (AUD-001)
Recibido [checkpoint 05:25](runs/20261120T0525-investigador-AUD-001.md). GitHub compare confirma rama LOCAL **identical** a `4e66638051effe888e66a885010065d98fc7df17`. Contraste primario: `authority.js:168-245`, `routes.js:48-79,130-135,179-184`, `catalogApi.ts:194-225`, `native-transport-provisioning.js:19-59`. **Aceptado parcialmente**: transacción SQL separada de membresía externa, GET sin reintento y reintentos posteriores condicionados a otras operaciones. **R-001 sigue RIESGO**, no fallo permanente demostrado. **H-002 sigue HIPÓTESIS de impacto**. AUD-001 **EN_PROGRESO**; siguiente checkpoint: montaje del router/middleware, todos los consumidores `filtersKey`, tests escritos y rutas de recuperación. No reasignar hasta cerrar. No se ejecutaron tests.

## Revisión Director — 2026-11-20 07:00 (AUD-001)
Recibido [checkpoint 06:30](runs/20261120T0630-investigador-AUD-001.md). GitHub compare confirma `local/landing-gallery-unificada` **identical** a `4e66638051effe888e66a885010065d98fc7df17`. Contraste independiente con ref SHA en `routes.js:48-79,130-135,179-184`, `native-transport-provisioning.js:19-59`, `server.js:1-123` y `catalogApi.ts:194-225`. **Aceptado parcialmente:** wrapper de autenticación por handler, separación COMMIT SQL→membresía, estado PENDING y dos rutas de reintento condicionado. `server.js` compone servicios; montaje efectivo de router NO_VERIFICABLE todavía. Tests citados por investigador NO contrastados por Director en esta ejecución. **R-001 permanece RIESGO; H-002 HIPÓTESIS de impacto**. AUD-001 sigue EN_PROGRESO; no asignar AUD-002. Próximo checkpoint concreto: rastrear `createCatalogRouter` hasta montaje real y middlewares; inspeccionar assignment store/gateway y consumidores de `filtersKey`, con archivos a SHA, rutas/líneas y contraejemplos. No tests ejecutados. Inventario completo sigue pendiente.

## Revisión Director — 2026-11-20 08:00 (AUD-001)
Recibido [checkpoint 07:32](runs/20261120T0732-investigador-AUD-001.md). Comparación de `4e66638051effe888e66a885010065d98fc7df17` con `local/landing-gallery-unificada`: **identical**, sin delta. Contraste primario con SHA explícito: `cloud-server/server.js:304-313` carga `server-core` después del bootstrap; `cloud-server/server-core.js:115-138` instala CORS, parsers JSON y **monta efectivamente** `createCatalogRouter` con factories `current*`; `server-core.js:1114-1121` autentica con bearer token; `catalog/routes.js:48-79` protege handlers y separa provisión SQL de membresía. **ACEPTADO PARCIALMENTE** el montaje real y frontera HTTP; no prueba disponibilidad desplegada, validez de sesiones, ni autorización por servicio. AUD-001 continúa **EN_PROGRESO**; siguiente checkpoint: `getAuthUserFromToken` y persistencia/expiración, assignment store/gateway y usos reales de `filtersKey` con ref SHA; contrastar pruebas escritas. R-001 RIESGO; H-002 HIPÓTESIS de impacto. Sin C3 ni tests ejecutados. Inventario íntegro pendiente.


## Revisión Director — 2026-11-20 09:00 (AUD-001)
Recibido [checkpoint 08:30](runs/20261120T0830-investigador-AUD-001.md). Compare GitHub confirma rama LOCAL idéntica a `4e66638051effe888e66a885010065d98fc7df17`. Contrastados con SHA `server-core.js:1031-1082`, `direct-vault-assignment.js:115-229`, `direct-transport-control.js:425-461`, `native-transport-provisioning.js:19-59`. **ACEPTADO PARCIALMENTE**: auth JSON+memoria; asignación de bot en SQL y advisory locks; prueba externa antes de READY. R-001 sigue RIESGO (no bug operativo demostrado); H-002 HIPÓTESIS de impacto. Riesgo de auth multiproceso NO_PROBADO, sin evidencia de despliegue multiproceso. **AUD-001 EN_PROGRESO**, no reasignar: siguiente checkpoint acotado inspeccionar tests escritos de auth/asignación/membresía, rastrear consumidores de `filtersKey` en LOCAL, y alcanzabilidad UI de reparación IMPORT/REPLACE/direct/session. C2 parcial ampliado; C3 pendiente. Inventario íntegro sigue sin clasificar; no tests ejecutados.

## Revisión Director — 2026-11-20 10:00 (AUD-001)
Recibido [checkpoint 09:30](runs/20261120T0930-investigador-AUD-001.md). GitHub compare `4e66638051effe888e66a885010065d98fc7df17` vs `local/landing-gallery-unificada`: **identical**, sin delta. Contraste primario @SHA: `catalogApi.ts:224-227` construye `filtersKey` con comparador de cadenas decimales de bytes; `catalogQueryStore.ts:109,355-358` almacena `queryKey` y evita recarga si la clave coincide y existen bloques; prueba `catalog-native-transport-provisioning.test.cjs:1-64` utiliza fakes y comprueba pending sin READY. **Aceptado parcialmente**: H-002 es defecto estático del comparador y `filtersKey` sí participa en identidad de consultas; no está demostrada colisión ni fallo visible. Tests leídos, NO ejecutados. R-001 permanece RIESGO; UI recovery sin verificar. **AUD-001 EN_PROGRESO**, sin nueva asignación. Próximo checkpoint: seguir todos los consumidores de `snapshot.queryKey`, demostrar o descartar colisión de claves para conjuntos equivalentes y estudiar alcanzabilidad UI de IMPORT/REPLACE/direct/session. Inventario completo aún pendiente; sin C3.

## Revisión Director — 2026-11-20 11:00 (AUD-001)
Recibido [checkpoint 10:30](runs/20261120T1030-investigador-AUD-001.md). HEAD LOCAL confirmado directamente `4e66638051effe888e66a885010065d98fc7df17`, sin delta respecto al SHA auditado. Contraste independiente @SHA: `catalogApi.ts:223-227`, `catalogQueryStore.ts:261-284,355-405`, `catalogLibraryProvider.tsx:170-205`. **ACEPTADO PARCIALMENTE:** identidad de filtros, reuso de bloques, siembra provisional posterior a contexto ready, revalidación SQL y refresh residente; los caminos de error inspeccionados no establecen C3. **H-002:** comparador defectuoso estáticamente, sin colisión/bug UI probado. **R-001:** riesgo sin evidencia adicional. AUD-001 permanece **EN_PROGRESO**; próxima pregunta concreta (sin nueva asignación): callers UI de `setQuery`/`setSort`, canonicalización del servidor y tests de caché; después alcanzabilidad UI de recuperación de membresía. Inventario integral y C3 pendientes. No se ejecutaron pruebas.


## Directiva operativa nueva — v2.1 (2026-11-20)
**Sustituye el estado anterior de AUD-001 como asignación indefinida, en la PRÓXIMA ejecución del Director.** Conforme a la enmienda v2.1 de PROTOCOLO.md: AUD-001 debe cerrarse `PARCIAL` con evidencias C2 de tramos ya verificadas, C3 pendiente y R-001/H-002 conservados. El Director debe extraer los huecos como microlotes nuevos, fijar AUD-002 (1–3 módulos o tramo concreto) y avanzar en paralelo un inventario panorámico de Web+Cloud+SQL. No convertir AUD-001 en PASS completo ni borrar su historial. El Investigador debe leer esta directiva y no abrir otro checkpoint de AUD-001 si ya se asignó AUD-002. Si el Director aún no cambió el estado, el Investigador puede entregar un cierre de tramos y recomendaciones de subdivisión, pero no reasignarse solo.

## Dirección v2.1 — 2026-11-20 12:00 CST
**AUD-001 CERRADO PARCIAL administrativamente** (prevalece sobre el encabezado histórico «ASIGNADO»). Se aceptan únicamente tramos C2 estáticos ya contrastados: composición Gallery, contexto/provisión, sesiones/asignación y query/caché. C3 no certificado. Se conserva íntegra la serie de nueve informes, incluido [cierre 11:30](runs/20261120T1130-investigador-AUD-001-cierre-tramos.md). R-001 RIESGO; H-002 anomalía estática confirmada, impacto HIPÓTESIS. No se ejecutaron tests.

### ÚNICA asignación vigente: AUD-002 — ASIGNADO
- **SHA:** `4e66638051effe888e66a885010065d98fc7df17` (HEAD LOCAL confirmado 12:00; sin delta).
- **Pregunta:** ¿Qué componentes UI invocan `setQuery`/`setSort`, cómo afectan selección, reproducción y render y qué ocurre ante un fallo de carga?
- **Microlote:** `src/features/library/catalog/CatalogGalleryWorkspace.tsx` y 1–2 módulos directos de controles/filtros o store que realmente encuentre el investigador; seguir imports y llamadas indispensables, sin abrir todo Gallery.
- **Cierre:** diagrama caller→store→render, owner de selección y audio, escenario error/contraejemplo, pruebas escritas relevantes, líneas y nivel C0–C3 propuesto por tramo; distinguir no comprobado. Un informe inmutable `runs/*-investigador-AUD-002.md`. Máximo dos informes sin cierre: dividir o PARCIAL.
- **Backlog separado:** AUD-003 equivalencia canonicalización cliente/SQL y H-002; AUD-004 alcanzabilidad UI de recuperación de membresía R-001. No son asignaciones simultáneas.
- **Carril panorámico:** árbol Git recursivo completo sin truncar, 1.459 blobs, grupos principales clasificados en INVENTARIO; cartografía por sistemas en MAPA y registro C0 inicial en COBERTURA. Ningún porcentaje de comprensión ni C3.

## Dirección 2026-11-20 13:00 — revisión AUD-002 y siguiente microlote
HEAD LOCAL comprobado por compare GitHub: `4e66638051effe888e66a885010065d98fc7df17`, identical, 0 commits de delta. Informe [AUD-002 12:31](runs/20261120T1231-investigador-AUD-002.md) leído y contrastado en fuentes primarias a SHA. **AUD-002 CERRADO PARCIAL**: aceptada cartografía estática UI→scope→query/interaction/playback→virtualización y retry; no se certifica runtime, SQL, ni error funcional. Riesgos de debounce/sort y habilitación en estados no saludables quedan como hipótesis separadas, no bugs confirmados. F01 amplía C2 de tramos; C3 pendiente.

### ÚNICA asignación vigente: AUD-003 — ASIGNADO
- **SHA:** `4e66638051effe888e66a885010065d98fc7df17`.
- **Pregunta:** ¿Coinciden canonicalización y orden de filtros/etiquetas en cliente y Cloud/SQL, y qué efecto verificable tiene H-002 sobre identidad de consultas?
- **Microlote:** `src/features/library/catalog/catalogApi.ts` (filtersKey), `cloud-server/catalog/queries.js` o archivo real que implemente canonicalización (identificar con evidencia), y `catalogQueryStore.ts` solo consumidores directos de clave. Máximo 1–3 módulos principales.
- **Cierre:** comparar filtros equivalentes y distintos, orden UTF-8 y perfil de servidor, mostrar al menos dos contraejemplos o invariantes con líneas @SHA; documentar quién normaliza y cuándo, errores y tests escritos; distinguir anomalía estática de efecto real. Entregar un solo informe inmutable en runs/; C2/C3 propuesto por tramo. No ejecutar pruebas.
- **Backlog:** AUD-004 recuperación de membresía R-001; AUD-005 falsación debounce/sort; AUD-006 permisos de mutación en estados error; AUD-007 contratos de playback. No asignaciones simultáneas.
- **Carril A:** se amplió mapa panorámico de composición de servicios de catálogo y separación HTTP metadata / Direct media, con estado provisional de archivos activos; quedan denominadores y clasificación exhaustiva por archivo.


## Dirección 2026-11-20 14:00 — AUD-003 revisado; AUD-004 asignado
HEAD LOCAL comprobado con GitHub compare: **identical** a `4e66638051effe888e66a885010065d98fc7df17`, cero delta. Informe [AUD-003 13:30](runs/20261120T1330-investigador-AUD-003.md) contrastado con `catalogApi.ts:98-115,223-227`, `catalogQueryStore.ts:355-360`, `queries.js:85-146,164-213` y `cursor.js:1-95` a SHA fijo. **AUD-003 CERRADO PARCIAL:** C2 estático de tramos de identidad cliente, canonicalización servidor y predicados SQL; C3 NO, sin pruebas ejecutadas. H-002 anomalía estática confirmada; el orden cliente difiere del UTF-8 numérico, pero la deduplicación y ordenación determinista de conjuntos únicos no demuestran colisión de conjuntos distintos ni fallo de Gallery. Diferencia `filtersKey` vs `filterHash` por propósitos distintos, no bug probado. Cursor firmado es otra identidad; no atribuirle el comparador cliente.

### ÚNICA asignación vigente: AUD-004 — ASIGNADO
- **SHA:** `4e66638051effe888e66a885010065d98fc7df17`.
- **Pregunta:** ¿Puede la UI recuperar membresía Telegram PENDING después de que PostgreSQL ya haya creado biblioteca, sin depender de una acción inaccesible? Falsar R-001 con camino feliz y error.
- **Microlote:** `src/features/library/catalog/catalogApi.ts` (resolveContext), `src/features/library/catalog/LibraryCompositionGate.tsx` (gating/retry), `cloud-server/catalog/routes.js` (context/provision/direct-session). Seguir solo callers/guards indispensables, documentar dependencia `native-transport-provisioning.js` ya cartografiada sin repetirla.
- **Cierre:** secuencia UI→GET/POST→estado PENDING→retry accesible/inaccesible, rutas/líneas, tests escritos relevantes y contraejemplo; proponer C2/C3 por tramo. No ejecutar tests ni inferir runtime. Un informe nuevo e inmutable en runs/. Máximo dos informes sin cierre.
- **Backlog separado:** AUD-005 debounce/sort R-002; AUD-006 gating R-003; AUD-007 cursor/query sets y pruebas de Unicode; AUD-008 reproducción/lease.
- **Carril panorámico:** documentada frontera `cursor.js` (firma HMAC, rotación de claves y errores), `queries.js` (filtros SQL) y API HTTP (identidad de caché distinta). Inventario por archivo activo/legado y pruebas sigue pendiente.

## Dirección 2026-11-20 15:00 — AUD-004 revisado; delta detectado
**HEAD LOCAL NUEVO:** `9680c73da477cc9bcd201a036490d736bb6a7b12` (11 commits por delante de `4e66638051effe888e66a885010065d98fc7df17`, sin divergencia según compare GitHub). Cambios reportados: `direct-transport-control.js`, `http-containment.js`, `server-core.js`, dos tests Cloud y documento post-LIVE. Las conclusiones anteriores @SHA antiguo no se transfieren automáticamente; revisar específicamente gateway de membresía y fronteras HTTP. Fuente actual inspeccionada por SHA en esos tres módulos; no se ejecutó nada.

**AUD-004 CERRADO PARCIAL:** [informe 14:31](runs/20261120T1431-investigador-AUD-004.md) contrastado independientemente contra `catalogApi.ts:194-216`, `catalogLibraryProvider.tsx:159-207`, `LibraryCompositionGate.tsx:9-38`, `routes.js:48-79,130-135,179-184`, `authority.js:168-245`, `native-transport-provisioning.js:19-59` @ `4e66638051effe888e66a885010065d98fc7df17`. Confirmado estáticamente: POST confirma SQL antes de asegurar membresía; GET contexto no invoca ensure; hook resuelve por montaje y Gate blocked no ofrece botón; rutas posteriores pueden reintentar. **R-001 sigue RIESGO**, no atrapamiento demostrado. Contraste parcial de gateway en HEAD nuevo: la función `ensureCatalogBotMembership` sigue presente y verifica membresía, pero cambios del archivo requieren revalidación focalizada. C2 solo de tramos; C3 ninguno.

### ÚNICA asignación vigente: AUD-005 — ASIGNADO
- **SHA:** `9680c73da477cc9bcd201a036490d736bb6a7b12`.
- **Pregunta:** ¿Puede un debounce pendiente de filtros sobrescribir el orden elegido después, o la recreación del efecto lo evita? Falsar R-002 con una cronología precisa de React y llamadas.
- **Microlote:** `src/features/library/catalog/useCatalogGalleryScope.ts`, `catalogQueryStore.ts` y el caller directo del sort en `CatalogAppShell.tsx` (máximo 3 módulos principales).
- **Cierre:** describir timers, dependencias y cleanup, capturas de estado, `setSort`/`setQuery`, un escenario de carrera y contraejemplo, tests escritos existentes y C2/C3 por tramo. Solo lectura a HEAD fijo, sin ejecutar tests; un informe inmutable en runs/.
- **Backlog:** AUD-006 R-003 gating, AUD-007 cursores, AUD-008 playback; revalidación de R-001/UI y delta del gateway en microlote posterior. No abrir asignaciones paralelas.

## Dirección 2026-11-20 16:00 — AUD-005 revisado, AUD-006 asignado
HEAD LOCAL fijado: `45ec5b27e778127414537d01d170e0b972777768`; compare contra `9680c73da477cc9bcd201a036490d736bb6a7b12`: 3 commits, 3 rutas modificadas (gateway Cloud, test gateway, documento). Los tres módulos Web de AUD-005 no aparecen en delta, por lo que su evidencia estática @SHA anterior se conserva como revisión selectiva, NO como prueba runtime @HEAD. [AUD-005 15:34](runs/20261120T1534-investigador-AUD-005.md) contrastado directamente con `useCatalogGalleryScope.ts:155-175`, `catalogQueryStore.ts:355-368` y `CatalogAppShell.tsx:67-79` @9680c73da477cc9bcd201a036490d736bb6a7b12. **AUD-005 CERRADO PARCIAL**: cronología de debounce/sort sustentada; R-002 sigue RIESGO con mecanismo estático confirmado, sin navegador ni tests. C2 de tramos, C3 pendiente.

### ÚNICA asignación vigente: AUD-006 — ASIGNADO
- **SHA obligatorio:** `45ec5b27e778127414537d01d170e0b972777768` (confirmar rama antes de leer y fijar nuevo SHA si cambia).
- **Pregunta:** ¿Qué acciones de mutación siguen habilitadas cuando Gallery tiene estado error/integrity/quarantined, y cuáles guardas reales impiden llegar al servidor? Falsar R-003.
- **Microlote:** `src/features/library/catalog/useCatalogGalleryScope.ts` (connectionState, rejectOfflineMutation y llamadas), `CatalogAppShell.tsx` (botones/drop/gating), `catalogMutations.ts` solo entrypoints/guards necesarios. No ampliar a toda la API.
- **Cierre:** tabla pequeña estado→acción→guarda→llamada, camino feliz y error con líneas @SHA, contraejemplo, tests escritos si existen, C2/C3 de tramos y límite runtime. Informe único inmutable runs/. No ejecutar tests.
- **Backlog:** AUD-007 cursores/paginación; AUD-008 playback/lease; AUD-009 delta gateway y revalidación R-001; AUD-010 pruebas de debounce R-002. No reasignar antes del informe.
- **Carril A:** clasificados por lectura nuevos límites de estado React/store y ownership de sort; regenerar árbol y clasificar archivos activos/legado sigue pendiente.


## Dirección 2026-11-20 17:00 — AUD-006 revisado; AUD-007 asignado
Rama LOCAL HEAD fijada en `b6b999526f77054a199c74fadb39d2171ac4eb75` (4 commits por delante de `45ec5b27e778127414537d01d170e0b972777768`; 20 rutas cambiadas, principalmente Cloud/deploy/scripts; **ninguna de los tres módulos Web de AUD-006**). Evidencia de AUD-006 se verificó a su SHA original, no se infiere runtime ni se transfieren contratos Cloud automáticamente.

**AUD-006 CERRADO PARCIAL:** [informe 16:30](runs/20261120T1630-investigador-AUD-006.md) contrastado con `useCatalogGalleryScope.ts:248-303,504-507`, `CatalogAppShell.tsx:55-121`, `catalogMutations.ts:136-168` @ `45ec5b27e778127414537d01d170e0b972777768`. Confirmado: guarda binaria offline/online, Delete/bulk sin la guarda local, comandos downstream no examinados; protecciones independientes en Add/Edit/Drawer y `inert` provisional. **R-003 RIESGO**, sin operación indebida demostrada. C2 solo tramos; C3 pendiente. Huecos de estados alcanzables/store/backend pasan a backlog **AUD-010**.

### ÚNICA asignación vigente: AUD-007 — ASIGNADO
- **SHA obligatorio:** `b6b999526f77054a199c74fadb39d2171ac4eb75` (verificar rama al iniciar; si cambia, fijar nuevo SHA explícitamente).
- **Pregunta:** ¿Cómo se produce, valida y consume el cursor de paginación de beats en Cloud, y cómo mantiene la Gallery continuidad y coherencia cuando cambian filtros/revisión?
- **Microlote:** `cloud-server/catalog/queries.js`, `cloud-server/catalog/cursor.js`, `src/features/library/catalog/catalogQueryStore.ts` (solo tramo cursor y solicitud de páginas). Seguir callers directos sin ampliar más de tres módulos principales.
- **Cierre:** trazar GET → validación/filtro/sort → token firmado → next page → estado de bloques; un caso válido y errores (cursor obsoleto/firma/revisión), referencias de líneas @SHA, pruebas escritas y contraejemplos. C2/C3 solo por tramos y distinguir estático de runtime. Un informe inmutable en runs/; máximo dos informes sin cierre.
- **Backlog:** AUD-008 playback/lease; AUD-009 delta de membresía R-001; AUD-010 estados reales y guardas downstream R-003; AUD-011 revalidación debounce R-002.
- **Carril A:** nuevo mapa de arranque Cloud y directorio de estado persistente `state-dir.js` @HEAD; clasificación de tests/deploy y denominador operativo siguen pendientes. No ejecutar CI/tests ni acceder a producción.
