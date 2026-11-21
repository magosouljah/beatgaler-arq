# BeatGaler V1 — Primer piloto de limpieza (PROPUESTA, NO ejecutado)

> **Actualización 2026-11-21: EJECUTADO en la rama local `local/limpieza-preparacion-20261121` (sin push ni merge).** Resultado, pruebas y decisiones en [ETAPAS-1-3](../linea-base-20261121/ETAPAS-1-3.md). El texto de abajo se conserva como plan original.

> **Correcciones verificadas en código (2026-11-21, `main@ad8f8d0`) — amplían el alcance descrito abajo; decidir antes de autorizar:**
> 1. No hay dos sino **cinco** funciones `request` HTTP en el catálogo Web: `catalogApi.ts:145`, `catalogCommandsApi.ts:68`, `catalogMediaClient.ts:81`, `catalogTransfer.ts:192` y `call` en `catalogLibraryProvider.tsx:124`.
> 2. `call` (comandos de reproducción) **diverge**: sin timeout ni AbortSignal, sin `CatalogNetworkError`, y un 401 no se traduce a `UNAUTHENTICATED`. Efecto en ejecución: HIPÓTESIS (posible bloqueo de Next/Shuffle sin respuesta).
> 3. `main.tsx:20` instala `installWebCsrfFetchCoordinator()`, que **reemplaza `window.fetch`**: añade CSRF en métodos no seguros y **reintenta una vez** ante 403 `CSRF_REQUIRED`. Los tests con `fetchImpl` falso no pasan por él; la paridad debe cubrir también el comportamiento compuesto.
> 4. `webCsrfFetchCoordinator.ts:8` contiene un host Tailscale de desarrollo fijo (`REMOTE_API_HOST`) dentro del bundle de producción.
> 5. Línea base de pruebas antes del piloto: [LINEA-BASE](../linea-base-20261121/LINEA-BASE.md) (suites T08/T13 del catálogo PASS localmente).

**Objetivo:** demostrar que una extracción pequeña **reduce responsabilidades y duplicación** sin cambiar funcionamiento. **Estado:** plan preparado, permiso de implementación pendiente. **Rama objetivo:** una rama LAB/LOCAL creada desde `BeatGaler/main`, nunca `main` ni `beatgaler.com`.

## Por qué este piloto, no INDEX ni Cloud

Comparación directa en `main@ad8f8d0436bba5c3f663a301440ebf977200d953`:
- `src/features/library/catalog/catalogApi.ts:132-176`: `createCatalogApi` define `request` con base URL, bearer, cookie, CSRF en POST, AbortController + timeout, JSON y `CatalogApiError`; devuelve `T`.
- `src/features/library/catalog/catalogCommandsApi.ts:58-106`: `createCatalogCommandsApi` repite buena parte de esa infraestructura, pero admite GET/POST/PATCH, cabeceras `X-Catalog-Era/Epoch`, `Idempotency-Key`, `If-Match` y devuelve `{status, body: T}`.
- `catalogLibraryProvider.tsx:65-76` construye ambas bajo la misma sesión, pero parte de la lógica HTTP del reproductor está en un `call` adicional en `catalogLibraryProvider.tsx:124+`. **Esa tercera ruta existe** y no debe quedar olvidada; no ampliar automáticamente el piloto a ella.

**Hallazgo VERIFICADO_EN_CÓDIGO:** hay duplicación de transporte HTTP, con diferencias semánticas reales. **Hipótesis:** se puede concentrar el núcleo sin perder claridad. Se confirma o rechaza con resultados comparados. **No asumir** que «un solo helper» necesariamente mejora arquitectura.

## Límites exactos del piloto

**Permitido únicamente en rama autorizada:**
1. Escribir tests contractuales **antes** del refactor para la ruta GET del catálogo y PATCH de metadatos (petición emitida, resultado y error).
2. Extraer el tramo estrictamente común: construcción URL, credenciales/cookie, timeout/abort, parseo JSON, traducción de errores. Usar una interfaz con políticas explícitas para método, headers y forma de retorno; no esconder los requisitos de idempotencia y versión.
3. Migrar **primero un GET** con fake fetch; comparar. Migrar **después un PATCH de metadatos** únicamente si el GET conserva contrato y las pruebas existentes permanecen verdes.
4. Medir si ahora existe una sola definición para auth/cookies/timeout/errores y si siguen explícitos los contratos de cada cliente. Si el resultado es más complejo, **revertir el piloto**.

**Fuera del alcance (STOP):** Cloud, rutas reales del servidor, SQL, Telegram/MTProto, worker, subidas, borrado físico, esquemas, billing, control-plane, autenticación global, diseño visual, componentes de Player/BeatCard, comportamiento `bgPage`, commits a `main`, AWS, despliegue.

