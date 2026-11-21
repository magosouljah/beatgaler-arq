# BeatGaler V1 — Flujos, fronteras y dependencias

**Referencia:** `BeatGaler/main@ad8f8d0436bba5c3f663a301440ebf977200d953`. Se describen **rutas verificadas en código**, no pruebas E2E del despliegue. Para las líneas exactas, abrir P01–P07 en cada flujo. **Fallo de ejecución no reproducido = HIPÓTESIS**, no bug confirmado.

## 1. Arranque Web y acceso a Gallery

```text
src/main.tsx
   └─ WebExperience  [/, /gallery, /login, /signup]
       └─ WebGalleryEntry → AuthExperienceGate
           └─ WebGalleryWorkspace
               └─ useLibraryComposition
                   ├─ GET /catalog/v1/context
                   ├─ ready → createCatalogServices + CatalogGalleryWorkspace
                   │           └─ CatalogAppShell
                   └─ blocked/error/flag-off → estado visible, SIN INDEX fallback
```

**Contrato:** catálogo PostgreSQL por defecto (`VITE_CATALOG_API_ENABLED` solo se apaga con `false`); `/context` expone `authority_era`, `authority_epoch`, revisión y capacidades. Servicios/cachés por cuenta, `teardown` al cambiar cuenta. **No tocar:** rutas de login, `bgPage` o guardas fail-closed por simplificar UI. [P02](../panorama-main-20261120/profundizacion/P02-LEGACY-Y-DESKTOP.md), [P04](../panorama-main-20261120/profundizacion/P04-GALLERY-UI.md). Código: `src/app/WebExperience.tsx`, `src/features/library/catalog/catalogComposition.ts`, `catalogLibraryProvider.tsx`.

## 2. Consultar y filtrar beats

```text
Tag bar / Search / Sort / Viewport
   → catalogQueryStore.ts
   → catalogApi.ts GET /catalog/v1/beats + /facets + /navigation/legacy
   → cloud-server/catalog/routes.js
   → catalog/queries.js (SQL con tenant/generación, filtros, cursor)
   → PostgreSQL
   → blocks/anchor/revision en cliente
   → CatalogVirtualGallery + BeatCard
```

**Autoridad:** SQL lista y ordena. La virtualización limita tarjetas residentes, no páginas de producto. El primer bloque se puede copiar localmente, pero no reemplaza validación del servidor. Compatibilidad `/navigation/legacy` conserva enlaces `bgPage`; **no implica Telegram INDEX**. **Riesgo a probar:** intercalado de búsqueda/orden y restauración de ancla, sin declararlo fallo operativo. [P04](../panorama-main-20261120/profundizacion/P04-GALLERY-UI.md), [P05](../panorama-main-20261120/profundizacion/P05-CATALOGO-SQL.md).

## 3. Editar, seleccionar, borrar lógicamente y restaurar

```text
BeatCard / Drawer / Settings
   → catalogMutations + catalogInteractionStore
   → catalogCommandsApi
   → PATCH /catalog/v1/beats/:id  o POST /beats/trash /beats/restore
   → catalog/routes.js → commands.js
   → PostgreSQL: versión, revisión, query-set, eventos, tags
   → invalidación/refresh del cliente
```

**Guardas:** versión del beat, selección con versión/CAS, época, idempotencia y conflictos 409. Papelera lógica **no** implica delete Telegram inmediato. La operación bulk puede referirse a beats no residentes; no limitarla a tarjetas cargadas. **No cambiar:** orden/tag/música al cerrar un Drawer sin contrato equivalente. [P04](../panorama-main-20261120/profundizacion/P04-GALLERY-UI.md), [P05](../panorama-main-20261120/profundizacion/P05-CATALOGO-SQL.md).

## 4. Subir un archivo: dos caminos diferentes

```text
DATOS / CONTROL (HTTPS):
  File prep → catalogMutations → catalogTransfer
  → POST /catalog/v1/operations (intent + reserva)
  → ticket de parte con identidad/random_id persistidos en PostgreSQL
  → recibo candidato → worker separado → verificación Telegram
  → operación COMMITTED → catalog_beats ACTIVE + partes/ubicaciones

BYTES (no atraviesan Cloud HTTP):
  File/Blob del navegador → catalogDirectPort
  → WebTransportWorkerClient / webTransport.worker (MTProto)
  → Telegram asignado a vault/bot
                                ▲
  catalog-worker.js → catalog/worker.js
  → catalog-gateway-runtime → Telegram [verificación / reconciliación]
```

**No confundir:** `receipt` recibido ≠ operación COMMITTED; tamaño/hash declarado ≠ checksum remoto independiente; PostgreSQL guarda referencia y estados, Telegram guarda bytes. Los reintentos de envío incierto deben ser conservadores para **no duplicar** mensajes. El incidente Direct B posterior al LIVE sigue documentalmente abierto y reproducción/descarga posterior no quedó probada en ese cierre. **No tocar:** `random_id`, tickets, sesión temporal, `catalogDirectPort`, WebTransport Worker, leases, E5, worker/reconciliación. [P01](../panorama-main-20261120/profundizacion/P01-DIRECT-ARCHIVOS.md), [P02](../panorama-main-20261120/profundizacion/P02-LEGACY-Y-DESKTOP.md).

## 5. Escuchar y descargar

