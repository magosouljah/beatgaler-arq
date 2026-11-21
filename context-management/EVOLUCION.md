# Evolución de la idea (cronología)

Todo ocurrió el 2026-11-20, en dos conversaciones: un chat inicial (con traspaso documentado) y una sesión en Claude Code (IDE).

## Fase 0: origen (chat inicial)

- Contexto: las automatizaciones de `auditoria-v1` llevaban 7 auditorías parciales (AUD-001…007) sobre la rama `local/landing-gallery-unificada`. Ninguna prueba se ejecutó; la comprensión era parcial (C2 por tramos).
- Hallazgos de entonces:
  - R-001: recuperación de la membresía de Telegram.
  - H-002: comparador UTF-8.
  - R-002: debounce/sort.
  - R-003: guardas de Delete/bulk.
  - Propiedades positivas de AUD-007 (cursores HMAC, keyset).

  Están en [../auditoria-v1/HALLAZGOS.md](../auditoria-v1/HALLAZGOS.md).
- El propietario quería un plan de limpieza, pero **construido por él desde cero**. Surgieron las cuatro ideas (índice, mapa conceptual, Second Brain, IA experta).
- Decidió entonces:
  - encontrar *y* preservar lo aprendido;
  - la IA experta como fuente de conocimiento;
  - precisión antes que velocidad;
  - no exigir omnisciencia;
  - lo experimental no cambia lo oficial;
  - `main` = oficial;
  - conservar el historial, opcional al consultar;
  - guardar lo no verificado;
  - 3 niveles de certeza;
  - conservar las contradicciones hasta resolverlas;
  - no perder detalle;
  - los resúmenes, sin decidir;
  - preocupación mayor: los tokens.
- Regla de trabajo de esa fase: "tú no generes ninguna IDEA, yo la invento".

## Fase 1: sesión de preguntas sobre el momento (Claude Code)

Pregunta del propietario: ¿el sistema va antes o después de la limpieza y del cierre de V1?

Hecho verificado: la fusión a `main` ya había terminado (T25), y `main` era la única rama.

Lo que se acordó:
- V1 terminado = migración + legacy limpio + pendientes post-live.
- La limpieza sirve para arrancar V2.
- El sistema (el contenedor) es un proyecto que se termina; su contenido crece sin fin.
- Se borra el conocimiento de V1 que contamine.
- La "telaraña" (dónde está, cómo funciona, qué afecta) es el mínimo útil.
- Conclusión de entonces: **el sistema antes de la limpieza, probado con la limpieza**, con una **prueba trampa** para IAs débiles.
- El propietario revocó la regla de "solo preguntas" y pidió una propuesta.

## Fase 2: propuesta v0 y grafo

- Claude propuso una carpeta `conocimiento/` con un mapa, tags y fichas en `.md`.
- El propietario lo rechazó por limitado ("no quiero encerrarme a archivos .md… puede ser un programa o una base de datos"). Claude propuso entonces un grafo.
- El propietario **restableció su autoría**: dos mapas mentales multidimensionales (Programa y Conocimiento), todavía sin elegir tecnología.

## Fase 3: aclaraciones sucesivas

- Cobertura antes que profundidad: los 100 de 100.
- El conocimiento evoluciona desde el desarrollo; se oficializa en `main`.
- Unidad principal: funcionalidades y sistemas, y además los componentes compartidos.
- Conexiones relevantes más allá de los imports.
- Navegación en las dos direcciones (arriba abajo para features, abajo arriba para limpieza); todo archivo relevante tiene un lugar.

## Fase 4: arquitectura conceptual v1 (Claude, con autonomía)

- El propietario pidió avanzar de forma autónoma. → [historico/ARQUITECTURA-CONCEPTUAL-v1.md](historico/ARQUITECTURA-CONCEPTUAL-v1.md).
- Contenido:
  - un grafo con tipos de nodo y relación;
  - un extractor mecánico más el aporte de las IAs;
  - registros en el repo y un caché derivado;
  - CLI/MCP;
  - detección de desfase por SHA;
  - la prueba trampa.

## Fase 5: simplificación radical → v2 (Claude)

- El propietario: "estamos complicando demasiado… Context Management y un «index» multidimensional, así de simple". → [historico/ARQUITECTURA-SIMPLE-v2.md](historico/ARQUITECTURA-SIMPLE-v2.md).
- Contenido: `INDEX.md` de una línea por nodo, carpeta plana `contextos/`, grep.

## Fase 6: corrección y dirección actual (chat externo, traída por el propietario)

- **v2 no aprobada:** "yo jamás dije INDEX.md porque no es un MD, es un sistema". La simplicidad va en las responsabilidades, no en imponer un formato.
- Video del agente Alyx: memoria externa, recuperación selectiva y delegación. Se distingue organizar el conocimiento de dosificar el contexto que recibe una IA.
- Se dividió el problema en 5 responsabilidades (almacenamiento, organización, recuperación, actualización, entrega).
- Luego: **construir según la necesidad**, empezando por almacenar.
- Claude analizó qué debe resolver el almacenamiento: lo que no se puede reconstruir después es el original, la fuente, la fecha y SHA/rama, y la certeza. También identificó riesgos: fuentes que cambian, transcripciones que caducan, privacidad.
- **Decisión final del propietario:**
  - seguir guardando en `beatgaler-arq`, sin sistema nuevo y sin rescatar conversaciones;
  - siguiente operación: **investigar BeatGaler para diseñar el plan de limpieza**.

## Lección general

Las propuestas de las IAs tendieron dos veces a **sobreconstruir**: un grafo completo, y luego un formato impuesto. La dirección del propietario es mínima: conservar bien, aprender del material real y construir solo lo que una necesidad demuestre.
