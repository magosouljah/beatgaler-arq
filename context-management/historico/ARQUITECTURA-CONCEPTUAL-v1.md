> **AVISO HISTÓRICO:** propuesta de Claude, **NO aprobada** por el propietario. Superada (ver [../DECISIONES.md](../DECISIONES.md) §7). Se conserva solo como antecedente y como opciones futuras.

# Sistema de Conocimiento BeatGaler — Arquitectura conceptual v1

**Fecha:** 2026-11-20 · **Estado:** propuesta para evaluar en conjunto. Nada implementado.
**Leyenda:** **[APROBADO]** decidido por el propietario · **[RECOMENDADO]** propuesta de Claude, con su justificación · **[PENDIENTE]** requiere una decisión del propietario.

---

## 0. Resumen

- El sistema son **dos planos**, el Programa y el Conocimiento. Cada uno es un **grafo de elementos y relaciones con nombre**: un elemento puede tener varios padres y se recorre en cualquier dirección.
- **Plano 1:** cubre el 100 % del código del alcance a nivel estructural. Ninguna funcionalidad se queda fuera, aunque tenga una descripción superficial.
- **Plano 2:** guarda el porqué, el estado del producto y lo que ya se investigó.
- Toda afirmación lleva su **certeza** (H/C/F), su **evidencia** y el **SHA** en que se verificó.
- **[RECOMENDADO]** Los hechos estructurales salen de un **extractor mecánico**. El significado lo escriben **las IAs**.
- **[RECOMENDADO]** La fuente de verdad son **registros de texto estructurado dentro del repo BeatGaler**, que viajan en la misma rama y commit que el código. Eso cumple tres reglas sin mecanismo extra:
  - "evoluciona con el desarrollo";
  - "`main` = oficial";
  - "historial conservado".

  La base de datos o el índice consultable es **derivada** y regenerable.
- La IA consulta con operaciones de **entrada, vecindad y localización**. La respuesta es una lista compacta de dónde investigar, no texto largo.
- **El sistema no reemplaza la lectura del código. Reduce dónde hay que leer.**

---

## 1. Lo ya decidido [APROBADO]

| Tema | Decisión |
|---|---|
| Propósito | Ninguna IA investiga desde cero lo que ya se sabe; el código sigue siendo la verdad técnica final |
| Planos | Dos mapas multidimensionales separados y conectados: Programa (principal) y Conocimiento (contexto) |
| Organización | De lo general a lo específico, con pertenencia múltiple; ninguna carpeta encierra un conocimiento |
| Unidad principal | Funcionalidades y sistemas. Los componentes compartidos (auth, sesión, almacenamiento) se navegan por separado |
| Cobertura | Todos los componentes relevantes, aunque sea de forma superficial. Cobertura antes que profundidad; lo desconocido se marca, no se inventa |
| Navegación | En las dos direcciones: de arriba abajo (modificar o crear) y de abajo arriba (limpiar o refactorizar). Todo archivo relevante tiene un lugar |
| Conexiones | Las relevantes para entender, no solo imports. Se navegan relaciones conocidas; no se exige descubrimiento automático |
| Plano 2 | Distingue idea, propuesta, decisión aprobada o rechazada y funcionalidad implementada. Un concepto puede existir sin código |
| Oficial | El conocimiento se crea y cambia desde que empieza el desarrollo; se vuelve oficial al integrarse a `main` |
| Historial | Se conserva. Se consulta bajo demanda, no en cada tarea |
| Certeza | Hipótesis / verificado en código / verificado en funcionamiento. Lo no verificado también se guarda |
| Contradicciones | Se conservan las dos hasta resolverlas; la más reciente no gana sola |
| Investigaciones | Se conservan completas sin obligar a leerlas. Los resúmenes **no** están decididos |
| Idea 4 | La IA experta es una fuente de conocimiento, no la programadora; no requiere fine-tuning |
| Prueba | Prueba trampa con una respuesta conocida, que debe pasar una IA débil (por ejemplo GPT-6) |

---

## 2. El modelo de conocimiento

### 2.1 El elemento, la unidad común a los dos planos

Cada elemento tiene:
- un **id estable**, que no es una ruta, para que sobreviva a renombres de archivos;
- su **plano** y su **tipo**;
- un **nombre** y una **descripción corta** (≤3 líneas);
- **tags**;
- un **estado**;
- **anclas**: rutas de archivo o símbolos de los que depende su verdad;
- **verificado@SHA**;
- su **certeza**.

