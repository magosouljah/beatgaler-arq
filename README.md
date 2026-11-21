# BeatGaler — Arquitectura y preparación de limpieza V1

**Repositorio de conocimiento y auditoría**, no el código de la aplicación. Código oficial: [magosouljah/BeatGaler](https://github.com/magosouljah/BeatGaler) (`main`). Último corte verificado de este mapa: **`ad8f8d0436bba5c3f663a301440ebf977200d953` — 20 de noviembre de 2026**.

> **Estado:** panorama estructural + **7 profundizaciones terminadas**; mapa legible creado; plan de limpieza **propuesto**; **ningún refactor autorizado ni ejecutado** desde este repositorio. Lo verificado en código **no** equivale a funcionamiento probado en AWS.

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

Se conservan originales completos, fuentes y grado de certeza. Los materiales [`auditoria-v1/`](auditoria-v1/PROTOCOLO.md) y [`pasada-1/`](pasada-1/informe-pasada-1.html) son **históricos**: algunos se escribieron contra ramas distintas de `main`, así que no deben sobrescribir el mapa del corte actual.

## Qué ya sabemos y qué NO sabemos

**Sabemos en código:** los entrypoints Web/Cloud/worker, las responsabilidades principales, cómo fluyen metadatos, permisos y bytes, dónde conviven piezas INDEX/PG, y duplicaciones de HTTP Web y proyección SQL. Los informes permiten **planificar** simplificación.

**Sigue pendiente comprobar en funcionamiento:** recuperación real de bytes Telegram, reproducción/descarga tras incidente Direct B, comportamiento de rutas HTTP inyectadas y consistencia multiproceso, CI ejecutado para cada cambio, y eliminación segura de imports/operadores legacy. El último cierre LIVE documentó `G2 NOT_PROVEN` y pendientes físicos; una lectura estática no los cierra.

**No tocar por simplificar:** archivos/refs/purge, Direct/mtcute compartido, sesión y CSRF, `server-core-auth-bridge-loader` sin sustituto, idempotencia, derechos pagados y guards SQL. Conserva Landing/Gallery/Playbar aprobados.

## SymDex: alcance del piloto local

Prueba local facilitada por el propietario sobre `src/features/library/catalog`: **42 archivos, 672 símbolos, 0 errores**. Búsqueda por símbolo/callers correcta para `createCatalogServices`; los `callees` incluyeron falsos positivos (`accountId ?? "anon"}`) y el context pack priorizó piezas no centrales. **Conclusión:** usar SymDex como navegación auxiliar, no como grafo autoritativo. El SQLite local vive en `E:\777\tools\symdex-state` y **no se sube a este repo**. La indexación completa de BeatGaler no quedó validada.

## Límites de este repositorio

- No modificar `magosouljah/BeatGaler`, su rama `main`, AWS, Telegram, DB, bots, datos o producción sin un encargo explícito separado.
- Los mapas Markdown son **guías legibles a los informes y al código**, no una implementación del **«index» multidimensional** futuro de Context Management. Su tecnología, relaciones y sincronización siguen pendientes de decisión; no improvisar sistema/SQLite/MCP remoto nuevo.
- Si `main` cambia, **indicar SHA nuevo y delta** antes de asumir que el mapa es vigente. Conservar fuentes históricas; corregir la guía por evidencia, no por antigüedad.
- **Próxima decisión técnica propuesta, todavía no implementada:** [piloto HTTP Web aislado y reversible](mapa-v1/PRIMER-PILOTO.md), con pruebas de equivalencia. [Orden completo](panorama-main-20261120/PLAN-LIMPIEZA-V1-PROPUESTA.md).
