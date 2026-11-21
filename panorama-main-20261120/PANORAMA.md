# Panorama arquitectónico de BeatGaler V1 — corte main

**Fecha:** 2026-11-20. **Código fuente:** `magosouljah/BeatGaler` `main@ad8f8d0436bba5c3f663a301440ebf977200d953`. **Memoria:** `magosouljah/beatgaler-arq`. **Modo:** lectura solamente: sin tests, navegador real, PostgreSQL, Telegram, AWS ni producción. No se modificó el repo BeatGaler.

## Resultado y límites de la cobertura

- Árbol Git recursivo **no truncado: 1.582 blobs de 1.582** listados individualmente en [INVENTARIO-C0.md](INVENTARIO-C0.md). Cobertura **C0 física 100%**; las familias se asignaron mecánicamente por rutas/nombres con etiquetas de incertidumbre. Esto no es 100% de cobertura de código operativo ni certificación semántica.
- `src/`: **268** archivos; `cloud-server/`: **432**, incluyendo **42 migraciones**, **218** archivos bajo `cloud-server/tests/`, **25** bajo `cloud-server/catalog/`; `tests/`: **284**; `scripts/`: **163**; `DESIGN/`: **125**; `src-tauri/`: **78**; `.github/`: **35**.
- Hay **502 archivos dentro de los dos árboles `tests/`** (218+284); no todos son ejecutables de test. DESIGN y Desktop pertenecen al universo del repositorio, no al conjunto de componentes operativos Web/Cloud que se pretende limpiar.
- Se leyeron **muestras críticas del código main**, rutas, composición y contratos junto con la documentación `auditoria-v1` e informes históricos. **C1/C2 integral por archivo: no certificado. Ningún C3 nuevo ni test ejecutado.**
- El diagnóstico [pasada-1](../pasada-1/informe-pasada-1.html) es histórico @`5cb6ccc` (11 nov): su supuesto de Web INDEX predeterminada y medios exclusivamente por servidor para catálogo **no describe main actual**. Los informes AUD-001–009 se produjeron sobre LOCAL; AUD-010–012 se contrastaron selectivamente sobre main. Conservarlos como evidencia histórica, no copiar su vigencia.
- Documento LIVE [CIERRE-LIVE-2026-11-20](https://github.com/magosouljah/BeatGaler/blob/ad8f8d0436bba5c3f663a301440ebf977200d953/docs/plans/catalogo-postgresql/CIERRE-LIVE-2026-11-20.md): **reporta** 2 importaciones COMMITTED, 4 partes VERIFIED y worker activo; **también declara** reproducción/descarga no probadas en ese cierre, G2 NOT_PROVEN y T25 pendiente. Es evidencia documental del despliegue anterior, no una prueba nueva realizada aquí. El documento de pendientes reporta además fallo Direct B posterior: no atribuir cierre global de ese defecto.

## Modelo de ejecución: dónde vive cada responsabilidad

```text
NAVEGADOR
  WebExperience / AuthExperienceGate / Gallery / UI / Playbar
       | HTTP: cuenta, catálogo, permisos, tickets y metadatos
       v
CLOUD (Node/Express) --> PostgreSQL: usuarios, catálogo, operaciones,
       |                 revisiones, cuotas, jobs, referencias de medios
       +--> sesiones, bots, control de credenciales y membresía
       |                 |
       |                 v
       |               TELEGRAM: grupos privados / bots / audios / portadas
       |                 ^
       |                 |
       +<-- Worker duradero del catálogo (verifica receipts; purga)
                         ^
                         |
NAVEGADOR -- Direct B (mtcute Worker + clave temporal) --> TELEGRAM
  (bytes de medios; la API Cloud coordina y el SQL confirma)
EXTERNOS: Polar (cobro), SES (correo), Google/X (OAuth)
HOSTING: AWS/nginx/EC2/RDS/S3 y scripts de despliegue (no son módulos de negocio)
```

**Distinción esencial:** el cliente nativo usa PostgreSQL para metadatos, pero **reutiliza WebTransportWorkerClient/Controller y mtcute** mediante `catalogDirectPort.ts` para enviar/leer bytes en Telegram. No retirar indiscriminadamente `src/features/cloud/` o `@mtcute/web` por contener nombres de transporte antiguo. El Cloud todavía dispone de gateway para comprobación, reconciliación, reparación, purga y worker; **no** se concluye que el audio normal se proxee por Cloud.

## Catálogo panorámico de sistemas

| Sistema / dueño principal | Entrada / referencias de código | Datos, salidas y relaciones | Clasificación panorámica |
|---|---|---|---|
| Arranque Web | `src/main.tsx`, `src/app/WebExperience.tsx`, `WebGalleryEntry.tsx` | React, rutas Landing / login / signup / gallery; carga lazy | **Activo en Web** según entrypoints main |
| Autenticación en Web | `src/features/auth/`, `src/components/AccountGate.tsx` | Sesión cookie/CSRF, OAuth, formularios, cliente HTTP | **Activo**; composición real y duplicación pendientes |
| Composición de biblioteca | `WebGalleryWorkspace.tsx`, `catalogComposition.ts`, `catalogLibraryProvider.tsx` | Contexto PostgreSQL y servicios por cuenta/época | **Activo**; flag default true, false muestra aviso LEGACY retirado |
| Gallery nativa | `src/features/library/catalog/CatalogAppShell.tsx`, `useCatalogGalleryScope.ts`, `CatalogVirtualGallery.tsx` | Filtros, tarjetas, virtualización, estados y eventos | **Activo/candidato**; semántica de fallos requiere profundidad |
| Estado de consultas | `catalogQueryStore.ts`, `catalogApi.ts`, `catalogFirstBlockCache.ts` | Página, cursor, revisión, caches de bloque | **Activo/candidato**; claves y cache parcialmente trazados |
| Selección y mutaciones Web | `catalogInteractionStore.ts`, `catalogMutations.ts`, `catalogCommandsApi.ts` | Selección global, patch, rename, trash, lotes | **Activo/candidato**; guardas y errores por completar |
| Importación/edición/descargas | `AddBeatModal.tsx`, `Drawer.tsx`, `catalogImportPlan.ts`, `catalogTransfer.ts`, `catalogDownloads.ts`, `catalogTrashSource.ts` | Preparar archivos, editar, subir, restaurar, descargar | **Mixto compartido**; trazar UI a respuesta duradera |
| Reproducción y prefijos | `Player.tsx`, `useAudio.ts`, `catalogPlaybackSession.ts`, `catalogMediaClient.ts`, `catalogPrefixCache.ts`, `catalogMainPack.ts` | Reproducción, source lease, MSE/Blob, prefetch y caches | **Activo/candidato**; continuidad y teardown bajo estudio |
| Direct B / transporte navegador | `catalogDirectPort.ts`, `catalogDirectCore.ts`, `src/features/cloud/webTransport.worker.ts`, `webTransportWorkerClient.ts`, `webTransportController.ts` | Navegador ↔ Telegram con permisos y credenciales temporales | **Compartido imprescindible hasta demostrar reemplazo** |
| UI visual producción | `src/features/design/`, `src/components/BeatCard.tsx`, `Drawer.tsx`, `Player.tsx`, `SettingsPanel.tsx` | Landing, Gallery, BeatCards, tags, Playbar, ajustes | **Activo/candidato**; diseño protegido |
| Compatibilidad Web/Desktop | `src/platform/`, `src/lib/tauri.ts`, `src/app/BeatGalerApp.tsx`, `useBeatGalerComposition.ts` | Adapters, funciones Tauri y rutas antiguas | **Mixto / legado por falsar** |
| Bootstrap y HTTP Cloud | `cloud-server/server.js`, `server-core.js`, `http-containment.js`, `server-core-auth-bridge-loader.js` | Montaje Express, middleware, interceptores y orden de carga | **Activo**; costura de mayor opacidad |
| Identidad Cloud | `account-*`, `auth-*`, `session-security.js`, `pending-signup-*`, `provider-identity-authority.js` | Registro, OAuth Google/X, MFA, sesiones, recuperación y correo SES | **Activo/candidato**; stores múltiples y patching |
| Pagos y derechos | `billing-*`, `access-runtime.js`, `billing-access-resolver.js` | Polar checkout/webhooks, proyección, reconciliación, cuotas | **Activo/candidato**; separar núcleo de wrappers antiguos |
| Control-plane PostgreSQL | `postgres-*`, `control-plane-*`, `secret-*`, migraciones | Cuenta/sesión/persistencia, adaptadores JSON, secretos | **Activo/transicional**; identificar autoridad efectiva |
| Catálogo SQL | `cloud-server/catalog/{authority,queries,commands,operations,facets,cursor,beat-projection}.js` | Beats, tags, revisiones, transacciones, búsqueda, órdenes | **Activo/candidato**; reglas y transacciones repetidas |
| Transferencia y worker | `catalog/{direct,transport-gateway,worker,purge,media,playback}.js`, `catalog-worker.js`, `catalog-gateway-runtime.js` | Tickets, receipts, verificación, reconciliación, purge, leasing | **Activo/condicionado por flags** |
| MASTER, vaults y bots | `direct-transport-control.js`, `direct-vault-assignment.js`, `native-transport-provisioning.js`, `master-storage.js`, `user-storage-lifecycle.js` | Membresía, asignación, sesiones, grupos y manejo de credenciales | **Activo/compartido**; no confundir con código INDEX |
| INDEX histórico | `legacy-media-upload-disable.js`, `catalog/legacy-fence.js` y nombres legacy residuales | Rechazos 410/cerco SQL y compatibilidad URL | **Defensas activas; eliminabilidad pendiente** |
| Operabilidad y recuperación | `runtime-operability.js`, `state-dir.js`, `scripts/backup/`, `deploy/` | Health/ready, respaldos SQL y despliegue | **Operativo/auxiliar**; byte-backup no demostrado |
| QA/CI | `tests/`, `cloud-server/tests/`, `.github/workflows/`, `scripts/catalog-check.cjs` | Unit/integración, CI, probes, contracts, scripts | **Pruebas / herramientas**, no equivalen a código runtime |
| Diseño experimental | `DESIGN/`, `BLUEPRINT/DESIGN-SYSTEM/` | Laboratorio independiente con datos ficticios | **LAB aislado**, NO copiar sus variantes automáticamente |
| Desktop/Tauri | `src-tauri/`, ramas `DesktopExperience`, scripts de build | App archivada; mezclas con Web necesitan identificación | **Fuera de alcance del producto Web actual**, no borrado autorizado |

**Nota de legibilidad:** ACTIVO/candidato alude a entrada visible o dependencia plausible del código; solo se eleva a ACTIVO por archivo tras analizar llamadas, imports dinámicos, flags, rutas, scripts y procesos. Una ruta de texto o un test propio no basta. Archivo grande ≠ defecto automático.

## Flujos principales: mapa de fronteras y faltantes

| Journey | Camino estático identificado | Lo que falta antes de limpiar |
|---|---|---|
| Abrir Gallery | `main→WebExperience→AuthExperienceGate→WebGalleryWorkspace→GET /catalog/v1/context→catalogLibraryProvider→Gallery` | Contract de sesión/logout, errores, entrada sin cuenta, flags build |
| Registro / OAuth / reset | Web `AccountGate/AuthExperienceGate` → `/auth/*` → middlewares/bridge → stores PG/JSON, SES/Google/X | Orden efectivo de interceptores, persistencia, recuperación, fallos |
| Listar / filtrar / scroll | UI→query store→`GET /catalog/v1/beats`→queries SQL→cursor firmado→bloques/viewport | Navegación inversa, cambios de revisión, tests de filtros y cachés |
| Selección/editar/tags | UI/Drawer→commands/operations→transacción PG→revisión/invalidación | Guardas por estado, versiones/colisiones, campos y pruebas de UI |
| Importar | File prep/Review→`POST /catalog/v1/operations`→send ticket→Direct B Telegram→receipt→worker verify/commit→SQL ACTIVE | Errores por etapa, upload incierto, reanudación, reconciliación no duplicada |
| Reproducir | BeatCard/Player→playbackSession→media grant→Direct B→MSE/Blob→useAudio | Audio real tras LIVE, teardown tardío, fallos de fuente/cache, continuidad |
| Descargar | Card→`catalogDownloads`→`catalogMediaClient`→Direct→Browser save | Integridad archivo/ID3, fallback, error de descarga, UI real |
| Papelera/restaurar/purga | `catalogTrashSource`/commands→SQL trash/restore→purge durable→worker/journal/Telegram | Proteger bytes, retención y fallo parcial, guards, T24 sin ejecutar |
| Plan/pago | Settings→`/plans/*`, checkout Polar→webhook durable→proyección PG→derechos | Auth real, compatibilidad de planes, reconciliación y doble cargo |
| Arranque/recovery Cloud | `server.js`→pool/migraciones/cutover/configure→wrappers→server-core→worker separado | Efecto de patching, estado JSON remanente, multi-proceso, backups |

## Riesgos y falsaciones que deben orientar la limpieza

1. **T25 pendiente**: todavía existen rutas, clientes y restricciones de compatibilidad. Primero distinguir *defensas necesarias* de *pipeline muerto*. En `catalogComposition.ts` el valor por defecto es true y `WebGalleryWorkspace` con false muestra `LegacyRetired`; el falso es **no operativo como INDEX en ese entrypoint**. Pero `catalogDirectPort` **sí reutiliza** la infraestructura `webTransport`.
2. **Punto ciego de datos:** el último cierre documental conserva backup SQL, pero **no backup independiente de los bytes de Telegram**. El riesgo de integridad no se resuelve eliminando archivos legacy; requiere decisión y pruebas separadas.
3. **Deuda Cloud transversal:** `server.js` instala muchos wrappers y un loader sobre `server-core.js`; mapear el orden real HTTP y la autoridad de datos antes de refactorizar cuentas o rutas. Evitar crear bypass de auth/CSRF.
4. **Operación distribuida:** SQL confirmado antes de membresía externa puede dejar estado pendiente; hay reintentos condicionados. Worker necesita ejecutarse para concluir receipts, según documento LIVE. Contratos y caminos de recuperación exigen C2/C3 específicos.
5. **Reproducción Direct y UX:** el diagnóstico de 11 nov sugería sin MSE/prefetch en catálogo; main hoy contiene `acquireStream`, prefijos IndexedDB y MAIN, por lo que esa afirmación histórica está superada. Riesgo R-004 de lease tardío es estático y **no se probó** en navegador.
6. **Preocupaciones menores no equivalentes a bug:** H-002 comparador UTF-8 de `filtersKey` y R-002 debounce/sort son anomalías o riesgos estáticos; sus efectos visibles continúan sin prueba en main.
7. **CI y deploy cambian respecto al informe antiguo:** `catalog-checks.yml` ahora incluye `main` en el trigger, y `scripts/aws/deploy.sh` despliega desde `main`; revisar cobertura efectiva de migraciones/rutas y política de checks antes de quitar suites.

## Qué NO debe darse por eliminado

- `src/features/cloud/webTransport.worker.ts`, client/controller/session, `@mtcute/web`: el catálogo los importa por Direct B.
- `cloud-server/direct-transport-control.js`: sesiones, bot/MASTER y membership viven junto a restos históricos.
- `src/components/Drawer.tsx`, `SettingsPanel.tsx`, `BeatCard.tsx`: componentes compartidos con rutas nuevas y antiguas.
- `cloud-server/legacy-import-executor.js` y otros `legacy-*`: el nombre no decide uso.
- `catalog/legacy-fence.js`: protección SQL potencialmente requerida aunque el INDEX haya desaparecido de la Gallery.
- `DESIGN/`: laboratorio aislado, no es copia autorizada para sustituir `src/`.

## Priorización: investigaciones profundas propuestas

| Prioridad | Investigación | Razón antes de la limpieza |
|---:|---|---|
| 1 | **Transporte Direct + ciclo de archivos + recuperabilidad** | Riesgo real para bytes y reproducción; contrato PG→Telegram→worker y recursos compartidos |
| 2 | **Alcanzabilidad de INDEX/Desktop/compatibilidad** | Define qué se puede retirar sin romper Direct B ni defensas |
| 3 | **Arranque Cloud, auth, sesiones y control-plane** | Interceptores, adaptadores JSON y autoridad dispersa dificultan entender cualquier cambio |
| 4 | **Gallery/Web, edición, selección y playback UI** | Mayor superficie visual protegida y rutas de usuario; comprobar estados, callbacks y errores |
| 5 | **Catálogo PostgreSQL, reglas SQL, jobs y esquema** | Evitar duplicaciones y dejar un solo modelo de beat/transacciones sin comprometer integridad |
| 6 | **Pagos, planes, cuotas y cuenta comercial** | Núcleo durable, wrappers y contratos de derechos duplicados |
| 7 | **CI, scripts, deploy y recuperación** | Requiere saber qué tests actuales sí protegen y cómo publicar sin reintroducir fallos |

Prompts precisos, autocontenidos y sin solapamientos excesivos: [PROMPTS.md](PROMPTS.md). Pueden ejecutarse en conversaciones separadas, pero cada una debe fijar `main` SHA vigente al empezar y registrar diferencias frente al corte anterior.

## Criterio para pasar de cartografía a plan de limpieza

1. Inventario por archivo está completo **C0**; se confirma por evidencia qué es ACTIVO, QUITABLE, DEPENDENCIA_COMPARTIDA o INCIERTO antes de borrar.
2. Cada sistema del cuadro tiene **dueño de estado, entrada, salida y dependencias externas** verificadas sobre el mismo SHA; los caminos de bytes, metadatos, auth y pagos incluyen fallo/recovery y pruebas escritas.
3. Ningún módulo se elimina solo por tamaño, antigüedad, nombre, grep o duplicación aparente. Para cada candidato: todos los callers, efectos dinámicos, compatibilidad, tests y sustituto.
4. La decisión final sigue pendiente del propietario. **No modificar Web/Cloud, producción, DESIGN, SQL ni ejecutar test/borrado sin autorización nueva.**

### Fuentes documentales

- [Auditoría v1](../auditoria-v1/PROTOCOLO.md): `MAPA-CODIGO.md`, `FLUJOS.md`, `COBERTURA.md`, informes `AUD-001..012`.
- [Diagnóstico pasado](../pasada-1/informe-pasada-1.html): hipótesis `5cb6ccc`, no verdad vigente.
- [Context Management](../context-management/README.md) y [decisiones](../context-management/DECISIONES.md): conservar contexto, código como autoridad, solo documentar, no implementar.
- Código `BeatGaler/main@ad8f8d0`: `src/main.tsx`, `WebExperience.tsx`, `catalogComposition.ts`, `WebGalleryWorkspace.tsx`, `catalogLibraryProvider.tsx`, `catalogDirectPort.ts`, `catalogTrashSource.ts`, `catalogDownloads.ts`, `catalogMainPack.ts`, `cloud-server/server.js`, `catalog-worker.js`, `catalog/routes.js`, `catalog-gateway-runtime.js`, `.github/workflows/catalog-checks.yml`, `scripts/aws/deploy.sh` y otros contratos citados.