La descripción corta **no es un resumen de una investigación**: es la definición del elemento. Por eso no choca con la decisión pendiente sobre resúmenes (sección 8).

### 2.2 Tipos del Plano 1 (Programa) [RECOMENDADO]

| Tipo | Ejemplo | Quién lo crea |
|---|---|---|
| Sistema | Web, Cloud, Worker, PostgreSQL, Telegram (externo) | IA, una vez |
| Funcionalidad | Reproducción, Subida (Direct B), Papelera/Purga, Filtros y orden, Tags | IA |
| Componente compartido | Autenticación, Sesión, Caché de portadas, Cliente de catálogo | IA |
| Módulo | `src/features/library/catalog` | Extractor (carpetas) más la IA |
| Archivo | `cloud-server/catalog/authority.js` | **Extractor** |
| Símbolo | `resolveContext`, solo si es relevante | IA, bajo demanda |
| Contrato | endpoint `GET /catalog/context`, tabla `vaults`, tipo de job, formato de cursor | **Extractor** más la IA |
| Flujo | Arranque → Gallery, Subida → verificación | IA |

Los **contratos** son el tipo que resuelve las conexiones invisibles: Web y Cloud no se importan entre sí, pero los dos se conectan al mismo nodo endpoint. Igual pasa con Cloud y el worker, que se conectan a la misma tabla o al mismo tipo de job.

### 2.3 Tipos del Plano 2 (Conocimiento) [RECOMENDADO]

Visión/Propósito · Versión (V1, V2) · Concepto de producto (Quick Packs) · Idea → Propuesta → Decisión (aprobada o rechazada) · Investigación (completa, inmutable) · Hallazgo/Riesgo · Preferencia del propietario · Evento histórico.

Estados del Plano 2: `IDEA · PROPUESTA · APROBADO · RECHAZADO · IMPLEMENTADO · RETIRADO`.
Estados del Plano 1: `ACTIVO · LEGACY · MUERTO · DESCONOCIDO`. Esto reutiliza la clasificación de `beatgaler-arq`.

### 2.4 Relaciones [RECOMENDADO]

Propongo un vocabulario pequeño y cerrado al inicio (unos 12 tipos), que solo se amplía con un motivo. Si cada IA inventa sus propios tipos de relación, el grafo deja de poder consultarse.

| Grupo | Relaciones |
|---|---|
| Pertenencia (da la multidimensionalidad) | `parte_de` (con varios padres permitidos) |
| Uso técnico | `usa`, `llama` (HTTP o RPC a un contrato), `lee` y `escribe` (tabla), `emite` y `consume` (job o evento), `habla_con` (servicio externo) |
| Contrato | `implementa` y `consume_contrato` |
| Prueba | `prueba_de` (el test cubre al elemento) |
| Entre planos | `realiza` (código → decisión o concepto), `investiga` (investigación → elemento), `afecta` (hallazgo → elemento) |
| Conocimiento | `contradice`, `reemplaza`, `verifica` |

Cada relación lleva su propia **certeza, evidencia y SHA**. Una relación también es una afirmación.

### 2.5 Afirmaciones y contradicciones

Lo que no es estructural (por ejemplo "si falla la membresía después del COMMIT, el GET no reprovisiona") se guarda como **afirmación** ligada a uno o varios elementos, con su certeza y su evidencia. Así se cumplen tus reglas:
- Las contradicciones son **dos afirmaciones unidas por `contradice`**. Ninguna se borra.
- Una afirmación se marca como **resuelta** cuando otra afirmación de mayor certeza queda unida a ella por `reemplaza`.

### 2.6 Ambigüedad: una funcionalidad que existe en los dos planos [RECOMENDADO, sigue abierta]

Recomiendo **dos elementos unidos por `realiza`**: el concepto de producto en el Plano 2 y la funcionalidad técnica en el Plano 1.

- El ciclo de vida del concepto (idea → aprobado → implementado) es distinto del estado del código (activo → legacy). Si se mezclan en un solo nodo, se confunden intención y realidad, que es justo lo que pediste evitar.
- Es fácil de recorrer: un salto.
- Quick Packs V2 queda como un concepto sin relación `realiza` hasta que exista código.

---

## 3. Cobertura

### 3.1 El universo del Plano 1 [RECOMENDADO]

