# Visión del propietario — Context Management BeatGaler

> Este documento recoge la idea **tal como la formuló el propietario**. Las decisiones con su estado están en [DECISIONES.md](DECISIONES.md).

## Problema

"Mi objetivo es tener un plan para limpiar el código y poder arreglar bugs y añadir features muy fácil y rápido." Para eso, "la IA, cualquiera que tenga una tarea, pueda leer /beatgaler-arq y saber qué hacer", "no leer todo, pero leer algo pequeño y saber dónde encontrar el contexto que necesita".

## La idea: Context Management + «index» multidimensional

- **Contextos:** el conocimiento en sí (investigaciones, explicaciones, información del código, hallazgos, decisiones, ideas, planes, historia, preferencias, conceptos de producto). Pueden ser extensos; no hace falta reducir cada uno a una explicación breve.
- **«index»:** entre comillas a propósito. **No** es un índice convencional ni un `INDEX.md`. Es un sistema de navegación multidimensional entre conceptos, relaciones y contextos. Un conocimiento se relaciona con varios conceptos sin duplicarse, y se recorre en las dos direcciones. **El «index» dice dónde buscar y cómo se relaciona la información; los contextos tienen el conocimiento.**

## Dos mapas mentales multidimensionales, superpuestos y conectados

**Plano principal, el Programa:** cómo está organizado y conectado el código. Funcionalidades, sistemas y subsistemas, componentes compartidos, módulos, archivos relevantes, dependencias, APIs, PostgreSQL, flujos técnicos y relaciones. Su función es encontrar *qué parte del código investigar*. No explica todo.

**Plano secundario, el Conocimiento:** qué es BeatGaler, para qué existe y para quién; visión; V1, V2 y el futuro; ideas, propuestas, decisiones aprobadas y rechazadas; investigaciones y hallazgos; estado; historia; gustos, preferencias y motivos. Un concepto puede existir sin código (por ejemplo, Quick Packs V2).

**Lo que tienen en común:** los dos van de lo general a lo específico, admiten varios padres y relaciones cruzadas, y se navegan en las dos direcciones. Se conectan cuando hay una relación pertinente; no se exige que todo tenga su contraparte en el otro plano.

Usos de la navegación:
- **de arriba abajo**, para modificar o crear una funcionalidad;
- **de abajo arriba**, desde un archivo, para limpiar o refactorizar.

## Las cuatro ideas de origen

1. **Índice inteligente:** "un contexto puede estar en muchos lugares…, podríamos usar tags y se juntan con los que tienen similitud".
2. **Recreación conceptual:** "es como intentar recrear el programa en conceptos".
3. **Second Brain:** conservar y reutilizar lo investigado.
4. **IA experta en BeatGaler:** "en vez de que vea contexto, ella misma sea el contexto". Una fuente de conocimiento para otras IAs, no la programadora.

## Qué NO es

No pretende entender exhaustivamente el código ni reemplazar la investigación de la IA. Tampoco busca predecir todas las consecuencias, verificar todo de forma constante, explicar cada función, ser una representación perfecta ni convertirse en una infraestructura que cueste más mantener de lo que ahorra. **Orienta y reduce el espacio de búsqueda.**

## Cómo se construye

Progresivamente, cuando aparece la necesidad: conservar → organizar → recuperar → automatizar. Primero se guarda bien el conocimiento; la organización se diseña después, con material real. La visión de los dos planos **se mantiene**, aunque todavía no se implementa.
