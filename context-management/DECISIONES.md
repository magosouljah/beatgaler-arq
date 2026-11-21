# Registro de decisiones — Context Management BeatGaler

**Estados:** **APROBADO** (lo decidió el propietario) · **RECOMENDADO** (lo propuso una IA y el propietario no lo aprobó) · **SUPERADO** (estuvo aprobado o planteado y lo reemplazó una decisión posterior) · **DESCARTADO/APLAZADO** · **PENDIENTE**.
Las citas del propietario se transcriben tal como las escribió.

---

## 1. Propósito y alcance

| # | Decisión | Estado | Por qué / fuente |
|---|---|---|---|
| P1 | Que cualquier IA con una tarea encuentre rápido el contexto pertinente y **nunca investigue desde cero lo que ya se sabe** | APROBADO | "No busco una IA que nunca necesite investigar. Busco que nunca tenga que investigar desde cero algo que ya sabemos" |
| P2 | **El sistema orienta; la IA investiga.** No reemplaza el razonamiento, la lectura de código ni la verificación | APROBADO | Corrección expresa. El código es la verdad técnica final |
| P3 | El sistema **no** necesita entender todo el código, explicar cada función, predecir todos los impactos, descubrir relaciones ocultas ni mantener un conocimiento perfecto | APROBADO | "Creo que sería exagerado esperar que pudiera hacer eso" (sobre los impactos indirectos) |
| P4 | Precisión antes que velocidad; la IA puede consultar el código para verificar | APROBADO | Eligió "B = precisión" |
| P5 | Gastar pocos tokens es una prioridad importante | APROBADO | Ante tokens frente a pérdida de detalle: "Me preocupa más A" (tokens) |
| P6 | Simplicidad: nada de mecanismos sofisticados sin una mejora real; la simplicidad está en las responsabilidades, no en imponer un formato | APROBADO | Corrección del 2026-11-20 sobre la v2 |
| P7 | Las decisiones de arquitectura las toma el propietario. La IA ayuda con preguntas, límites y contradicciones | APROBADO (vigente) | La regla original ("yo invento, tú preguntas") se revocó a mitad del diseño; luego el propietario la restableció: "Yo quiero ser quien invente y decida las soluciones" |

## 2. Modelo conceptual (la visión)

| # | Decisión | Estado |
|---|---|---|
| M1 | **Context Management** (guardar, organizar, conservar y recuperar contextos de cualquier tamaño) más un **«index» multidimensional** que lleva a esos contextos | APROBADO como visión; **sin implementar** |
| M2 | El «index» **no es un archivo `.md` ni un índice convencional** de archivos o palabras clave. Es un *sistema*: puede ser un programa, una base de datos, un grafo, archivos estructurados o una combinación | APROBADO. "Yo jamás dije INDEX.md porque no es un MD, es un sistema" |
| M3 | **Dos planos**, separados y conectados entre sí. **Programa** (principal): funcionalidades, sistemas, componentes compartidos, módulos, archivos relevantes, APIs, PostgreSQL, flujos y relaciones. **Conocimiento** (secundario): qué es BeatGaler, para quién, visión, V1/V2, ideas, propuestas, decisiones aprobadas y rechazadas, investigaciones, hallazgos, estado, historia, preferencias y motivos | APROBADO como visión |
| M4 | Cada plano va de lo general a lo específico, **pero no es un árbol**: un elemento puede tener varios padres, relaciones cruzadas y navegarse en las dos direcciones, sin duplicarse | APROBADO |
| M5 | Para investigar código manda el Plano Programa; el plano Conocimiento aporta contexto e intención. No todo concepto necesita código: Quick Packs V2 puede existir sin implementación | APROBADO |
| M6 | El plano Conocimiento distingue **idea, propuesta, decisión aprobada o rechazada y funcionalidad implementada**. No confunde intenciones con hechos | APROBADO |
| M7 | Multidimensional significa **navegar relaciones conocidas** y registrar las nuevas al investigarlas. No exige descubrimiento automático | APROBADO |
| M8 | La unidad principal del Plano Programa son **las funcionalidades y los sistemas**, no los archivos. Los componentes compartidos (auth, sesión, almacenamiento) se navegan por separado | APROBADO |
| M9 | **Cobertura antes que profundidad:** representar los 100 de 100 componentes aunque sea superficialmente. De cada uno: dónde está, qué hace a grandes rasgos, con qué se conecta y dónde encaja. Lo desconocido se marca, no se inventa | APROBADO |
| M10 | Navegación en las dos direcciones: de arriba abajo (modificar o crear una funcionalidad) y de abajo arriba (desde archivos, para limpiar o refactorizar). Todo archivo relevante tiene un lugar identificable | APROBADO |
| M11 | Las conexiones que cuentan son las relevantes para entender, no solo los imports (HTTP, SQL, Telegram, contratos). No hay una lista cerrada de tipos | APROBADO; la lista de tipos está PENDIENTE |
| M12 | ¿Una funcionalidad que existe en los dos planos es un elemento o dos elementos conectados? | PENDIENTE (Claude recomendó dos, unidos por "realiza"; no aprobado) |
| M13 | El nivel exacto en que se mide el 100 % de cobertura | PENDIENTE |

