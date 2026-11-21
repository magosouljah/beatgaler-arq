# Context Management BeatGaler — punto de entrada

**Última actualización:** 2026-11-20 (hora de Ciudad de México) · **Propietario de las decisiones:** Purp (propietario de BeatGaler).
**Si eres una IA que retoma este trabajo, lee este archivo completo (unos 2 minutos). Los demás, solo si los necesitas.**

---

## Dirección vigente (APROBADA por el propietario, 2026-11-20)

1. **Almacenamiento:** las investigaciones se siguen guardando en este repositorio (`beatgaler-arq`). Por ahora **no** se construye un sistema nuevo, ni una base de datos, ni se importan conversaciones o transcripciones.
2. **Lo que se conserva:** las investigaciones completas, con fuente, fecha, referencia al commit (SHA y rama) y nivel de certeza cuando corresponda. No se pierden detalles.
3. **Construcción progresiva:** se avanza solo cuando aparece una necesidad real.
   1. **Conservar** las investigaciones ← *etapa actual*
   2. **Organizar**, cuando haya suficiente material
   3. **Recuperar** el contexto pertinente: aquí entra el «index» multidimensional
   4. **Automatizar y optimizar** solo lo que lo necesite
4. **Visión futura, que se conserva sin implementar:** Context Management más un **«index» multidimensional**. No es necesariamente un archivo Markdown; es un *sistema* de navegación hacia los contextos. Tiene **dos planos conectados**: Programa (principal) y Conocimiento (secundario). Se detalla en [VISION.md](VISION.md).

## Etapa actual y siguiente objetivo

**Siguiente operación: investigar BeatGaler** hasta entenderlo lo suficiente para diseñar un **plan de limpieza y mejora de la arquitectura**. Hay que comprender:
- los sistemas, módulos y funcionalidades;
- sus responsabilidades y relaciones;
- los flujos principales;
- qué código está activo y cuál es obsoleto;
- las duplicaciones y la complejidad innecesaria;
- los riesgos arquitectónicos;
- las oportunidades de simplificar.

La prioridad **no** es acumular bugs, sino saber **qué limpiar, por qué y en qué orden**.

- Solo se investiga y se documenta. **No** se modifica el código ni empieza la limpieza.
- Las automatizaciones Director e Investigador ([auditoria-v1/](../auditoria-v1/PROTOCOLO.md)) pueden seguir contribuyendo. El propietario las movió para que auditen `main`.

## Mapa de documentos

| Documento | Para qué sirve |
|---|---|
| [DECISIONES.md](DECISIONES.md) | Registro completo: **aprobado**, **recomendado (sin aprobar)**, **superado**, **descartado o aplazado** y **pendiente**, con el porqué |
| [VISION.md](VISION.md) | La idea original del propietario: las cuatro ideas, los dos planos y qué *no* es el sistema |
| [EVOLUCION.md](EVOLUCION.md) | Cronología de cómo cambió la idea, con sus correcciones |
| [historico/ARQUITECTURA-CONCEPTUAL-v1.md](historico/ARQUITECTURA-CONCEPTUAL-v1.md) | Propuesta v1 de Claude (grafo completo). **NO aprobada; superada** |
| [historico/ARQUITECTURA-SIMPLE-v2.md](historico/ARQUITECTURA-SIMPLE-v2.md) | Propuesta v2 de Claude (`INDEX.md` + `contextos/`). **NO aprobada; rechazada en parte** |
| [../auditoria-v1/](../auditoria-v1/PROTOCOLO.md) | La investigación de BeatGaler en curso (PLAN, MAPA-CODIGO, FLUJOS, HALLAZGOS, `runs/`) |
| [../pasada-1/zonas/](../pasada-1/zonas/) | Revisión anterior por zonas. Es una hipótesis, no un mapa vigente |

## Reglas para cualquier IA que continúe

- **No conviertas recomendaciones en decisiones.** Solo vale lo que está marcado como APROBADO en [DECISIONES.md](DECISIONES.md).
- **El propietario decide la arquitectura.** Ayuda con preguntas, límites técnicos y detección de contradicciones. No le hagas cuestionarios interminables.
- **No reduzcas el «index» a un `INDEX.md`.** El propietario lo rechazó expresamente: "no es un MD, es un sistema".
- **No diseñes por adelantado** la recuperación, el «index», los subagentes ni la IA experta mientras la etapa sea "conservar".
- **No confundas investigaciones antiguas con el código vigente.** Mucho del material de `auditoria-v1` se hizo sobre la rama `local/landing-gallery-unificada`, que ya no existe. Desde el 2026-11-20 la fuente oficial es `main`.
- Prioridades del propietario: **precisión > velocidad**; gastar pocos tokens; simplicidad.
