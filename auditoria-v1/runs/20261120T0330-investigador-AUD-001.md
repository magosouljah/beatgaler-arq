# AUD-001 — Investigador — 2026-11-20 03:30 America/Mexico_City

**Fuente:** magosouljah/BeatGaler, código leído explícitamente a `4e66638051effe888e66a885010065d98fc7df17`; asignación vigente en `auditoria-v1/PLAN.md`. **Método:** revisión estática exclusivamente; no se ejecutaron tests ni producto. **Estado:** checkpoint parcial, lote EN_PROGRESO; no declarar C3 ni flujo Cloud completo.

## Diagrama y ownership observados

`src/main.tsx:1-17,125-131` instala trazas, coordinación CSRF y PlatformProvider; `platform.kind === "web"` monta WebExperience, Desktop se carga lazy y queda fuera del alcance. `src/app/WebExperience.tsx:1-29` implementa routing por pathname: raíz Landing, `/gallery|/login|/signup` WebGalleryEntry; `bgPage` en raíz se redirige a Gallery. `src/app/WebGalleryEntry.tsx:1-19` inicia import asíncrono de WebGalleryWorkspace en paralelo a restauración de sesión, pero lo monta dentro de `AuthExperienceGate`. `src/features/auth/AuthExperienceGate.tsx:79-161` restaura sesión con `restoreBeatGalerSession`, mantiene `account/checking/phase`, escucha eventos `beatgaler:account-logged-out` y `beatgaler:account-updated`; `activeWebAccount.ts:1-22` conserva identidad activa y generación SOLO en memoria, no en localStorage.

`src/app/WebGalleryWorkspace.tsx:1-31` lee identidad activa, llama `useLibraryComposition` y entrega estado al `LibraryCompositionGate`. `catalogComposition.ts:5-35`: flag de build `VITE_CATALOG_API_ENABLED` debe ser exactamente `true` (case-insensitive); off = LEGACY sin /context; on = `resolveContext` y resultado catalog/blocked. `catalogLibraryProvider.tsx:153-208`: con flag on inicia resolución, cancela mediante AbortController al desmontar/cambiar cuenta, libera servicios previos, crea servicios por cuenta+época, puede sembrar primer bloque IndexedDB tras autoridad confirmada, invalida cachés de identidad no coincidente; teardown cierra playback, interacción, media, store y Direct. `LibraryCompositionGate.tsx:29-39` presenta pantalla de espera, legacy, catálogo o bloqueo visible sin fallback. `CatalogGalleryWorkspace.tsx:1-20` pasa servicios a `CatalogAppShell`.

**Flujo textual:** main → WebExperience → WebGalleryEntry/AuthExperienceGate → identidad en memoria → WebGalleryWorkspace → provider → CatalogApi.resolveContext → GET /catalog/v1/context → [si LIBRARY_NOT_PROVISIONED, POST /catalog/v1/library/provision] → ready/catalog + servicios + CatalogAppShell; otros errores → blocked. `catalogApi.ts:126-218` usa fetch con cookies, bearer opcional, CSRF en POST, timeout 20s, clasifica 401/reset/quarantine/unavailable/offline. Cloud real, handlers y SQL aún NO trazados.

**Servicios:** `catalogLibraryProvider.tsx:44-151` compone API metadata, comandos, query store, interacción, mutaciones, transferencias, reproducción, cliente media, Direct B opcional anunciado por capacidades, IndexedDB de prefijos/portadas, MAIN de prefijos, y teardown. Si `capabilities.direct` es true crea puerto lazy browser→Telegram; no es evidencia de ejecución real. `catalogLibraryProvider.tsx:120-150` implementa cliente HTTP inline de comandos de reproducción; `CatalogGalleryWorkspace` es envoltura pequeña del shell.

## Contraste histórico y riesgos

**OBSERVADO:** el comentario histórico `pasada-1/zonas/01-frontend-shell-gallery.md` decía «catálogo apagado en producto» en 5cb6ccc. El código vigente sigue teniendo flag con fallback legacy cuando está off (`catalogComposition.ts:12-19`, `WebGalleryWorkspace.tsx:10-20`), pero **NO puede concluirse** que el bundle LIVE lo tenga apagado: depende de build/env, que no se inspeccionó. Con flag on y /context fallido NO cae a INDEX: muestra blocked (`catalogComposition.ts:20-25`, `LibraryCompositionGate.tsx:29-39`).

**RIESGO / pendiente de falsación:** la coexistencia de ramas legacy/catalog conserva superficie de código y posibilidad de activar legacy con flag off; no afirmar bug operativo sin configuración de build y entrypoint de despliegue.

**HIPÓTESIS a investigar:** `catalogApi.ts:223-229` compara tags codificados como secuencias decimales con `join(",")` para construir `filtersKey`, en vez de comparar bytes directamente. Puede divergir del orden Unicode del servidor en ciertos tags; demostrar con contraejemplo y comprobar uso/impacto antes de clasificar defecto.

**Observación:** el estado `resolving` es UI vacía con aria-busy (`LibraryCompositionGate.tsx:29-32`); no declarar defecto sin criterio de UX/tiempo.

## Propuesta de cobertura (pendiente de validación del Director)

C2 estático propuesto: `src/main.tsx`, `src/app/WebExperience.tsx`, `src/app/WebGalleryEntry.tsx`, `src/app/WebGalleryWorkspace.tsx`, `src/features/library/catalog/catalogComposition.ts`, `src/features/library/catalog/LibraryCompositionGate.tsx`, `src/features/auth/activeWebAccount.ts`. C1/C2 parcial: `catalogLibraryProvider.tsx`, `catalogApi.ts`, `AuthExperienceGate.tsx`, `CatalogGalleryWorkspace.tsx`. C3: ninguno. Cobertura de flujo: C2 parcial Web→cliente; Cloud/SQL no verificado.

## Checkpoint / siguiente ejecución

1. Leer resto de `AuthExperienceGate` y localizar su render condicional de hijos, restore/errores.
2. Seguir Cloud `/catalog/v1/context` y `/library/provision` a handlers y SQL a este SHA; inspeccionar tests escritos relevantes.
3. Verificar flag de build actual sin inferir despliegue real.
4. Falsar hipótesis del comparador `filtersKey` y evaluar impacto.
5. Comparar con las otras seis zonas históricas cuando el flujo lo requiera; esta ejecución solo contrastó zona 01. Ningún bug confirmado en este lote todavía.