## 3. Reglas del conocimiento

| # | Decisión | Estado |
|---|---|---|
| R1 | `main` es la versión oficial del código. Un cambio se vuelve oficial cuando se integra a `main` ("Cuando el integral, amén, sí"); el propietario lo aprueba de forma indirecta ("probablemente yo indirectamente") | APROBADO |
| R2 | El conocimiento **se crea y cambia desde que empieza el desarrollo**, no solo después del merge. Crear el conocimiento y oficializarlo son dos momentos distintos | APROBADO (corrige una interpretación anterior de Claude) |
| R3 | Lo experimental no debe confundirse con lo oficial ni reemplazarlo | APROBADO; el mecanismo está PENDIENTE |
| R4 | El historial se conserva. Se consulta bajo demanda (por ejemplo, ante regresiones), no en cada tarea | APROBADO |
| R5 | Se puede guardar conocimiento sin verificar, marcado como tal | APROBADO |
| R6 | Tres niveles de certeza: **hipótesis / verificado en código / verificado en funcionamiento**. Que algo esté verificado en código no prueba cómo se comporta en ejecución | APROBADO ("los 3 están bien solo es información no complicada") |
| R7 | Las contradicciones se conservan las dos **hasta resolverlas**; la más reciente no gana sola | APROBADO |
| R8 | No se pierden detalles: las investigaciones se conservan completas, sin obligar a leerlas | APROBADO |
| R9 | Los resúmenes y quién los escribe (A: la IA investigadora; B: una revisora) | PENDIENTE: "todavía no estoy seguro si queremos hacer el resumen" |
| R10 | Al almacenar se conserva, cuando aplica: **el contenido original completo, la fuente, la fecha o versión y la referencia al código** (SHA y rama), más la certeza | APROBADO |
| R11 | Borrar el conocimiento del código legacy de V1 cuando el propietario esté seguro de que ya no sirve y solo contamina | APROBADO (decisión del propietario sobre su propio material) |

## 4. Las cuatro ideas originales (siguen siendo ideas, no tecnologías)

| Idea | Estado |
|---|---|
| 1. Índice multidimensional: una pieza se encuentra desde varios conceptos; al inicio se pensó en tags y similitud | Viva, incorporada en M1–M4 |
| 2. Recreación conceptual del programa ("recrear el programa en conceptos") | Viva, es el Plano Programa |
| 3. Second Brain (antecedentes conceptuales: Building a Second Brain, Zettelkasten, Aider repo map, GraphRAG; **ninguno elegido como tecnología**) | Viva, es el plano Conocimiento y el Context Management |
| 4. IA experta en BeatGaler: **fuente de conocimiento para otras IAs**, no la programadora. "Que conozca BeatGaler a fondo" (opción A), sin reentrenar sus pesos en cada descubrimiento. No requiere fine-tuning | Viva. **Cuándo y cómo construirla: PENDIENTE** |

No se fusionaron como cuatro sistemas ni se eligió una ganadora.

## 5. Almacenamiento y construcción

| # | Decisión | Estado |
|---|---|---|
| A1 | Las investigaciones se siguen guardando en **`beatgaler-arq`** | APROBADO 2026-11-20 |
| A2 | Por ahora no hay sistema nuevo, ni base de datos, ni importación de conversaciones o rescate de transcripciones | APROBADO 2026-11-20 |
| A3 | **Construcción progresiva:** conservar → organizar → recuperar → automatizar, a medida que aparezcan necesidades reales | APROBADO como dirección conceptual (no es un plan detallado) |
| A4 | Las cinco responsabilidades posibles: almacenamiento, organización e indexación, recuperación, actualización, entrega de contexto. Sirven para estudiar el problema por partes; **no** son cinco módulos obligatorios | APROBADO como marco de análisis |
| A5 | Organizar el conocimiento y administrar cuánto conocimiento recibe una IA son problemas distintos y no tienen por qué resolverse con el mismo mecanismo | APROBADO (lección del video de Alyx) |
| A6 | Del video de Alyx (un agente que se saturaba con su propio contexto): **memoria externa, recuperación selectiva y delegación** se reconocen como conceptos pertinentes. **No** se copian el truncamiento de 100 caracteres ni los subagentes | APROBADO como aprendizaje; sus mecanismos no se aprobaron |
| A7 | Ubicación definitiva del sistema futuro (repo BeatGaler, `beatgaler-arq` u otro) | PENDIENTE. Claude argumentó que si el conocimiento debe seguir a las ramas del código, convendría que viva en el repo de BeatGaler; el propietario no lo aprobó: "no me importa si es independiente o integrado, me importa que cumpla su función" |

