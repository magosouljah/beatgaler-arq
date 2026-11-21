# AUD-010 — alcanzabilidad de INDEX en Web main (2026-11-20 20:30 CST)

**Fuente única:** `magosouljah/BeatGaler@ad8f8d0436bba5c3f663a301440ebf977200d953` (main). **Método:** lectura estática GitHub por SHA; sin ejecución, CI, producción ni cambios de código. **Asignación:** PLAN.md, dirección 20:00, AUD-010. PROTOCOLO enmienda v2.1 prevalece; directiva nueva sustituye referencia LOCAL.

## HECHO — flujo y responsabilidades

1. `src/app/WebGalleryEntry.tsx:1-20`: entrada de Gallery; `AuthExperienceGate` controla autenticación, carga anticipada de `WebGalleryWorkspace` con `import()` y `Suspense`. `accountReady` normaliza URL a Gallery; no elige INDEX.
2. `src/app/WebGalleryWorkspace.tsx:1-36`: lee cuenta activa, llama `useLibraryComposition`, pasa estado a `LibraryCompositionGate`. En rama catalog monta `CatalogGalleryWorkspace` con servicios PostgreSQL. En rama legacy entrega **solo** `LegacyRetired`, mensaje `data-catalog-mode="legacy-retired"`, sin importar App/pager INDEX. Error/bloqueo no invoca legacy.
3. `src/features/library/catalog/catalogComposition.ts:5-32`: `isCatalogClientEnabled` usa `VITE_CATALOG_API_ENABLED` con default **true**; únicamente cadena `false` (case insensitive) desactiva. `chooseLibraryComposition`: false → `legacy`; true → `api.resolveContext`; ready → catalog; otros → blocked. La etiqueta `legacy` en el tipo NO prueba alcanzabilidad de pipeline INDEX.
4. `src/features/library/catalog/catalogLibraryProvider.tsx:1-40,61-82,174-230`: el hook posee estado `resolving/resolved`, `servicesRef` y ciclo de vida por cuenta. Crea servicios catalog (query/interaction/playback/media/mutations/transfer), con Cloud para metadata y puerto Direct para bytes cuando capabilities.direct; `/context` determina autoridad antes de usar caché provisional; bloqueos invalidan caché en reset/quarantine; teardown en cambio/desmontaje. `enabled=false` devuelve modo legacy pero el workspace lo convierte en aviso, no en INDEX.
5. `src/features/library/catalog/LibraryCompositionGate.tsx:8-42`: `resolving` muestra espera; `legacy` renderiza prop legacy; `catalog` renderiza callback catalog; `blocked` muestra estado sin fallback. El componente es genérico: otro caller hipotético podría inyectar legacy real, pero **el caller examinado no lo hace**.

**Mapa textual:** `WebGalleryEntry` → auth → `WebGalleryWorkspace` → `useLibraryComposition` → flag → `chooseLibraryComposition` → `GET /catalog/v1/context` (via `CatalogApi.resolveContext`) → `LibraryCompositionGate` → catálogo PostgreSQL / estado bloqueado / aviso legacy retirado. El estado de cuenta lo posee auth; el de composición el hook; servicios de datos el provider; el gate solo presenta.

## Error y contraejemplos

- **Camino normal:** flag omitido → enabled=true; context ready + accountId → `createCatalogServices` y Gallery PostgreSQL.
- **Error:** rechazo de `resolveContext` capturado como `blocked/offline` por el hook; `BlockedState` informa, sin montar INDEX.
- **Contraejemplo al supuesto “flag false activa INDEX”:** false → mode legacy, pero `WebGalleryWorkspace` suministra `LegacyRetired` (no App/pager). Esto contradice comentarios históricos en `catalogLibraryProvider.tsx:1-5`, `WebGalleryWorkspace.tsx:6-12` y `LibraryCompositionGate.tsx:1-4` que aún describen legacy intacto/default off. El código ejecutable actual prevalece.
- **Contraejemplo al supuesto “INDEX eliminado completamente”:** sobreviven nombres de modo legacy, `parseLegacyBgPage` y comentarios; no demuestran camino INDEX operativo ni eliminación integral del repo.
- **Otro límite:** `chooseLibraryComposition` devuelve catalog con ready incluso sin accountId, pero el hook solo crea servicios cuando accountId existe; UI presenta preparación, no INDEX. La condición de autenticación efectiva depende del gate anterior.

## Cambio de rama y delta

Compare GitHub entre `b52649f04a1f7166763c7d26f40ac4b3337828c8` (último corte LOCAL investigado) y `ad8f8d0436bba5c3f663a301440ebf977200d953`: main **ahead 8**, 174 rutas afectadas según PLAN Director; las tres rutas principales del microlote no figuran en delta devuelto. No trasladar conclusiones históricas sin verificar: **en main** se ha leído el código y se observa default true y `LegacyRetired`. No se inspeccionó aquí el diff histórico exacto que introdujo cada cambio, ni se certifica todo el árbol.

## Hallazgos y clasificación

- **CONFIRMADO (estático):** el camino Gallery examinado no monta pipeline INDEX incluso con flag=false; default del flag es true. Es una propiedad del código @SHA, **no** verificación de bundle desplegado.
- **CONFIRMADO (mantenibilidad, severidad baja):** comentarios obsoletos contradictorios sobre default y disponibilidad de legacy en tres archivos. Pueden inducir mantenimiento incorrecto; no defecto funcional demostrado.
- **RIESGO / NO_VERIFICABLE:** rutas alternativas de entrada Web, imports dinámicos externos al tramo, Cloud INDEX, configuración de build/despliegue y comportamiento real. No afirmar eliminación completa.
- **Tests escritos:** no se inspeccionaron en este microlote; **PENDIENTE** localizar pruebas de composición/flag y comprobar expectativas default true y fail-closed. Ninguna prueba ejecutada.

## Cobertura propuesta y modificaciones futuras

`catalogComposition.ts`: **C2 parcial** (flag, resultados, mensajes); `WebGalleryEntry.tsx`: **C2 parcial** (auth/entry); `catalogLibraryProvider.tsx`: **C2 parcial** solo composición/ciclo de vida, no todos los servicios; `WebGalleryWorkspace.tsx` y `LibraryCompositionGate.tsx`: **C2 parcial** en routing/estado. **C3 no alcanzado**. Para cambiar flag/composición: `catalogComposition.ts`; cambiar qué se monta: `WebGalleryWorkspace.tsx` y `LibraryCompositionGate.tsx`; cambiar recuperación y ciclo de vida: `catalogLibraryProvider.tsx`; auth/precarga: `WebGalleryEntry.tsx`. Revisar tests y contratos antes de editar.

## PENDIENTE / próximos microlotes propuestos (NO asignados)

1. Cloud: localizar endpoints INDEX y comprobar montaje/alcanzabilidad real en main; no equiparar presencia de archivos con ruta viva.
2. Web: revisar otros entrypoints y tests escritos de flag, así como configuraciones de build.
3. Inventario panorámico del Director: reclasificar legacy, scripts, tests y DESIGN en main con denominador íntegro.

**Entrega:** mapa y cierre estático del tramo AUD-010 para revisión adversarial del Director; sin bug operativo confirmado. Solo este informe inmutable; no modificar registros canónicos.
