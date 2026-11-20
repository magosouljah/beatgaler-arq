# Estado del diagnóstico de arquitectura de BeatGaler

**Última actualización:** 2026-11-11 (sesión 1).
**Encargo:** `E:\777\app\BeatGaler-arq\PROMPT-DIAGNOSTICO-ARQUITECTURA.md`.
**Etapa:** 1 (solo lectura). **Pasada:** 1 terminada; a la espera de que el propietario elija dónde profundizar.

## Commit leído

- Repo `E:\777\app\BeatGaler`, rama `local/landing-gallery-unificada`, HEAD **`5cb6ccc`** (el encargo citaba `96f3dd7`; la diferencia es un commit de la migración: migración SQL 0040 y renumeración de tests).
- `main` en `10ae190`.
- Árbol limpio salvo `Claude outputs/` y `beatgaler-console.jpg` sin seguimiento (no tocados).
- **Al retomar:** `git log --oneline 5cb6ccc..HEAD -- <zona>` para ver qué cambió en cada zona antes de reutilizar sus conclusiones. La zona 06 (catálogo) cambia casi a diario.

## Qué hay en esta carpeta

| Archivo | Qué es |
|---|---|
| `PROMPT-DIAGNOSTICO-ARQUITECTURA.md` | El encargo y las decisiones del propietario. |
| `ESTADO-DIAGNOSTICO.md` | Este archivo. |
| `pasada-1\informe-pasada-1.html` | Informe de la pasada 1 para el propietario (secciones A–H, avisos y recomendación). |
| `pasada-1\zonas\01…07-*.md` | Evidencia por zona con archivo y línea (informes de los sub-agentes, casi literales). **Leer la zona antes de volver a recorrer el código.** |
| `borradores\GLOSARIO-borrador.md` | Borrador de glosario, con las colisiones de vocabulario detectadas. Sin acordar. |

## Zonas cubiertas (pasada 1, a lo ancho)

| Zona | Archivo de evidencia | Cobertura |
|---|---|---|
| 01 Frontend: armazón, Gallery, biblioteca | `zonas\01-frontend-shell-gallery.md` | Amplia. Sin profundizar: interior de `StudioToolbarCandidate`/WebGL, dragdrop, import. |
| 02 Cuentas y pagos, navegador + servidor | `zonas\02-cuentas-y-pagos.md` | Amplia. OAuth y reconciliación solo por encima. |
| 03 Navegador: transporte, subida, reproducción, descargas | `zonas\03-navegador-transporte-reproduccion.md` | Amplia. Bloque de diagnóstico del worker (432-1186) no leído entero. |
| 04 Servidor: esqueleto y persistencia de control | `zonas\04-servidor-esqueleto-persistencia.md` | Amplia. Orden efectivo de middlewares inferido, no observado. |
| 05 Servidor: Telegram e INDEX | `zonas\05-servidor-telegram-index.md` | Amplia. |
| 06 Catálogo PostgreSQL | `zonas\06-catalogo-postgresql.md` | Media. No leídos enteros `backup`, `native-cli`, `purge`, `playback`, `media`, `transport-gateway` ni las migraciones 0029–0036. |
| 07 Pruebas, CI, scripts, infraestructura (+ anexo Desktop) | `zonas\07-pruebas-ci-infra-scripts.md` | Amplia en inventario y duraciones. Sin logs de CI. |

## Conclusiones firmes (leídas en código en `5cb6ccc`)

1. **Tres aplicaciones entrelazadas:** Desktop (archivada), Web sobre INDEX (la que rige: flag `VITE_CATALOG_API_ENABLED` apagado por defecto, de build) y Web sobre catálogo (construida, apagada). Comparten `BeatCard`, `Drawer`, `Player`, `SettingsPanel`, `AddBeatModal` y el tipo `Beat` (con forma Desktop).
2. **Reparto frente a Telegram hoy:** el navegador (worker con `@mtcute/web`, identidad de bot, llave temporal ~10 min firmada por el servidor) sube y baja audio/portadas y lee el INDEX directamente. El servidor (gramjs como cuenta MASTER) crea vaults y topics, sube PROJECT, publica/fija el INDEX y borra. En el camino catálogo el navegador no toca Telegram: todo va por el servidor.
3. **El gateway del catálogo no está cableado:** `server.js:105-108` pasa `gateway: null, master: null`; `:101` aborta si se activa. Subir y reproducir por catálogo responden 503 fuera de fakes/LAB.
4. **El camino catálogo no tiene streaming ni prefetch** (descarga el archivo entero); tampoco restaurar/vaciar papelera ni descargas cableados en la UI; el Drawer descarta archivos elegidos.
5. **Prefetch y reproducción de hoy viven en el navegador:** primeros 64 KiB por beat; disparadores: arranque (14 rutas), `IntersectionObserver` sobre tarjetas, y Play.
6. **El servidor se compone con monkey-patching ordenado:** 19 archivos reasignan `express.application.*`, 3 `fs.writeFileSync`, 1 el loader de CommonJS (reescribe texto de `server-core.js`). `POST /auth/login` aparece en 9 archivos. `server-core.js` no exporta nada y escucha al cargarse.
7. **La "autoridad PostgreSQL" del control-plane es un espejo write-behind** de Maps en memoria, vía archivos virtuales (`control-plane-json-compat.js`). Una cuenta vive en tres almacenes. Dos migraciones PG distintas: control-plane (0001–0025) y catálogo (0026–0040).
8. **Catálogo:** modules verticales deep; infraestructura transaccional copiada 5–9 veces; "añadir un campo a un beat" = 12–18 sitios; residuo de la ruta INDEX→PG (`staging.js`, `migration.js`, `repository.js`, gran parte de `legacy-codec.js`).
9. **Pagos:** núcleo deep (resolver, checkout persistente, webhook durable, lifecycle, reconciliación, adapters Polar) con cáscara shallow (5 `-runtime`, 3 variantes antiguas sin uso, dos catálogos de planes).
10. **Desktop mezclado:** 33/196 archivos TS importan `src/lib/tauri.ts` (136 exports, no-op silencioso en Web); `src-tauri/` 15.993 líneas Rust; 41 scripts, 7 workflows; `npm test` incluye `cargo test`.
11. **Pruebas/CI:** en push solo corre `catalog-checks` (mediana 147 s, hoy ~8,6 min; 127 referencias a 61 ejecutables); filtro de paths solo cubre migraciones 0026–0030; 35/52 de `tests/integration` solo leen texto fuente; 4 workflows en rojo crónico; ninguna puerta antes de desplegar; despliegue Web 100 % manual; despliegue de Cloud no versionado.
12. **Vocabulario colisionado:** capability ×4, legacy ×4, MASTER ×2, index ×2, operación ×4; nombres de fase en archivos y workflows.