**No añadir:** frameworks de requests, capas genéricas de abstracción para toda la app, nuevos paquetes, una API pública nueva, reescritura de tests para ocultar cambios.

## Contratos que deben permanecer idénticos

| Aspecto | `catalogApi.ts` | `catalogCommandsApi.ts` |
|---|---|---|
| Métodos | GET/POST | GET/POST/PATCH |
| Datos | `/catalog/v1/context`, beats, facets, changes | PATCH/trash/restore, selección, bulk, detalle/archivos |
| Credenciales | Authorization bearer si disponible; `credentials: "include"` | Idéntico |
| CSRF | En POST | En todas las escrituras |
| Era/época | La vista de contexto guía el cliente | `X-Catalog-Era`, `X-Catalog-Epoch` al escribir |
| Identidad/idempotencia | No inventar headers que la ruta no exigía | `Idempotency-Key` cuando corresponde; `If-Match` |
| Timeout/Abort | 20 s por defecto; respetar `signal` | 20 s por defecto; respetar `signal` |
| Éxito | Payload `T` | `{status, body:T}` en helper; caller extrae `.body` |
| Error | `CatalogApiError(status,code,detail)` y fallo de red | Misma clase/código; no cambiar casos 401/409/503 |
| Normalización | `buildQuery` no se modifica | `validateBeatName` y límites de batch siguen en borde cliente |

**Especial cuidado:** `AbortError`, `CatalogNetworkError`, JSON inválido, body `undefined`, 204 si existiera en otro endpoint, `signal` ya abortada, cleanup del timeout/listeners y 409 de versión. No expandir al player: no comparte exactamente la misma interfaz.

## Pruebas mínimas y criterio PASS

**Antes/después** con `fetchImpl` falso y señales abortables:
- GET context/una página (o endpoint elegido) con bearer y cookies: URL, parámetros, headers, JSON y error 401/503 idénticos.
- PATCH beat con `expectedVersion`, `If-Match`, `Idempotency-Key`, CSRF, era/época y body: misma request, status y objeto devuelto.
- Fallo de red vs HTTP, timeout y abort: mismos errores, ningún retry nuevo; listeners/timeout liberados.
- Typecheck y suites de interfaz `catalog` y mutaciones (T08/T13 del arnés, seleccionadas según archivo). **Un resultado CI configurado no se llama PASS hasta ejecutarlo.**

**Evidencia de aceptación:** diff acotado, test rojo→verde si existía defecto en harness (sin cambios al comportamiento de producto), comparación de contratos, salida real de test, tabla `antes/después` de fuentes de verdad, riesgos, archivo/linea y SHA; propuesta de commit aislado. No probar producción ni hacer merge automático.

**Rollback:** revertir exclusivamente el commit del piloto en LAB. No hay migración ni datos que restaurar.

## Prompt listo para agente de IDE (cuando haya autorización)

> **NEW chat · MEDIA.** Repo `magosouljah/BeatGaler`. Trabaja **solo en una rama LAB/LOCAL desde main** y no toques producción. Lee `magosouljah/beatgaler-arq/mapa-v1/PRIMER-PILOTO.md`, `SISTEMAS.md`, `FLUJOS.md`, y los archivos `src/features/library/catalog/catalogApi.ts` y `catalogCommandsApi.ts` de HEAD actual. Antes de editar confirma SHA y delta respecto a `ad8f8d0`. Proporciona pruebas contractuales del comportamiento actual; luego extrae únicamente la infraestructura HTTP común y migra un GET y, si pasa, un PATCH; conserva explícitos CSRF/era/época/idempotency/If-Match/Abort/timeout/status/error. No edites Cloud, SQL, Telegram, worker, UI ni producción. Ejecuta pruebas focalizadas + typecheck, registra diff y dictamen PASS/FAIL con rollback. STOP solo en riesgos reales de contratos, protección, datos o decisión no aprobada. **Este prompt es referencia; no se ha autorizado aún la ejecución.**

**Si el piloto falla:** conservar las dos funciones `request`, registrar por qué la abstracción empeora los contratos y elegir otra costura. El objetivo es simplificar el modelo mental, no el número bruto de líneas.

[Mapa de sistemas](SISTEMAS.md) · [Flujos](FLUJOS.md) · [Plan por fases](../panorama-main-20261120/PLAN-LIMPIEZA-V1-PROPUESTA.md) · [P05](../panorama-main-20261120/profundizacion/P05-CATALOGO-SQL.md).
