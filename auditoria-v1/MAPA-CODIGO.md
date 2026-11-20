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
