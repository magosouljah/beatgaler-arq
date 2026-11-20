# Plan de auditoría — Director

Protocolo: [PROTOCOLO.md](PROTOCOLO.md). Fuente de código SOLO `magosouljah/BeatGaler@4e66638051effe888e66a885010065d98fc7df17` (rama `local/landing-gallery-unificada`, HEAD comprobado 2026-11-20). Solo lectura. Director dueño de este archivo.

## Asignación vigente: AUD-001 — ASIGNADO

- **Pregunta central:** ¿Cómo selecciona Web la experiencia Gallery activa y cómo entra al catálogo PostgreSQL, incluyendo arranque, sesión, estados de carga y error? Contrastar específicamente la hipótesis histórica «catálogo desactivado por defecto» contra el código ACTUAL, sin asumir que el informe de `5cb6ccc` sigue vigente.
- **Alcance inicial:** `src/main.tsx`, `src/app/WebExperience.tsx`, `src/app/WebGalleryEntry.tsx`, `src/app/WebGalleryWorkspace.tsx`, `src/features/library/catalog/catalogComposition.ts`, `catalogLibraryProvider.tsx`, `LibraryCompositionGate.tsx` y llamadas/imports directos pertinentes. Incluir endpoints Cloud de contexto/provisión solo hasta identificar contratos y responsables; registrar como siguiente lote si excede capacidad.
- **SHA obligatorio:** `4e66638051effe888e66a885010065d98fc7df17`. Leer todos los archivos con ese `ref`, no usar GitHub search/main como prueba.
- **Entregable de comprensión:** diagrama textual entrypoint → routing → autenticación → composición → context/provision → Gallery; responsables de estado, interfaces, flags, errores, recuperación, archivos y líneas, puntos concretos de modificación.
- **Falsación:** verificar si legacy INDEX aún puede activarse en Web y bajo qué condiciones; distinguir código muerto de ruta activa; buscar un camino de fallo y un contraejemplo a cada sospecha.
- **Evidencia:** código a SHA, tests escritos pertinentes, líneas precisas; sin ejecutar tests ni acceder a producto real. Clasificar CONFIRMADO/RIESGO/HIPÓTESIS.
- **Criterio de aceptación:** informe nuevo `auditoria-v1/runs/<fecha>-investigador-AUD-001.md` con llamadas trazadas, mapa técnico, hipótesis históricas reconciliadas, cobertura C1/C2/C3 propuesta por archivo, límites y siguiente paso. No editar registros canónicos.
- **Estado:** ASIGNADO, pendiente de primer informe del Investigador. El Director no reasignará hasta recepción, bloqueo o cierre documentado.

## Campañas posteriores

P0 inventario íntegro y reconciliación de las siete zonas históricas (basadas en `5cb6ccc`); P1 arquitectura y ownership; P2 journeys UI→Cloud→SQL→Telegram; P3 contratos, concurrencia y recuperación; P4 duplicaciones/legado y comprensibilidad; P5 falsación y deltas. Cada lote pequeño debe producir mapa y evidencia, no solo hallazgos.

## Registro

2026-11-20: HEAD comprobado; árbol Git recursivo no truncado, 1,459 blobs; sin informes nuevos registrados al preparar AUD-001. Los hallazgos históricos quedan como hipótesis hasta revalidación.