```text
BeatCard/Playbar → catalogPlaybackSession (round/neighbor)
   → catalogMediaClient → permiso/refs Cloud
   → catalogDirectPort → WebTransport Worker → Telegram BYTES
   → audio MSE o fallback Blob → useAudio/Playbar

Download UI → catalogDownloads → catalogMediaClient
   → Direct B → Blob/archivo en navegador
```

**El audio y las portadas tienen caches de rendimiento**; no son copias de seguridad. La navegación de música depende de la selección/resultados del servidor, no de una lista global cargada en memoria. **HIPÓTESIS pendiente de test:** lease obtenido después de `teardown`, posibles fuentes tardías y carreras de cambio de cuenta. [P01](../panorama-main-20261120/profundizacion/P01-DIRECT-ARCHIVOS.md), [P04](../panorama-main-20261120/profundizacion/P04-GALLERY-UI.md).

## 6. Arranque Cloud, autenticación y acceso

```text
cloud-server/server.js
  → PostgreSQL/bootstrap y cutover de control-plane
  → instaladores Express / controles sesión-CSRF / auth/OAuth
  → bridge de server-core (incl. require hook y wrappers)
  → server-core.js (HTTP real)
  → /auth/*, /catalog/v1/*, /plans/*, /billing/*
  → PG / JSON virtual de compatibilidad, según autoridad
```

**Punto delicado:** el orden final de Express no se deduce del orden de instalación textual. Hay `app.use/post/get`, `fs`, `res.json/send`, `globalThis.fetch` y loader modificados por distintas capas. **Hipótesis a falsar:** parsers para rutas inyectadas, modificaciones simultáneas en múltiples procesos, OAuth callback en otro proceso, fallos de flush antes de 2xx. **No borrar:** protecciones CSRF, antiabuso, capability revoke, cercos ni bridge hasta contar con equivalencia. [P03](../panorama-main-20261120/profundizacion/P03-CLOUD-AUTH-CONTROL.md).

## 7. Pagos y cuotas

```text
Settings/Plan UI → Cloud checkout → Polar
   → webhook durable / deduplicación / conciliación
   → PG billing_payments + billing_subscription_state + entitlements
   → billing-access-resolver.resolveBillingAccess
   → acceso/quotas en Web y tickets PROJECT
```

**Frontera:** Polar informa hechos de pago; **no** concede acceso directamente en el cliente. PG aplica `paid_through` y grants. `plans.js` legacy y el catálogo V1 no tienen idéntica semántica: no fusionarlos por nombre. Hipótesis pendientes: cierre de checkout `OPEN` abandonado y autorización de PROJECT ante downgrade durante transferencia. [P06](../panorama-main-20261120/profundizacion/P06-PAGOS-ACCESO.md).

## 8. Papelera, purga, backups y rollback

```text
Trash/RequestPurge → catálogo SQL / operación durable
   → restore_hold + guardas + journal externo
   → catalog-worker.js (separado)
   → gateway Telegram delete SOLO bajo precondiciones autorizadas

backup PostgreSQL / S3 → metadatos + referencias SQL
backup lógico NDJSON   → representación del catálogo
Telegram               → bytes originales; ninguna copia alternativa probada
deploy AWS rollback    → release/symlink anterior, NO DB ni Telegram
```

**STOP:** borrar mensajes/refs sin evidencia de recuperación, restaurar SQL suponiendo que restituye bytes, liberar `restore_hold` sin comprobaciones, declarar `G2 PASS` por pruebas simuladas. El mecanismo exacto de respaldo físico externo y backup de journal siguen pendientes. [P01](../panorama-main-20261120/profundizacion/P01-DIRECT-ARCHIVOS.md), [P07](../panorama-main-20261120/profundizacion/P07-CI-DEPLOY-RECOVERY.md).

## 9. Riesgos que cruzan más de un sistema

| Contrato | Cruza | Qué lo protege / qué falta |
|---|---|---|
| Identidad, tenant y época | Web ↔ Cloud ↔ PG | cuenta/vault/generation/era/epoch; fallo ante contexto obsoleto |
| Estado de transferencia | Web ↔ Cloud ↔ SQL ↔ worker ↔ Telegram | ticket, random_id, receipt, verify, commit; prueba física y reconciliación E5 |
| Documento de beat | PATCH ↔ IMPORT ↔ REPLACE | `commands.js` y `operations.js` tienen escritores distintos; exigir equivalencia antes de extraer |
| Reproducción | UI ↔ Cloud permisos ↔ Direct Worker ↔ Telegram | leases, teardown, MSE/Blob, navegador real; pendiente test de carrera tardía |
| Derechos | Polar ↔ Billing PG ↔ Catalog/PROJECT | webhook durable, `paid_through`, grants, cuota |
| Seguridad | Express interceptores ↔ sesiones ↔ PG/compatibilidad | cuerpo, CSRF, cookies, revocación, flush; faltan algunas pruebas integrales |
| Retirada legacy | Web imports ↔ Cloud guards ↔ Worker ↔ operadores | no probar «muerto» por SymDex, grep o nombre; inspeccionar rutas y servicios |

**Regla de navegación:** primero el flujo, luego el módulo propietario, después el símbolo con SymDex/IDE. **El código al SHA correspondiente es la autoridad final.** Un índice de símbolos detecta pistas, no demuestra semántica, runtime ni ausencia de callers dinámicos.

Más detalles: [sistemas](SISTEMAS.md) · [primer piloto](PRIMER-PILOTO.md) · [plan de limpieza](../panorama-main-20261120/PLAN-LIMPIEZA-V1-PROPUESTA.md).
