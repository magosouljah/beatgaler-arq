> **AVISO HISTÓRICO:** propuesta de Claude, **NO aprobada** por el propietario. Superada (ver [../DECISIONES.md](../DECISIONES.md) §7). Se conserva solo como antecedente y como opciones futuras.
>
> El propietario la rechazó como forma: "yo jamás dije INDEX.md porque no es un MD, es un sistema".

# Context Management BeatGaler — Arquitectura simple v2

**Fecha:** 2026-11-20 · Reemplaza a la v1 como propuesta vigente. Nada implementado.
**Leyenda:** **[APROBADO]** decidido por el propietario · **[RECOMENDADO]** propuesta de Claude · **[PENDIENTE]** requiere decisión del propietario.

---

## 1. La idea en dos piezas [APROBADO]

1. **Contextos:** documentos de cualquier tamaño (investigaciones, explicaciones, decisiones, planes, ideas, historia, preferencias). Contienen el conocimiento.
2. **«Index» multidimensional:** no contiene el conocimiento. Sabe **dónde están las cosas y cómo se relacionan**, en dos planos (Programa y Conocimiento), con varios padres por elemento, relaciones cruzadas y navegación en las dos direcciones.

La IA lee el «index», llega al contexto o al código, y desde ahí investiga ella misma.

---

## 2. La forma más simple [RECOMENDADO]

```
conocimiento/
  INDEX.md          ← el «index» multidimensional, un solo archivo
  contextos/        ← carpeta plana: la carpeta NO clasifica nada
    aud-007-paginacion-keyset.md
    decision-main-es-oficial.md
    quick-packs-v2.md
    ...
```

### 2.1 Un nodo = una línea

Cada nodo del «index» ocupa **una sola línea** y declara sus relaciones en la misma línea:

```
@reproduccion | P1 | Reproducción de beats: playbar, cola, shuffle, leases de medios
  ⟶ padres: @web @gallery | usa: @auth @sesion @telegram-media @catalogo-sql
  ⟶ código: src/features/playback/ src/features/audio/ | ctx: aud-008-leases.md

@quick-packs-v2 | P2 | IDEA · Packs rápidos de beats para V2
  ⟶ padres: @v2 @monetizacion | ctx: quick-packs-v2.md
```

(Las líneas de arriba se partieron solo para que se lean aquí; en el archivo cada nodo es una sola línea.)

### 2.2 Por qué es multidimensional y no un índice convencional

- **Varios padres:** `@reproduccion` está bajo `@web` y bajo `@gallery` a la vez. No vive dentro de ninguna carpeta.
- **Relaciones cruzadas:** `usa:` une funcionalidades con componentes compartidos y sistemas. El campo `código:` une el Plano 1 con el repo, y `ctx:` une cualquier nodo con sus contextos.
- **Las dos direcciones con una sola búsqueda:**
  - `grep "@auth" INDEX.md` devuelve el nodo `@auth` **y** todas las líneas que lo usan o lo tienen como padre. Eso es navegar hacia arriba y hacia abajo al mismo tiempo, sin herramienta propia.
  - `grep "src/features/playback"` entra desde un archivo y lleva a la funcionalidad. Esa es la dirección de abajo arriba, para la limpieza.
- **De lo general a lo específico:** el inicio de `INDEX.md` es una sección **Raíz**, de unas 30 líneas, con los nodos más generales de cada plano. Es la puerta de entrada.

### 2.3 Cómo lo usa una IA con una tarea

1. Lee la Raíz, unos 600 tokens.
2. Hace `grep` de 1 a 3 ids o rutas relacionados con la tarea y obtiene las líneas vecinas.
3. Abre el código señalado y, si existe, el contexto enlazado.
4. Investiga como siempre, pero ya sin buscar desde cero.

Costo típico de orientarse: **1.000–2.000 tokens**, en lugar de explorar el repo.

### 2.4 Tamaño esperado

El Plano 1 a nivel de funcionalidades, sistemas, componentes compartidos y contratos importantes da unos 100–200 nodos. El Plano 2 crece con el tiempo. `INDEX.md` queda en cientos de líneas. Nunca hay que leerlo completo, porque se busca dentro de él. Si algún día crece demasiado, se puede dividir por plano sin cambiar el formato.

---

## 3. Contextos [RECOMENDADO]

- Son Markdown libres, del tamaño que haga falta, y nunca se recortan.
- Llevan una cabecera mínima de 3 a 4 líneas:

  ```
  nodos: @reproduccion @telegram-media
  estado: hipótesis | verificado-código | verificado-funcionamiento   (si hace afirmaciones técnicas)
  sha: <commit al que se refiere>                                     (si hace afirmaciones técnicas)
  ```

- **Contradicciones:** los dos contextos se conservan, y cada uno lleva `contradice: otro.md` en su cabecera. Eso basta.
- **Reemplazo:** el contexto nuevo lleva `reemplaza: viejo.md` y el viejo se queda como historial.
- La certeza y el SHA van **en el contexto, no en el «index»**. El «index» dice *dónde* está algo, y eso casi no se desactualiza. Lo que sí envejece son las afirmaciones técnicas, y esas viven en los contextos, con su fecha de verificación.

---

## 4. Mantenimiento: semiautomático y mínimo [RECOMENDADO]