| Entra | Cómo |
|---|---|
| `src/` y `cloud-server/` (sin tests) | Archivo con lugar obligatorio |
| `cloud-server/migrations/` | Archivo, y además nodos de tabla derivados |
| Workflows de despliegue y CI vigentes, `deploy/` | Archivo, bajo el sistema "Operación" |
| `scripts/` usados en la operación o el Lab | Archivo; el resto se marca `MUERTO` o `DESCONOCIDO` |
| Tests | Se enlazan con `prueba_de`; **no cuentan** para el 100 % |
| Desktop/Tauri | Solo sus fronteras con Web |
| `docs/`, `beatgaler-arq` | **No** son Plano 1: son fuentes del Plano 2 |

Justificación: así el 100 % mide el código que se ejecuta, no el ruido. Los tests aportan valor como evidencia, no como componentes.

### 3.2 Dos métricas separadas [RECOMENDADO]

1. **Cobertura estructural**, con meta del 100 %: todo archivo del universo tiene al menos una relación `parte_de` hacia una funcionalidad, un sistema o un componente compartido, o está marcado a propósito como `DESCONOCIDO`, `MUERTO` o infraestructura. Se comprueba **mecánicamente**.
2. **Profundidad de comprensión**: la escala C0–C3 de `beatgaler-arq`, por elemento. No tiene meta global y crece por tarea.

Esto concreta tu idea de los 100 de 100: la métrica 1 llega al 100 % muy pronto; la 2 crece solo donde hace falta.

---

## 4. Cómo se genera el contenido [RECOMENDADO, tú lo habías dejado abierto]

| Capa | Qué produce | Certeza | Por qué |
|---|---|---|---|
| **Extractor mecánico** | archivos, módulos, imports, exports, rutas Express, URLs `fetch` del cliente, tablas y columnas de las migraciones, tipos de job | "verificado en código (mecánico)" a un SHA | Es exacto, barato y se regenera sin esfuerzo. Una IA que copia rutas a mano es más lenta y comete más errores |
| **IAs** | funcionalidades, pertenencia de archivos a funcionalidades, flujos, contratos semánticos, afirmaciones, todo el Plano 2 | la que corresponda (H/C/F) | Es significado: ninguna herramienta lo infiere con precisión |

**Por qué no es complejidad innecesaria:** sin extractor, la cobertura del 100 % y la detección de desfase estructural dependen de la disciplina de las IAs. Con extractor son verificables. El extractor no decide significado.

**Alternativa descartada:** extracción semántica automática con LLM, al estilo GraphRAG. Produce relaciones plausibles pero no verificadas a gran escala, lo que contradice tu prioridad de precisión y tu decisión de navegar relaciones conocidas.

---

## 5. Ciclo de vida y sincronización

### 5.1 El conocimiento viaja con el código [RECOMENDADO]

- Los cambios al conocimiento van **en la misma rama y en los mismos commits** que el código. Así:
  - el conocimiento de una rama es experimental por definición;
  - el merge a `main` lo vuelve oficial;
  - una rama abandonada no contamina nada;
  - el historial queda en git.
- **Tarea terminada = código y mapa actualizados.** La IA que cambia el código registra el desfase de significado, que nadie más puede detectar (sección 5.2).
- **Dos ramas en paralelo** que cambian el mismo nodo generan un conflicto de merge igual que con el código. Esto exige un formato que se pueda fusionar (sección 6).

### 5.2 Detección de desfase

| Tipo | Detección |
|---|---|
| Estructural (un archivo nuevo, movido o borrado, imports nuevos) | Automática: el extractor compara el código con el mapa |
| De significado (el mismo archivo hace otra cosa) | **No es detectable.** Mitigación: cada nodo tiene anclas y `verificado@SHA`. Si un ancla cambió después de ese SHA, el nodo se muestra como **"posiblemente desactualizado"** y la IA sabe que debe verificarlo en el código antes de confiar |

Esa marca es la que protege la precisión: el mapa nunca afirma con confianza algo cuyo código cambió desde que se verificó.

### 5.3 Historial

En el Plano 1, el historial es la historia git de los registros, sin mecanismo nuevo. En el Plano 2, los elementos retirados o reemplazados se conservan con estado `RETIRADO` o con la relación `reemplaza`, y la consulta normal los oculta. Borrarlos, como planeas con el conocimiento legacy de V1, es un acto explícito tuyo.

---

## 6. Almacenamiento: alternativas comparadas

