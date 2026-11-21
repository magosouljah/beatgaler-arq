# BeatGaler — Arquitectura y preparación de limpieza V1

**Repositorio de conocimiento y auditoría**, no el código de la aplicación. Código oficial: [magosouljah/BeatGaler](https://github.com/magosouljah/BeatGaler) (`main`). Último corte verificado de este mapa: **`ad8f8d0436bba5c3f663a301440ebf977200d953` — 20 de noviembre de 2026**.

> **Estado (2026-11-21): INVESTIGACIÓN CONGELADA — este README es la única entrada vigente al conocimiento.** Panorama + **7 profundizaciones terminadas e íntegras**; mapa legible; plan de limpieza **propuesto**; **[línea base de pruebas](linea-base-20261121/LINEA-BASE.md) ejecutada localmente**. **Preparación de limpieza CERRADA:** pruebas reparadas, `npm test`/CI seguros y piloto F1 ejecutados en la rama de revisión `local/limpieza-preparacion-20261121` de BeatGaler, con CI de GitHub en verde. **No fusionado a `main`**; F1 verificado solo con fakes ([Etapas 1–4](linea-base-20261121/ETAPAS-1-3.md)). No se crean más auditorías ni informes panorámicos: el siguiente conocimiento nace de cambios concretos y se registra junto a ellos. Lo verificado en código **no** equivale a funcionamiento probado en AWS.

## Empieza aquí (2 minutos)

| Necesito… | Abro |
|---|---|
| Entender qué sistemas existen y quién hace qué | **[Mapa de sistemas y módulos](mapa-v1/SISTEMAS.md)** |
| Seguir una acción de UI hasta PG, Telegram o Polar | **[Flujos y dependencias](mapa-v1/FLUJOS.md)** |
| Preparar el primer cambio pequeño y reversible | **[Primer piloto: HTTP de catálogo Web](mapa-v1/PRIMER-PILOTO.md)** |
| Elegir todo el orden de limpieza, con riesgos y STOPs | [Plan maestro V1 por fases](panorama-main-20261120/PLAN-LIMPIEZA-V1-PROPUESTA.md) |
| Buscar **un archivo exacto** entre los 1.582 clasificados | [Inventario panorámico C0](panorama-main-20261120/INVENTARIO-C0.md) |
| Ver visión general y arquitectura original del corte | [Panorama de main](panorama-main-20261120/PANORAMA.md) |
| Consultar detalles, pruebas escritas y evidencia por línea | **Investigaciones P01–P07** (abajo) |
| Saber qué decidió el propietario sobre conocimiento/contexto | [Context Management](context-management/README.md) y [decisiones](context-management/DECISIONES.md) |
| Saber qué pruebas pasan hoy, cómo ejecutarlas aisladas y cuáles solo leen texto fuente | **[Línea base de pruebas 2026-11-21](linea-base-20261121/LINEA-BASE.md)** |
| Ver qué se reparó (pruebas, npm test, CI), el resultado del piloto F1, los runs de CI y el **siguiente orden de limpieza** | **[Etapas 1–4](linea-base-20261121/ETAPAS-1-3.md)** (rama de revisión, sin merge) |

### Modelo mental

```text
Web/Landing → Login/Gallery → consulta y edición → Cloud HTTP → PostgreSQL (autoridad)
                                     │
                             upload / playback
                                     ▼
                            Direct B del navegador → Telegram (bytes)
                                     ▲
                             worker Cloud separado → verify / commit en PG

Settings → checkout Polar → webhooks PG → acceso/planes → cuotas del catálogo
```

**PostgreSQL gobierna identidad, catálogo, referencias y operaciones. Telegram almacena bytes. El navegador conserva estado efímero/caches.** No eliminar el WebTransport Worker creyendo que pertenece íntegramente al INDEX antiguo.

## Para investigar un cambio

1. **Funcionalidad primero:** localizarla en [SISTEMAS](mapa-v1/SISTEMAS.md) y recorrer [FLUJOS](mapa-v1/FLUJOS.md). No abrir archivos al azar.
2. **Código después:** buscar símbolos, callers y outlines en el checkout local mediante SymDex/IDE. Es una ayuda de navegación, **no un comprobador de código muerto**.
3. **Evidencia:** contrastar imports dinámicos, registro real de rutas, módulos compartidos, SQL/Telegram y pruebas con P01–P07; leer código al **SHA actual**, no solo informes congelados.
4. **Antes de editar:** seleccionar el contrato y tests afectados, validar riesgo de datos y trabajar en rama LAB/LOCAL; no alterar producción.

**Regla de certeza:** `VERIFICADO_EN_CÓDIGO` ≠ `VERIFICADO_EN_FUNCIONAMIENTO`; `HIPÓTESIS` no es un bug probado. El índice C0 cubre rutas por clasificación, **no significa comprensión semántica ni eliminación segura de 1.582 archivos**.

## Investigaciones completas (no resumirlas como si fueran pruebas E2E)

| Área | Informe |
|---|---|
| P01 — Direct B, Telegram, archivos, playback, recovery | [P01](panorama-main-20261120/profundizacion/P01-DIRECT-ARCHIVOS.md) |
| P02 — INDEX, importación histórica, Desktop y rutas legacy | [P02](panorama-main-20261120/profundizacion/P02-LEGACY-Y-DESKTOP.md) |
| P03 — Cloud HTTP, cuentas, OAuth, sesiones, control-plane | [P03](panorama-main-20261120/profundizacion/P03-CLOUD-AUTH-CONTROL.md) |
| P04 — Gallery, UI, selección, filtros y Player | [P04](panorama-main-20261120/profundizacion/P04-GALLERY-UI.md) |
| P05 — PostgreSQL, escrituras, operaciones y jobs | [P05](panorama-main-20261120/profundizacion/P05-CATALOGO-SQL.md) |
| P06 — Billing, checkout, entitlements y quotas | [P06](panorama-main-20261120/profundizacion/P06-PAGOS-ACCESO.md) |
| P07 — CI, despliegue, backup y recuperación | [P07](panorama-main-20261120/profundizacion/P07-CI-DEPLOY-RECOVERY.md) |

Se conservan originales completos, fuentes y grado de certeza. **P01–P07 están congelados sin cambios** en `ad8f8d0`; si el código cambia, se anota el delta en el documento vigente que corresponda, no se reescriben.

### Material histórico (no es estado vigente; consultar solo ante dudas o regresiones)

Cada archivo lleva un aviso `HISTÓRICO — congelado el 2026-11-21` en su primera línea.

| Material | Por qué es histórico |
|---|---|
| [`ESTADO-DIAGNOSTICO.md`](ESTADO-DIAGNOSTICO.md), [`PROMPT-DIAGNOSTICO-ARQUITECTURA.md`](PROMPT-DIAGNOSTICO-ARQUITECTURA.md), [`pasada-1/`](pasada-1/informe-pasada-1.html), [`borradores/`](borradores/GLOSARIO-borrador.md) | Pasada 1 sobre `5cb6ccc` (11-nov), antes de LIVE y de T25; parte de sus conclusiones (gateway sin cablear, flag apagado, INDEX vigente) ya no es cierta |
| [`auditoria-v1/`](auditoria-v1/PROTOCOLO.md) (protocolo, plan, cobertura, hallazgos, 12 ejecuciones) | Auditoría autónoma del 20-nov; protocolo escrito para una rama ya archivada; cobertura nunca certificada. **No se crean más ejecuciones** |
| [`panorama-main-20261120/PROMPTS.md`](panorama-main-20261120/PROMPTS.md) | Prompts que generaron P01–P07; la fuente son los informes |
| [`context-management/historico/`](context-management/historico/ARQUITECTURA-SIMPLE-v2.md) | Propuestas de sistema de conocimiento no aprobadas |

## Qué ya sabemos y qué NO sabemos

**Sabemos en código:** los entrypoints Web/Cloud/worker, las responsabilidades principales, cómo fluyen metadatos, permisos y bytes, dónde conviven piezas INDEX/PG, y duplicaciones de HTTP Web y proyección SQL. Los informes permiten **planificar** simplificación.

**Sigue pendiente comprobar en funcionamiento:** recuperación real de bytes Telegram, reproducción/descarga tras incidente Direct B, comportamiento de rutas HTTP inyectadas y consistencia multiproceso, CI ejecutado para cada cambio, y eliminación segura de imports/operadores legacy. El último cierre LIVE documentó `G2 NOT_PROVEN` y pendientes físicos; una lectura estática no los cierra.

**No tocar por simplificar:** archivos/refs/purge, Direct/mtcute compartido, sesión y CSRF, `server-core-auth-bridge-loader` sin sustituto, idempotencia, derechos pagados y guards SQL. Conserva Landing/Gallery/Playbar aprobados.

## SymDex: alcance del piloto local

Prueba local facilitada por el propietario sobre `src/features/library/catalog`: **42 archivos, 672 símbolos, 0 errores**. Búsqueda por símbolo/callers correcta para `createCatalogServices`; los `callees` incluyeron falsos positivos (`accountId ?? "anon"}`) y el context pack priorizó piezas no centrales. **Conclusión:** usar SymDex como navegación auxiliar, no como grafo autoritativo. El SQLite local vive en `E:\777\tools\symdex-state` y **no se sube a este repo**. La indexación completa de BeatGaler no quedó validada.

**Comprobado el 2026-11-21 (lectura `ro` de los SQLite):** existe un `beatgaler.db` **no registrado y abortado**: 561/1.582 archivos (todo `cloud-server`, 19/125 de `DESIGN`, **nada de `src/`, `tests/`, `scripts/` ni `src-tauri/`**), 0 embeddings, aristas solo por nombre; indexó 4 archivos no versionados (incl. `.claude/settings.local.json`, que git ignora globalmente). Su tabla de rutas no ve las rutas montadas por parches de `express.application` (`/auth/login`: 1 archivo frente a 9 referencias reales). Para alcanzabilidad y código muerto usar el grafo del build (`vite build` / `tsc`) y `rg`, no SymDex.

## Límites de este repositorio

- No modificar `magosouljah/BeatGaler`, su rama `main`, AWS, Telegram, DB, bots, datos o producción sin un encargo explícito separado.
- Los mapas Markdown son **guías legibles a los informes y al código**, no una implementación del **«index» multidimensional** futuro de Context Management. Su tecnología, relaciones y sincronización siguen pendientes de decisión; no improvisar sistema/SQLite/MCP remoto nuevo.
- Si `main` cambia, **indicar SHA nuevo y delta** antes de asumir que el mapa es vigente. Conservar fuentes históricas; corregir la guía por evidencia, no por antigüedad.
- **Piloto HTTP Web ([F1](mapa-v1/PRIMER-PILOTO.md)) ejecutado** en la rama de revisión. **Próximo módulo propuesto:** retirar la cadena legacy INDEX del bundle Web ([orden](linea-base-20261121/ETAPAS-1-3.md#siguiente-orden-de-limpieza-propuesto-cada-módulo-necesita-autorización)). Requiere autorización. [Plan maestro](panorama-main-20261120/PLAN-LIMPIEZA-V1-PROPUESTA.md).