## Conclusiones provisionales (y qué falta)

| Conclusión | Qué falta para cerrarla |
|---|---|
| Borrado de cuenta (`POST /auth/account/delete`, inmediato) podría arrastrar el catálogo por `ON DELETE CASCADE` (`0026:12`). | Leer a fondo los triggers anti-cascada de `0027` y `catalog_account_deletions`; o probar en LAB (pedir permiso). |
| En Web legacy, renombrar tag y edición en lote no persisten. | Que el propietario lo compruebe a mano (renombrar, recargar), o reproducir en LAB. |
| Con ≥2 procesos Cloud, `runtime_compat_state` es last-writer-wins. | Saber cuántos procesos corren en producción (no accesible en etapa 1). |
| ~1.200–1.400 líneas muertas en `server-core.js`. | Trazar el grafo de llamadas completo. |
| Qué autoridad (`json`/`postgres`) y qué valor del flag de catálogo hay en producción. | Dato del entorno real; preguntar al propietario o a la sesión de migración. |
| Infraestructura EC2/RDS. | Solo consta en documentos de octubre. |
| Causa de los workflows en rojo crónico (`d7`, `direct-persistent`, `test-desktop-portability`, preflight Polar). | Leer logs de CI (`gh run view --log`), aún no hecho. |
| Todo el juicio sobre el catálogo (generación como complejidad accidental, qué residuo se retira, forma del seam gateway/MASTER). | Depende de cómo termine la migración (G2, T19/G4, T20, T23–T25). Revalidar entero. |
| Qué sobrevive de la coordinación del transporte directo (leases, capabilities, temp-auth). | Depende de la decisión "bytes directos vs. por el servidor" y de las medidas de T20. |
| `notifyLibraryChanged()` puede devolver la vista al inicio tras editar con scroll profundo. | Leer `catalogQueryStore.ts` con detalle o probar en LAB. |

## Avisos dados al propietario (sesión 1)

1. Borrado de cuentas montado pese a que `CLAUDE.md` lo da por deshabilitado.
2. Renombrar tag / edición en lote sin persistencia en Web legacy.
3. Tres huecos del camino catálogo sin aviso en la UI (archivos del Drawer, restaurar/vaciar, descargas).
4. Pisado de estado entre procesos y proceso "envenenado" tras fallo de escritura.
5. `node server-core.js` arranca sin capas de protección.

## Candidatos presentados (sección H del informe)

1. Una sola Gallery con interface tipada (Fuerte; depende de migración + retiradas).
2. Rutas del servidor legibles en un sitio (Fuerte).
3. Cuentas con un solo almacén (Fuerte; el más delicado).
4. Catálogo: definición única del beat + transacción de biblioteca (Fuerte; no durante la migración).
5. Cliente único de Cloud en el navegador (Fuerte; pequeño, buen primer paso).
6. Reproducción como module (Explorar; depende de decisión directo/servidor).
7. Module único de Telegram en el servidor (Explorar; depende del 6).
8. Pruebas por la interface (Explorar; política abierta).
9. Pagos: quitar la cáscara (Explorar; pequeño).
10. Carpeta = mapa: nombres, carpetas por sistema, glosario, configuración (Fuerte; barato).
11. "Operación" con un solo significado en el catálogo (Especulativo).

Recomendación hecha: profundizar primero en Gallery + cliente Cloud (1, 5); después servidor: rutas + cuentas (2, 3); tercero, preparar la decisión del camino de archivos (6, 7). En paralelo: glosario (10) y lista de retirada ordenada (sección E).

## Decisiones tomadas con el propietario

- Ninguna todavía en esta etapa (las del encargo, §3, siguen vigentes y no se reabren).

## Siguiente paso

1. **Esperar la respuesta del propietario:** qué zonas profundizar en la pasada 2 (y si el marco "tres aplicaciones" encaja con su experiencia; qué espera le molesta: CI o local).
2. En la zona elegida: skill `grilling` para el árbol de decisiones; "design it twice" de `codebase-design` si hay más de una forma razonable; glosario y ADR como borradores en `borradores\`.
3. Antes de retomar cualquier zona: comprobar si su código cambió desde `5cb6ccc`.

## Método y coste (para futuras sesiones)

- Pasada 1: siete sub-agentes de solo lectura en paralelo, uno por zona (unos 2 M de tokens en total), más medición directa de Desktop. Sus transcripciones en disco quedaron vacías: por eso los informes se guardaron en `pasada-1\zonas\`.
- No se ejecutó nada del proyecto. `gh` solo en lectura (`run list`, `run view --json jobs`).
- No se leyeron `.env` ni los archivos locales ignorados de `cloud-server/` (`master-session.txt`, `accounts-data.json`, `vault-registry.json`, etc.).