| Opción | Evoluciona con el desarrollo | `main` = oficial | Fusionable entre ramas | Consultable como grafo | Complejidad |
|---|---|---|---|---|---|
| A. Solo Markdown | sí | sí | sí | **no** (texto suelto) | baja |
| **B. Registros estructurados (un archivo por elemento) en el repo + índice derivado** | **sí** | **sí** | **sí** | **sí** (a través del índice) | media |
| C. Base de grafos (Neo4j, Kuzu…) como fuente | no (aparte de git) | hay que construirlo | no | sí | alta |
| D. SQLite versionado en git | sí | sí | **no** (binario) | sí | media |
| E. Repo aparte (`beatgaler-arq`) | **no**: sus ramas no siguen a las del código | hay que construir la sincronización | sí | depende | media-alta |

**[RECOMENDADO] B, dentro del repo BeatGaler.** No es una preferencia de ubicación: **se deduce de tus propias reglas**. Para que el conocimiento acompañe al desarrollo y se vuelva oficial con el mismo merge, tiene que estar en la misma rama que el código. Las opciones C y E obligan a construir y mantener una sincronización artificial entre dos historias. La base de datos sigue existiendo, pero como **caché local derivado** (regenerable y fuera de git), para que las consultas sean rápidas.

El formato exacto del registro (YAML, JSON, Markdown con cabecera estructurada) es una decisión menor que se toma al implementar. El requisito es que sea **texto que se pueda fusionar y comparar, con campos definidos**.

---

## 7. Consulta

### 7.1 Operaciones (independientes de la interfaz) [RECOMENDADO]

1. **Entrar por**: concepto, archivo, tag, texto o error.
2. **Vecindad**: los elementos a N saltos, filtrados por plano, tipo de relación y certeza mínima.
3. **Localizar**: "¿dónde investigo para esta tarea?" devuelve las funcionalidades implicadas, los archivos ancla, los contratos que cruzan fronteras, los riesgos conocidos y las investigaciones previas. Cada uno va con una línea de descripción y su estado de frescura.
4. **Impacto conocido**: lo que *está registrado* como afectado por X. No es una predicción.
5. **Historial**, solo bajo demanda: versiones anteriores de un elemento o una afirmación.

Presupuesto de salida: una respuesta típica en **≤1.000 tokens**. El detalle se pide explícitamente.

### 7.2 Interfaz [RECOMENDADO]

1. Un **mapa de entrada generado**: un texto de unos 1.500 tokens con los sistemas y las funcionalidades, para cualquier IA, incluso sin herramientas.
2. Una **CLI** de consulta. Funciona en cualquier IA con terminal, incluida GPT-6 en otra herramienta, y es lo que mide la prueba trampa.
3. **MCP**, más adelante, como envoltorio de la misma CLI.

---

## 8. Resúmenes [PENDIENTE, sin cambio]

El modelo no los necesita para funcionar:
- **Elemento:** su descripción de ≤3 líneas, obligatoria, que es una definición.
- **Afirmaciones:** son atómicas.
- **Investigaciones:** se conservan completas e inmutables, unidas con `investiga` a los elementos que tocan.

Si decides tener resúmenes de investigaciones, encajan como un campo opcional de la investigación. Quién los escribe sigue pendiente (A: la IA investigadora; B: una revisora).

---

## 9. Correspondencia con tus cuatro ideas

| Idea | Dónde vive en el modelo |
|---|---|
| 1. Índice multidimensional | Pertenencia múltiple (`parte_de`), tags y relaciones con nombre. La operación "entrar por cualquier cosa" |
| 2. Recreación conceptual | El Plano 1 completo |
| 3. Second Brain | El Plano 2: investigaciones, afirmaciones, decisiones, preferencias e historia |
| 4. IA experta | No es un componente nuevo: es **una IA más la CLI más lectura de código**, con una instrucción de rol "consultor". Se construye **después** de que el sistema pase la prueba trampa [RECOMENDADO] |

Las cuatro ideas no salen como cuatro sistemas. Salen como **un modelo** visto desde cuatro ángulos.

---

## 10. Reutilizar `beatgaler-arq` [RECOMENDADO]

| Fuente | Entra como | Certeza inicial |
|---|---|---|
| `pasada-1/zonas/01–07` | Candidatos a sistemas o funcionalidades del Plano 1 | H (son anteriores a la limpieza de INDEX) |
| `auditoria-v1/runs/AUD-001…011` | Investigaciones, unidas a los elementos que analizan | Lo que dicen, **a su SHA viejo** → aparecen como "posiblemente desactualizado" de forma automática |
| `HALLAZGOS.md` (R-001, H-002, R-002, R-003…) | Hallazgos con su estado (RIESGO, HIPÓTESIS…) | Tal como están |
| `MAPA-CODIGO`, `FLUJOS` | Afirmaciones y flujos | C@SHA viejo, que hay que revalidar |
| `borradores/GLOSARIO-borrador.md` | Conceptos del Plano 2 | H |

