# BeatGaler V1 — Mapa de sistemas y responsabilidades

**Corte del código:** `magosouljah/BeatGaler` `main@ad8f8d0436bba5c3f663a301440ebf977200d953` (20-11-2026). **Nivel:** VERIFICADO_EN_CÓDIGO en ese SHA, salvo donde dice INCIERTO/HIPÓTESIS. **No** certifica qué binario ni flags están vivos en AWS.

Este es un **mapa humano de navegación**, no el «index» multidimensional de Context Management. No sustituye al [inventario individual de 1.582 archivos](../panorama-main-20261120/INVENTARIO-C0.md) ni a las siete investigaciones completas.

## Vista de conjunto

```text
NAVEGADOR WEB                      CLOUD HTTP                    SERVICIOS / DATOS
main.tsx                           server.js
  └─ WebExperience                   ├─ server-core.js             PostgreSQL
      └─ AuthExperienceGate          ├─ Auth / control-plane   ─── cuentas, permisos, catálogo,
          └─ WebGalleryWorkspace ───┤                            jobs, referencias, pagos
              └─ CatalogAppShell     └─ /catalog/v1/* ────────── catálogo y comandos
                  ├─ Query/Selection
                  ├─ Edit/Trash
                  ├─ Player
                  └─ Upload/Download ── catalogDirectPort ── WebTransport Worker ─── Telegram bytes
                                                                                 ▲
                                    catalog-worker.js ── catalog/worker ──────────┤
                                    (proceso separado)     + gateway de bot ──────┘
```

**Autoridad por dato**: PostgreSQL = beat, identidad, metadatos, estado, versión, permisos, operaciones, parts/refs y eventos. Telegram = bytes de audio, proyecto, portada y documentos MAIN. Navegador = UI, archivos locales, selección temporal, cachés/stream. Polar = hechos comerciales; PG = derechos que autoriza Web. El backup PG no duplica bytes de Telegram. **Fuente:** [P01](../panorama-main-20261120/profundizacion/P01-DIRECT-ARCHIVOS.md), [P05](../panorama-main-20261120/profundizacion/P05-CATALOGO-SQL.md), [P06](../panorama-main-20261120/profundizacion/P06-PAGOS-ACCESO.md).

## Navegación por necesidad

| Quiero entender o modificar… | Empiezo en | Propietario de comportamiento / límites |
|---|---|---|
| Entrada Web, Landing y rutas | `src/main.tsx`, `src/app/WebExperience.tsx`, `src/app/WebGalleryEntry.tsx` | Selección Web/Desktop y rutas `/`, `/gallery`, `/login`, `/signup`; `bgPage` histórico aún se traduce |
| Autenticación visible | `src/features/auth/`, `src/components/AccountGate.tsx`, `src/app/WebGalleryWorkspace.tsx` | Estado de sesión en navegador; autoridad real en Cloud |
| Composición de Gallery | `src/features/library/catalog/catalogComposition.ts`, `LibraryCompositionGate.tsx`, `CatalogGalleryWorkspace.tsx`, `CatalogAppShell.tsx` | Web solicita `/catalog/v1/context`; con flag false expone `LegacyRetired`, **no** reactiva INDEX |
| Lista, filtros, facetas y scroll | `catalogLibraryProvider.tsx`, `catalogQueryStore.ts`, `CatalogVirtualGallery.tsx`, `catalogApi.ts` | SQL decide resultados/cursor/orden; store guarda bloques residentes y navegación |
| Selecciones, edición y papelera | `catalogInteractionStore.ts`, `catalogMutations.ts`, `catalogCommandsApi.ts`, `catalogTrashSource.ts` | Comandos HTTP con época, versiones, selección CAS e idempotencia; PG confirma; la UI no es autoridad |
| Reproducción / Playbar | `catalogPlaybackSession.ts`, `catalogMediaClient.ts`, `src/components/Player.tsx` | Rondas y navegación servidor + lectura Direct B; cuidar lease, teardown, MSE→Blob y reproducción continua |
| Portadas / prefijos / MAIN | `catalogArtworkCache.ts`, `catalogPrefixCache.ts`, `catalogMainPack.ts`, `catalogFirstBlockCache.ts` | Copias aceleradoras ligadas a identidad y revisión; **no respaldo duradero de archivos** |
| Preparación y subida de archivos | `catalogFilePrep.ts`, `catalogTransfer.ts`, `catalogMutations.ts`, `catalogDirectPort.ts` | Operación y ticket HTTP; envío de bytes Web→Telegram; verificación/commit por worker |
| Transporte compartido de Web | `src/features/cloud/webTransportWorkerClient.ts`, `webTransportController.ts`, `webTransportSession.ts`, `webTransport.worker.ts` | Compartido con la ruta PG vía import dinámico; **no eliminar por llamarse legacy/cloud** |
| Cloud HTTP / montaje | `cloud-server/server.js`, `server-core.js`, `cloud-server/catalog/routes.js` | Express con instaladores e interceptores; orden efectivo de guards y parsers importa |
| Identidad, OAuth, seguridad, estado cuentas | `cloud-server/session-security.js`, `account-lifecycle.js`, `auth-public-registration-hardening.js`, `server-core-auth-bridge-loader.js`, `control-plane-cutover-runtime.js` | Sesiones/cookies/CSRF, OAuth y PG/JSON compatibility; alta complejidad transversal y pruebas multiproceso pendientes |
| Catálogo PostgreSQL: lecturas | `cloud-server/catalog/authority.js`, `queries.js`, `playback.js`, `media.js` | Autoridad por tenant/generación; queries con cursor firmado y concesiones; bytes fuera de SQL |
| Catálogo PostgreSQL: escrituras | `cloud-server/catalog/commands.js`, `operations.js`, `direct.js` | PATCH/bulk/trash versus IMPORT/REPLACE; tickets y commit; duplicación real de proyección de campos |
| Worker de catálogo (separado) | `cloud-server/catalog-worker.js`, `cloud-server/catalog/worker.js`, `catalog-gateway-runtime.js` | Jobs durables, verificación Telegram, reintento, reconciliación y commit; un HTTP sano no garantiza worker sano |
| Purga / retención / restore | `cloud-server/catalog/purge.js`, `catalog-deletion-journal.js`, `scripts/backup/` | `restore_hold`, journal y evidencias antes de borrar; **NO** reinterpretar papelera como borrado físico |
| Bots, vault y sesión temporal | `cloud-server/direct-transport-control.js`, `direct-vault-assignment.js`, `native-transport-provisioning.js` | Membresía/credenciales, asignaciones y puente Telegram; compartidos/condicionados |
| Pagos, planes y cuotas | `cloud-server/billing-access-resolver.js`, `billing-lifecycle.js`, `billing-webhook-durable.js`, `billing-reconciliation.js`, `src/components/SettingsPanel.tsx` | Polar reporta pagos; PG proyecta periodo y grants; `resolveBillingAccess` decide derecho Web |
| Pruebas y entrega | `.github/workflows/`, `scripts/catalog-check.cjs`, `scripts/catalog-suites.json`, `cloud-server/tests/`, `tests/`, `scripts/aws/deploy.sh` | Tests configurados no son PASS; deploy y rollback Web/Cloud **no** revierten DB o Telegram |
| INDEX antiguo / Desktop / LAB | `src/platform/`, `src-tauri/`, `DESIGN/`, `cloud-server/catalog/legacy-fence.js`, `legacy-media-upload-disable.js` | Separar caminos antes de retirar; hay seguridad y componentes compartidos aún necesarios |

