# AUD-001 — cierre de tramos y propuesta de división (Investigador, 2026-11-20 11:30 CST)

**Fuente:** `magosouljah/BeatGaler@4e66638051effe888e66a885010065d98fc7df17`, rama `local/landing-gallery-unificada`. HEAD remoto confirmado por lectura de Git ref. **Protocolo:** enmienda v2.1 vigente. **Asignación:** PLAN aún mantiene AUD-001 ASIGNADO; la directiva v2.1 exige al Director cerrarlo PARCIAL y asignar AUD-002. Este informe NO reasigna ni edita registros canónicos. **Método:** inspección estática exclusivamente; ningún test ejecutado.

## HECHO — microrrecorrido adicional: identidad de consulta, concurrencia y caché

1. `src/features/library/catalog/catalogApi.ts:223-227`: `filtersKey` serializa estado, búsqueda normalizada, modo, tags únicos ordenados y sort. El comparador `join(",") < join(",") ? -1 : 1` compara cadenas decimales, no bytes numéricos, y retorna 1 incluso cuando las cadenas son iguales. **CONFIRMADO estáticamente**: incumple contrato habitual de comparador (`compare(a,a) === 0`), pero **NO_VERIFICABLE** impacto en resultados, colisiones de clave o experiencia de usuario. La deduplicación previa con `Set` evita iguales exactos dentro de cada lista.
2. `src/features/library/catalog/catalogQueryStore.ts:95-113`: el store es dueño de `snapshot.queryKey`, generación, `AbortController`, `inflight`, bloques residentes y listeners. `:194-219`: `run` limita solicitudes simultáneas, descarta respuestas de generaciones antiguas, maneja 401, CURSOR_STALE y errores de red. `:222-231`: solo una recuperación automática de cursor obsoleto por generación. `:355-362`: `setQuery` evita recarga si la clave coincide y hay bloques; de otro modo publica filtros y pide primera página. `:371-405`: `notifyLibraryChanged` revalida páginas residentes sin vaciar de inmediato las tarjetas y repite si cambia la revisión.
3. `src/features/library/catalog/catalogLibraryProvider.tsx:185-205`: el provider verifica identidad de cuenta/autoridad antes de elegir caché; espera como máximo un período de gracia para copia local; al sembrar provisional llama revalidación, y ante bloqueo por reset/quarantine invalida caché. **NO_VERIFICABLE:** duración concreta del período de gracia y todos los escritores de IndexedDB (no inspeccionados aquí).

**Mapa textual de este tramo:**

`UI (callers aún no rastreados) → store.setQuery(filters,sort) → filtersKey → snapshot.queryKey → [bloques residentes: posible no-op / nueva consulta: loadFirst] → api.listBeats → Cloud/SQL (normalización pendiente) → applyFirst → listeners/UI`

`provider/context ready → identityOf(account,authority) → cache.pick(queryKey) → store.seedFirst(provisional) → store.revalidate → SQL → reemplazo de bloques`

`mutación/aviso → notifyLibraryChanged → refreshResident → api.listBeats → actualización de bloques`

**Ownership y puntos de cambio:** normalización y clave en `catalogApi.ts`; estado y control de solicitudes en `catalogQueryStore.ts`; identidad y ciclo de servicios/caché en `catalogLibraryProvider.tsx`. El servidor es autoridad del catálogo; caché cliente no es fuente durable de verdad.

## Evidencia y límites de hallazgos

- **H-002 — CONFIRMADO solo como defecto estático del comparador; impacto HIPÓTESIS.** Contraejemplo de orden numérico: bytes serializados `[2]` y `[10]` producen cadenas `"2"` y `"10"`, cuyo orden lexicográfico es inverso al numérico. No demuestra por sí solo colisión: una serialización JSON puede representar órdenes diferentes de manera diferente sin mezclar conjuntos distintos. Hace falta comprobar equivalencia y canonicalización en Cloud.
- **R-001 — RIESGO previamente documentado**, no reexaminado en este turno. No elevar a bug.
- **Sin bug operativo nuevo confirmado.** Pruebas escritas y consumidores UI no inspeccionados en este turno.

## Propuesta de cobertura (no certificada; decide Director)

- `catalogApi.ts:223-227`: C2 de tramo; C3 pendiente.
- `catalogQueryStore.ts:95-113,194-231,355-405`: C2 de tramos, no del archivo completo.
- `catalogLibraryProvider.tsx:185-205`: C2 de tramo; caché interna C1/C0 pendiente.
- F01 consulta/caché Gallery: C2 parcial estático; C3 pendiente. Sin porcentaje global.

## Cierre propuesto y microlotes separables

**AUD-001 PARCIAL recomendado**: arquitectura de arranque, contexto/provisión y consulta/caché documentada en ocho checkpoints anteriores más este informe; no equivale a cobertura C3 ni verificación runtime. El Director debe registrar cierre y nueva asignación según v2.1.

1. **AUD-002 propuesto:** callers UI reales de `setQuery`/`setSort`, cambios de filtros y preservación de reproducción/selección. Criterio: caller→store→render y un camino de error con pruebas escritas; 1–3 módulos principales.
2. **AUD-003 propuesto:** canonicalización de filtros en Cloud/SQL frente a `filtersKey`; falsar impacto de H-002 mediante ejemplos y pruebas existentes.
3. **AUD-004 propuesto:** UI de recuperación de membresía y alcanzabilidad de IMPORT/REPLACE/direct/session para R-001.

**PENDIENTE:** inventario global (carril del Director), callers UI, contrato SQL, tests aplicables, casos de error de cache persistente. **Checkpoint:** no abrir más informes agregados AUD-001 tras asignación nueva; seguir el único microlote que indique PLAN.