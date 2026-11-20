# Mapa vivo del código — comprensión completa de BeatGaler V1

**Estado:** por levantar y contrastar con el código vigente. Propietario de escritura: Director.

Objetivo: poder explicar y navegar el proyecto sin releer todo. Para cada sistema, describir responsabilidades, por qué existe, ubicación, entrypoints, interfaces, dependencias, propietarios de estado, tablas/archivos/medios, flujos de datos, errores, recuperación, pruebas y puntos de cambio. Marcar `VERIFICADO@SHA`, `PROVISIONAL` o `PENDIENTE`.

No basarse solo en `import`: investigar requires dinámicos, rutas, middlewares, factories, eventos, handlers y SQL/triggers. Distinguir ACTIVO, LEGACY, DESCONOCIDO. Desktop solamente como frontera de Web.

**Hipótesis iniciales:** los siete informes en [pasada-1/zonas/](../pasada-1/zonas/) y [ESTADO-DIAGNOSTICO](../ESTADO-DIAGNOSTICO.md); revisión anterior, NO mapa vigente certificado.

## Sistemas y relaciones
Pendiente de inventario validado.

## Glosario de conceptos y responsabilidades
Pendiente. Explicar conceptos al propietario en lenguaje comprensible con nombres del código.

## AUD-001 — Arranque y selección de autoridad (parcial, verificación estática @ 4e66638051effe888e66a885010065d98fc7df17)
Web: `src/main.tsx` monta la experiencia Web; `src/app/WebExperience.tsx` decide rutas; `WebGalleryEntry.tsx` entra a la compuerta de autenticación; `WebGalleryWorkspace.tsx` toma identidad activa y composición. La autoridad se decide en `src/features/library/catalog/catalogComposition.ts`: `VITE_CATALOG_API_ENABLED` distinto de `true` => LEGACY; `true` => resolver contexto y seleccionar CATALOG o BLOCKED. `LibraryCompositionGate.tsx` muestra resolución, legacy, catálogo o bloqueo; bloqueo NO cae a INDEX. Código fuente verificado directamente en el SHA; detalles de restauración de sesión y lifecycle de servicios descritos en [AUD-001](runs/20261120T0330-investigador-AUD-001.md) siguen **provisionales** hasta revisión de sus archivos completos. **Dónde modificar:** flag/decisión en `catalogComposition.ts`; representación de estados en `LibraryCompositionGate.tsx`; composición UI en `WebGalleryWorkspace.tsx`. Estado ACTIVO/LEGACY en producto no determinado por lectura estática del flag: requiere configuración efectiva del build.

## AUD-001 — Autoridad SQL y provisión de transporte (verificación estática parcial @ 4e66638051effe888e66a885010065d98fc7df17)
- `cloud-server/catalog/authority.js:168-193`: `resolveContext` consulta biblioteca PostgreSQL en transacción read-only; si existe y su autoridad es POSTGRES, devuelve contexto, **sin inspeccionar membresía del bot**. Si falta, evalúa elegibilidad y emite `LIBRARY_NOT_PROVISIONED` o bloqueo.
- `authority.js:195-245`: `provisionLibrary` usa transacción SQL, lock `vaults` por usuario, revalida predicado, inserta biblioteca/generación/chat, revoca capacidades legacy y confirma; ante error SQL revierte. **No incluye red Telegram** en la transacción.
- `cloud-server/catalog/routes.js:48-79`: router expone GET contexto y POST provisión; POST hace commit de biblioteca primero y después llama al `transportProvisioner` opcional. Montaje real del router y middleware superiores aún PENDIENTES.
- `native-transport-provisioning.js:19-59`: valida chat y asignación, bloquea membresía, comprueba activación/bot, usa gateway para asegurar membresía y marca READY. Estado durable en assignment store; prueba gateway externa no atómica con SQL. El comportamiento completo del store y gateway está PENDIENTE.
- `src/features/library/catalog/catalogApi.ts:194-216`: cliente solo invoca POST de provisión tras `LIBRARY_NOT_PROVISIONED`; GET 200 devuelve ready directamente. Punto de cambio: estrategia de reconciliación de membresía, sin prescribir implementación.
Evidencia: [checkpoint 05:25](runs/20261120T0525-investigador-AUD-001.md) y contraste directo del Director. No equivale a runtime comprobado.