## Subdivisión por subsistemas (y pruebas que los defienden)

| Sistema | Documentación profunda | Qué probar antes de refactor |
|---|---|---|
| Direct / archivos / Telegram | [P01](../panorama-main-20261120/profundizacion/P01-DIRECT-ARCHIVOS.md) | Ticket→send→receipt→verify→commit; lectura por partes; lease/abort; sin reenviar estado incierto |
| INDEX / Desktop / imports | [P02](../panorama-main-20261120/profundizacion/P02-LEGACY-Y-DESKTOP.md) | Grafo de imports dinámicos, chunks de build Web, rutas registradas, guardas 410 y tests Direct |
| Auth y Cloud | [P03](../panorama-main-20261120/profundizacion/P03-CLOUD-AUTH-CONTROL.md) | Body parsers, orden middleware, sesión y revocación, OAuth multiproceso, flush PG |
| Gallery / Player | [P04](../panorama-main-20261120/profundizacion/P04-GALLERY-UI.md) | Filtros, sort interleaved, selección global, Drawer/bulk, audio teardown y continuidad |
| Catálogo SQL | [P05](../panorama-main-20261120/profundizacion/P05-CATALOGO-SQL.md) | Equivalencia PATCH/IMPORT/REPLACE, epoch/version/locks, idempotencia, jobs y purge |
| Pagos / acceso | [P06](../panorama-main-20261120/profundizacion/P06-PAGOS-ACCESO.md) | Checkout ambigüo, webhook duplicado/fuera de orden, cuotas y grants |
| CI / infra / recuperación | [P07](../panorama-main-20261120/profundizacion/P07-CI-DEPLOY-RECOVERY.md) | Suites realmente seleccionadas, migraciones 0031–0042, backup/HELD/journal/rollback |

## Tres reglas para el mapa

1. `ACTIVO` significa **alcanzable en código bajo condiciones identificadas**, no ejecución real en producción. `COMPARTIDO` tampoco significa «borrable a medias». `INCIERTO` no se borra.
2. **Tamaños, nombres o un grafo SymDex no prueban ausencia de consumidores**: imports dinámicos, middleware instalado al registro, require hooks, scripts externos y Telegram no se resuelven por AST superficial. Verificar inversamente y conservar fuentes completas.
3. Para hallar **cada archivo**, incluidos test, migración, scripts y alternativas, usar el [inventario C0](../panorama-main-20261120/INVENTARIO-C0.md). Para detalles y números de línea, abrir el informe P0x; este mapa no duplica esas 250+ páginas.

**Ruta de lectura:** [flujos y fronteras](FLUJOS.md) → [piloto propuesto](PRIMER-PILOTO.md) → [plan completo](../panorama-main-20261120/PLAN-LIMPIEZA-V1-PROPUESTA.md).
