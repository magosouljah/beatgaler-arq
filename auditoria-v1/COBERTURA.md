# Cobertura verificable (propiedad del Director)

**Cobertura actual certificada por el nuevo protocolo:** NO ESTABLECIDA. Nunca interpretar eso como 0% de código leído históricamente; solo que aún no hay inventario verificado para esta campaña.

C0: inventariado. C1: contenido leído. C2: responsabilidades, entrypoints, interfaces, dependencias y ownership descritos. C3: contratos, escenarios de fallo y evidencias contrastados; distinguir comprobación estática de runtime. Cobertura de flujos se sigue aparte. Cada subida de nivel debe incluir commit SHA, informe y fundamento; contabilizar archivos de alcance real, no assets o Desktop.

| Sistema/módulo o flujo | Archivos de alcance | Nivel | SHA | Evidencia | Huecos |
|---|---:|---|---|---|---|
| Pendiente de inventario | — | Sin certificar | — | — | Clasificación exhaustiva |

## AUD-001 — Certificación parcial @ 4e66638051effe888e66a885010065d98fc7df17
| Elemento | Nivel | Evidencia y límite |
|---|---|---|
| `src/features/library/catalog/catalogComposition.ts` | C2 estático | Código leído por Director: flag, tres modos y mensajes de bloqueo; no pruebas ejecutadas |
| `src/app/WebGalleryWorkspace.tsx` | C2 estático | Código leído por Director: montaje por identidad, composición y lazy legacy; runtime no verificado |
| `src/features/library/catalog/LibraryCompositionGate.tsx` | C2 estático | Código leído por Director: estados resolving/legacy/catalog/blocked y ausencia de fallback a INDEX en blocked |
| `src/features/library/catalog/catalogApi.ts` | C1 parcial | Tipos y cabecera inspeccionados; contratos de red completos pendientes |
| F01 arranque→Gallery | C2 parcial | [Informe AUD-001](runs/20261120T0330-investigador-AUD-001.md) + contraste de tres módulos; Cloud/SQL pendiente |

Resto de propuestas C2 del Investigador **no certificadas** todavía: se requiere contraste primario de archivos. No se calculan porcentajes sin inventario de alcance completo. Ningún C3 concedido.