Nada se pierde y nada se presenta como vigente sin revalidar.

Las automatizaciones Director e Investigador podrían reorientarse después para llenar el mapa en lugar de escribir prosa aparte. Eso es una decisión tuya (sección 13).

---

## 11. Arranque (orden lógico, sin fechas)

1. Fijar el universo (sección 3.1) y el vocabulario (secciones 2.2–2.4).
2. Extractor → esqueleto del Plano 1, con **100 % estructural en C0**, mecánico y sobre `main`.
3. Una pasada de IA: asignar cada archivo a funcionalidades y sistemas con certeza H. Es la primera cobertura completa y superficial que pediste.
4. Importar `beatgaler-arq` (sección 10).
5. Prueba trampa (sección 12).
6. Si pasa, la limpieza de V1 usa el sistema y lo profundiza por tarea.

---

## 12. Prueba trampa (diseño inicial) [RECOMENDADO]

- **Material:** 2 o 3 tareas con **respuesta conocida y verificada por nosotros en el código de `main`**, cada una con un efecto escondido. Candidatas:
  - R-003: las guardas de Delete/bulk no están donde se esperan.
  - R-002: el debounce captura el `sort` viejo.
  - una tarea que cruce Web → Cloud → SQL a través de un contrato.
- **Sujeto:** una IA débil (GPT-6) sin contexto previo, que solo tiene el mapa de entrada, la CLI y el repo.
- **Medición:**
  1. ¿Llegó a los archivos correctos?
  2. ¿Cuántos tokens o archivos leyó antes de orientarse? Se compara contra la misma tarea sin el sistema.
  3. ¿Mencionó el efecto escondido?
- **Pasa** si acierta en (1) y (3), con una reducción clara en (2). Cada fallo se convierte en un hueco del mapa que se corrige.

---

## 13. Riesgos y límites

| Riesgo | Mitigación | Riesgo residual |
|---|---|---|
| Desfase de significado no registrado | Obligación por tarea y marca de "posiblemente desactualizado" por SHA | **Real.** Depende de que la IA cumpla; el sistema solo avisa |
| Una IA escribe relaciones falsas con confianza | Certeza, evidencia y SHA obligatorios; H por defecto | Medio: una H incorrecta puede orientar mal, aunque se presenta como H |
| Sobremodelado (demasiados tipos o nodos) | Vocabulario cerrado; los símbolos solo bajo demanda | Bajo |
| Ruido de las relaciones mecánicas (miles de imports) | Ocultas por defecto, visibles bajo pedido | Bajo |
| Conflictos de conocimiento entre ramas paralelas | Formato fusionable: se resuelven como el código | Bajo |
| Costo del arranque (pasada de IA sobre unos 418 archivos) | Una sola vez y superficial. Se puede repartir | Costo único medio |
| La IA ignora el sistema | La prueba trampa lo mide; `AGENTS.md` y `CLAUDE.md` apuntan al mapa de entrada | Medio |
| Dependencia de una CLI propia | El mapa de entrada funciona sin ella | Bajo |

**Límite que no cambia:** el sistema no puede garantizar los impactos indirectos no registrados. Promete *lo conocido, con su certeza*, nada más. Esto concuerda con tu decisión 3.4.

---

## 14. Decisiones que te tocan

Se presentan juntas, como pediste:

1. **Ubicación:** ¿aceptas que la fuente de verdad viva en el repo BeatGaler (sección 6)? Se deduce de tus reglas. Si prefieres otro lugar, hay que renunciar a que el conocimiento siga a las ramas, o construir una sincronización.
2. **Generación híbrida** (sección 4): ¿extractor para la estructura e IA para el significado?
3. **Una funcionalidad en los dos planos** (sección 2.6): ¿dos elementos unidos por `realiza`?
4. **Resúmenes de investigaciones** (sección 8): siguen abiertos. El modelo no los requiere.
5. **IA experta** (sección 9): ¿después de la prueba trampa?
6. **Automatizaciones de `beatgaler-arq`**: ¿se reorientan a llenar el mapa una vez que exista?

Lo demás (tipos, relaciones, universo, métricas, operaciones e interfaz) es recomendación técnica. Se puede ajustar sin redefinir tu visión.