| Momento | Qué se hace | Quién lo hace |
|---|---|---|
| Una tarea crea, mueve o borra un módulo o una funcionalidad | Editar 1 o 2 líneas de `INDEX.md` en el mismo commit | La IA que hace la tarea |
| Una investigación produce conocimiento que vale la pena conservar | Guardar un contexto y añadir `ctx:` al nodo | La IA que investiga |
| Una decisión, idea o plan tuyo | Un contexto y un nodo P2 | La IA que trabaja contigo |
| De vez en cuando (opcional) | Un script de unas 30 líneas que lista las carpetas de código que ningún `código:` cubre | Cualquiera, a mano |

No hay sincronización perfecta ni verificación continua. Si una línea queda vieja, la IA lo descubre al abrir el código, que es su trabajo de todos modos, y corrige la línea.

**Oficial y experimental:** salen gratis si el «index» y los contextos viven en el repo. En una rama son experimentales; con el merge a `main` se vuelven oficiales, y el historial queda en git. No hace falta ningún mecanismo nuevo.

---

## 5. Qué pasa con cada pieza de la v1

| Pieza de la v1 | v2 | Motivo |
|---|---|---|
| Dos planos, varios padres, relaciones cruzadas, navegación bidireccional | **SE QUEDA** | Es la esencia de tu idea |
| Fuente en el repo BeatGaler, rama = experimental, `main` = oficial, historial en git | **SE QUEDA** | No cuesta nada y cumple tres reglas sin mecanismo extra |
| Tres niveles de certeza, contradicciones conservadas | **SE QUEDA**, simplificado a la cabecera del contexto | Una línea de texto, sin objetos aparte |
| Investigaciones completas | **SE QUEDA**: los contextos | Es el Context Management |
| Unos 12 tipos de relación | **SE SIMPLIFICA** a 4: `padres`, `usa`, `código`, `ctx` (más `contradice` y `reemplaza` en los contextos) | Basta para localizar |
| Muchos tipos de nodo | **SE SIMPLIFICA** a una etiqueta de plano (P1/P2) y, en P2, el estado (IDEA, PROPUESTA, APROBADO, RECHAZADO, IMPLEMENTADO) | Se conserva la distinción que pediste entre intención y realidad |
| Cobertura del 100 % por archivo | **SE SIMPLIFICA** a cobertura por **carpeta o módulo**: todo archivo relevante tiene un lugar porque su carpeta tiene un nodo | Cumple "todo tiene un lugar" sin mantener cientos de líneas por archivo |
| Funcionalidad en los dos planos | **SE SIMPLIFICA:** un nodo P2 con `usa: @funcionalidad-p1`, o un nodo de un solo plano si no hace falta separar | Ya no es una decisión de arquitectura |
| Extractor mecánico | **SE ELIMINA** (si acaso, el script opcional de huecos) | Existía para una comprensión exhaustiva |
| CLI, MCP, base o caché derivados | **SE ELIMINAN** | `grep` sobre un archivo de texto ya navega en las dos direcciones |
| Afirmaciones como objetos, `verificado@SHA` por nodo, marca de desactualizado | **SE ELIMINAN** del «index» | Las afirmaciones técnicas viven en los contextos, con su SHA |
| Métricas C0–C3 | **SE ELIMINAN** del sistema | Eran métricas de auditoría, no de localización |
| IA experta (idea 4) | **APLAZADA, opcional:** una IA con esta misma estructura ya la es | No requiere infraestructura |
| Prueba trampa | **SE QUEDA** | Sigue siendo la forma de saber si funciona |

---

## 6. Reutilizar `beatgaler-arq` [RECOMENDADO]

- **Fuentes:** sus informes (`runs/AUD-*`, `pasada-1/zonas`, `HALLAZGOS`, `FLUJOS`, `MAPA-CODIGO`).
- **Cómo entran:** se copian o se enlazan como **contextos**, con su cabecera `sha:` del commit viejo. Así nadie los toma por vigentes.
- **En el «index»:** los nodos P1 apuntan a ellos con `ctx:`.
- **Zonas de `pasada-1`:** las 7 sirven como borrador de la Raíz del Plano 1.

No hay migración ni conversión de formato.

---

## 7. Arranque

1. Escribir la Raíz y los nodos P1 por funcionalidad, sistema y componente compartido, con su `código:` a carpetas. Es una sola pasada de IA sobre la estructura de carpetas de `main`, no sobre cada archivo.
2. Enlazar los informes de `beatgaler-arq` como contextos.
3. Añadir los nodos P2 que ya existen: V1/V2, las decisiones de este diseño y las ideas pendientes.
4. Apuntar a `conocimiento/INDEX.md` desde `AGENTS.md` y `CLAUDE.md`.
5. Prueba trampa con GPT-6.

---

## 8. Límites honestos

- Es **tan bueno como sus líneas**. Una relación que nadie anotó no aparece. La prueba trampa mide justo eso.
- `grep` encuentra ids y rutas exactas, no "algo parecido". Si se necesita búsqueda por similitud, se puede añadir después sin cambiar nada de lo anterior.
- Depende de la regla "la tarea que cambia la estructura actualiza su línea". Es una regla pequeña, pero sigue siendo una regla.

---

## 9. Pendiente para el propietario

- **¿Aceptas que la fuente viva en el repo BeatGaler?** Es lo único que hace gratis la regla de oficial y experimental.
- **Resúmenes:** siguen abiertos. Este diseño no los necesita.