## 6. Siguiente operación

| # | Decisión | Estado |
|---|---|---|
| S1 | **Investigar BeatGaler** lo suficiente para diseñar un plan de limpieza y mejora de la arquitectura: sistemas, responsabilidades, flujos, activo frente a obsoleto, duplicaciones, riesgos y oportunidades de simplificar. Saber **qué limpiar, por qué y en qué orden** | APROBADO 2026-11-20 |
| S2 | Solo investigar y documentar. No modificar el código ni iniciar la limpieza | APROBADO |
| S3 | Las automatizaciones Director e Investigador pueden seguir contribuyendo (el propietario las movió para auditar `main`) | APROBADO |
| S4 | Plan de limpieza | PENDIENTE: se diseña después de la investigación |

## 7. Superado (se conserva para no repetirlo)

| Lo que se decidió o planteó | Qué lo reemplazó |
|---|---|
| (Sesión de preguntas del 2026-11-20) "El sistema va **antes** de la limpieza y se prueba con la limpieza", con una **prueba trampa** que una IA débil (por ejemplo GPT-6) debe pasar | Construcción progresiva (A3): ahora primero se investiga y se conserva, y el sistema crece según la necesidad. La **idea de la prueba trampa** no se descartó: sirve como criterio futuro para evaluar la recuperación |
| `beatgaler-arq` = "solo material de consulta, fuera del sistema" (respuesta B en la sesión de preguntas) | A1: `beatgaler-arq` es ahora el lugar donde se guardan las investigaciones |
| "V1 terminado = migración cerrada + legacy limpio + pendientes post-live"; "la limpieza es para iniciar V2 con código limpio" | **Sigue vigente como objetivo de producto**, pero ya no determina el orden de construcción del sistema |
| Propuesta v1 de Claude: grafo completo con extractor mecánico, CLI/MCP, caché y métricas C0–C3 | El propietario la juzgó demasiado compleja ("estamos complicando demasiado") → v2 |
| Propuesta v2 de Claude: `INDEX.md` + `contextos/` con grep | **Rechazada como forma:** "no es un MD, es un sistema". Se conserva solo como antecedente → dirección actual |

## 8. Descartado o aplazado

- **Entrenar o fine-tunear un modelo:** no se concluyó que haga falta. Entrenar no garantiza recordar el código con exactitud ni actualizarse con cada commit. Aplazado.
- **Base de datos de grafos desde el principio:** no se asume. Solo se evaluará si una necesidad real lo pide.
- **Extractor mecánico, CLI, MCP, caché:** aplazados. Las propuestas de Claude se conservan en `historico/` como opciones futuras.
- **Rescatar transcripciones de sesiones y chats con Sol:** fuera de alcance por ahora (A2). *Riesgo conocido:* Claude Code borra las transcripciones viejas de forma automática (por defecto, unos 30 días) y en el proyecto había unas 30. El propietario decidió no rescatarlas por ahora.

## 9. Pendiente (no resolver por implicación)

- Tecnología del almacenamiento futuro y del «index».
- Ubicación definitiva y relación con las ramas y `main` (cómo se versiona lo experimental).
- Unidad de contexto.
- Tipos de relaciones y de nodos.
- Cómo consultan las IAs.
- Qué es manual y qué se automatiza.
- Papel de los subagentes.
- La IA experta.
- Los resúmenes.
- Cómo se incorpora el conocimiento existente al sistema futuro.
- Una funcionalidad en los dos planos (M12) y el nivel de cobertura (M13).
- Qué cuenta como archivo "relevante" (tests, migraciones, scripts, CI, Desktop).
- Quién o qué detecta que el mapa del programa dejó de ser cierto cuando el código cambia (desfase estructural frente a desfase de significado), planteado por Claude.
- Cómo medir que una IA se orienta mejor gracias al sistema.
