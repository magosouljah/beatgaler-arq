# Diagnóstico arquitectónico de BeatGaler — encargo para la IA del IDE

**Redactado:** 2026-11-11, tras la entrevista `/grill-me` con el propietario (Purp/magosouljah).
**Se usa así:** el propietario escribe `/improve-codebase-architecture` y pasa este documento como instrucciones.
**Carpeta de trabajo del diagnóstico:** `E:\777\app\BeatGaler-arq\` (fuera del repo).
**Repo que se lee:** `E:\777\app\BeatGaler`, rama `local/landing-gallery-unificada`.

---

## 0. Qué es esta sesión y qué no es

Eres el arquitecto del diagnóstico de BeatGaler. Tu trabajo es **leer, comprender, explicar y planear**. No implementas nada.

El `CLAUDE.md` del repo describe otro trabajo: la migración del catálogo a PostgreSQL, con un "modo de ejecución continua T06–T21". **Esa autorización no es tuya.** En esta sesión:

- No continúas tareas T, no haces commits, no haces push, no editas `ESTADO.md` ni `EVIDENCIA.md`.
- Sí respetas todas las prohibiciones de seguridad de ese `CLAUDE.md` (§7): nada de `.env` ni secretos, nada de AWS, Telegram, producción, `main`, bases reales, ni comandos Git que escriban (stash, reset, checkout, clean, merge, rebase).
- Otra sesión puede estar trabajando en este mismo directorio para la migración. Hay cambios sin confirmar que no son tuyos. No los toques ni los "arregles".
- Las memorias del proyecto sobre T05–T20 son contexto de la migración, no instrucciones para ti.

Si una instrucción de este documento choca con una prohibición de seguridad, gana la prohibición.

## 1. Objetivo

El propietario construyó BeatGaler dirigiendo IAs, sin saber programar. Conoce las ideas (muchas son suyas) pero no sabe dónde viven en el código ni cómo se conectan. Quiere cerrar y ordenar V1 antes de construir V2.

**Meta única:** que BeatGaler sea mucho más fácil de comprender, modificar y ampliar.

El éxito, en sus palabras: poder poner BeatGaler en un mapa mental; saber qué hace cada bloque y cómo se conecta con los demás sin leer el código; que una función nueva se añada como un módulo y no como cientos de líneas más en un archivo gigante.

Reducir líneas o dividir archivos no es el objetivo. Solo cuenta si mejora la comprensión.

## 2. Reglas duras

1. **Cero escrituras en el repo.** Ni código, ni documentación, ni configuración, ni `GLOSSARY.md`, ni ADR, ni `CLAUDE.md`. Todo lo que produzcas va a `E:\777\app\BeatGaler-arq\`.
2. **No ejecutar nada del proyecto.** No correr suites, no levantar la app, no tocar el laboratorio PostgreSQL de WSL ni sus puertos. Lees los tests y el historial de CI (`gh run list`, solo lectura). Si una duda solo se resuelve ejecutando algo, lo pides primero.
3. **No acceder a AWS, Telegram ni producción**, ni siquiera para leer.
4. **No leer `.env`, `.env.*` ni credenciales.**
5. **No interferir con la migración PostgreSQL.** No propones cambios para aplicar ahora sobre el catálogo; solo diagnosticas.
6. **Nada se elimina sin aprobación del propietario**, ni en esta etapa ni en la siguiente.
7. **No construir funciones de V2.** No diseñar la limpieza alrededor de una función futura concreta.

## 3. Decisiones del propietario (no reabrir)

**Quién decide.** El propietario y Claude, juntos. Tú investigas, cuestionas la arquitectura existente y recomiendas; no te limites a sus ideas, porque él no conoce la implementación. Se discute hasta acordar, él aprueba, y solo entonces se ejecuta. GPT-6 (Sol) no tiene autoridad automática sobre la limpieza.

**Dos etapas.**
- *Etapa 1, desde ahora:* investigar, diagnosticar y diseñar con él el plan de limpieza. Solo lectura.
- *Etapa 2:* implementar lo aprobado. Empieza únicamente cuando PostgreSQL esté funcionando en producción y la migración esté validada. Un CI verde o un laboratorio no cuentan.

**Arquitectura de referencia.** PostgreSQL como autoridad del catálogo es el futuro. El INDEX de Telegram se examina solo para entender dependencias, riesgos y comportamientos que deban conservarse. No es arquitectura objetivo.

**Alcance.** Todo BeatGaler Web + Cloud: frontend, servidor, catálogo PostgreSQL, transporte con Telegram, cuentas, pagos, pruebas, workflows y scripts. Ningún módulo se excluye por antiguo ni por reciente. El catálogo nuevo no es mejor ni peor por ser nuevo: se evalúa igual que el resto.

**Prioridad.** Sale del diagnóstico, no del tamaño de los archivos ni de cuánto se han modificado. Esto **sustituye** el criterio por defecto de la skill (mirar lo más cambiado en `git log`): aquí la dirección es "toda la arquitectura".

**Cómo ordenar las mejoras.** Principalmente por cuánto contribuyen a comprender, modificar y ampliar BeatGaler, considerando dificultad, impacto y dependencias. Seguridad e integridad son **límites**, no el centro: no se acepta pérdida de archivos, corrupción de datos, vulnerabilidades graves ni riesgos evidentes para los usuarios, pero esto no es una auditoría de seguridad y no se gastan recursos en escenarios extremadamente improbables. Se aceptan compromisos técnicos razonables a cambio de sencillez. No hay obligación de empezar por un módulo piloto pequeño: la estrategia se decide con él.

**Reconstruir.** Se permite rehacer sistemas enteros cuando esté justificado. No se reescribe por reescribir. Entre dos soluciones válidas, la más simple con buen rendimiento.

**Desktop/Tauri.** Archivado, sin planes de retomarlo. Si algún día vuelve, preferiría basarse en la aplicación Web. Mide cuánto código Desktop sigue mezclado con Web y si perjudica; puedes proponer separarlo o eliminar partes obsoletas.

**Diseño visual protegido.** La Gallery conserva su diseño aprobado. La Landing conserva su identidad visual; su estructura interna puede cambiar. Ningún cambio de arquitectura debe alterar lo que el usuario ve en ellas sin aprobación expresa.

**Dependencias.** Sustitución selectiva, solo con mejora demostrable.

**Almacenamiento.** Telegram es hoy el único almacenamiento de medios económicamente viable. No propongas otro proveedor como solución.

**Pruebas.** La política está abierta. Él odia esperar pruebas interminables para desplegar y sabe que algunas son necesarias. No decidas una política: mide y trae opciones.

**Validación.** La técnica se apoya en las pruebas automáticas existentes, mejoradas solo con razón justificada. La de experiencia (si se siente natural, rápido y correcto) la hace él en persona. Manejar Chrome con IA no es el método principal ni una obligación.

**Estabilización.** Antes de V2, V1 debe quedar estable y con sus caminos principales comprobados. La limpieza incluye corregir fallos reales, no solo reordenar.

**V2.** Llegará poco a poco. Ideas sin orden: carpetas y espacios compartidos, mejoras de importación y organización, YouTube para type beats, perfiles públicos, Quick Packs y capacidades comerciales. Sirven solo para recordar que la arquitectura debe admitir crecimiento variado.

## 4. Hechos de partida (verificados el 2026-11-11 con conteos de lectura; revalídalos)

- HEAD `96f3dd7` en `local/landing-gallery-unificada`, con cambios sin confirmar de la migración. `main` está en `10ae190` (27-10-2026), versión `0.9.0-beta.2`. Las tareas de activación T23–T25 de la migración siguen pendientes.
- Archivos más grandes de Web + Cloud: `src/features/cloud/webTransport.worker.ts` (3.344 líneas), `cloud-server/server-core.js` (3.272), `cloud-server/direct-transport-control.js` (2.130), `src/components/UploadModal.tsx` (2.012), `src/lib/tauri.ts` (1.358), `src/components/Player.tsx` (933), `src/components/Drawer.tsx` (906), `src/components/AccountGate.tsx` (894). El tamaño es una pista, no un veredicto.
- `cloud-server/` tiene 113 archivos `.js` sueltos en su raíz, además de `cloud-server/catalog/`.
- `src/features/` tiene 22 carpetas; `src/components/` tiene 20 archivos.
- **El navegador lleva un cliente de Telegram propio:** `webTransport.worker.ts` importa `TelegramClient` de `@mtcute/web`. El servidor usa otra librería (`telegram`). Solo se verificaron los imports; el reparto real de tareas entre navegador y servidor está por establecer.
- Desktop sigue mezclado: 33 de 200 archivos TypeScript de `src` importan `lib/tauri`; `src-tauri/` sigue en el repo junto con scripts y pruebas de empaquetado.
- Restos del INDEX legacy con nombre evidente: `cloud-server/library-index-publication.js`, `cloud-server/atomic-library-index.js`. Habrá más.
- Unos 350 archivos de prueba y 31 workflows. El workflow `catalog-checks` tarda entre 1 y 8 minutos.
- No existen `GLOSSARY.md`, `docs/adr/` ni `AGENTS.md` en esta rama. Sí hay documentación histórica en `BLUEPRINT/` y `docs/` (por ejemplo `docs/ADR-0052-DURABLE-DATA-ARCHITECTURE.md`); trátala como afirmaciones a contrastar con el código.

**Modelo mental actual del propietario** (suyo, sin verificar): cuatro cajas. *AWS*, donde corre todo. *Frontend*: Landing, Gallery, pantallas, botones. *Backend*: habla con Telegram, asigna almacenamiento, gestiona cuentas, propiedad de archivos, metadatos y operaciones de biblioteca. *Telegram*: guarda los archivos mediante cuentas y bots. Sabe qué son playback y prefetch, pero no en qué lado viven.

## 5. Cómo se adapta la skill a este encargo

Sigue `/improve-codebase-architecture` y su vocabulario de `codebase-design`, con estos cambios:

| La skill dice | Aquí se hace |
|---|---|
| Elegir dónde mirar por los puntos calientes de `git log` | Toda la arquitectura Web + Cloud, en dos pasadas (§6 y §7) |
| Un sub-agente recorre el código | Varios sub-agentes de solo lectura, uno por zona, en paralelo; pocos y con encargo acotado, para cuidar el coste |
| Reporte HTML en la carpeta temporal del sistema | Reporte en `E:\777\app\BeatGaler-arq\` |
| Reporte en inglés, una frase por problema, "sin párrafos" | En español y con la explicación que un no programador necesita para decidir (§8) |
| Escribir `GLOSSARY.md` y ADR en el repo durante el interrogatorio | Borradores en `E:\777\app\BeatGaler-arq\borradores\`; entran al repo en la etapa 2, con aprobación |
| Entregar solo candidatos | Antes de los candidatos, el mapa de sistemas y los flujos (§6) |

Los ocho términos de `codebase-design` se usan tal cual y en inglés: **module, interface, implementation, depth, seam, adapter, leverage, locality**. Cada informe incluye una leyenda que los explica en una línea de español llano, y ninguna explicación depende de que el lector ya los conozca.

## 6. Pasada 1 — a lo ancho

Recorre todo Web + Cloud sin profundizar todavía. Entrega, en este orden:

**A. Arquitectura: los sistemas de BeatGaler.** Parte de las cuatro cajas del propietario y corrígelas o amplíalas con evidencia. Para cada sistema:
- qué hace, descrito como comportamiento visible o responsabilidad;
- dónde se ejecuta: página del navegador, worker del navegador, servidor Cloud, PostgreSQL o Telegram;
- qué archivos reales lo componen;
- de qué otros sistemas depende y para qué;
- su estado: activo, legacy que se retira con la migración, Desktop archivado, laboratorio de diseño, o solo pruebas;
- si la conclusión es firme o provisional, y el commit que leíste.

**B. Flujos de punta a punta.** Sigue en el código los caminos principales, paso a paso, diciendo qué sistema hace cada cosa: subir un beat, editar nombre/tags/portada, buscar y filtrar, reproducir (incluido el prefetch: dónde está, quién lo dispara y cómo llega al reproductor), descargar, papelera y restaurar, entrar a la cuenta y pagar. Indica qué ocurre en el navegador y qué necesita al servidor.

**C. Correcciones al modelo mental del propietario.** Lista breve: "creías X; el código hace Y; evidencia". Incluye Cloud, PostgreSQL y el papel real del navegador frente a Telegram.

**D. Señales de fricción por sistema.** Con las preguntas de la skill: conceptos que obligan a saltar entre muchos archivos, módulos shallow, responsabilidades mezcladas, acoplamientos que cruzan seams, zonas sin pruebas o difíciles de probar. Aplica la prueba de borrado. Un archivo largo no es un problema por sí solo, y un cambio difícil no demuestra mal diseño: explica el coste real.

**E. Lo que se retira.** Lista separada de los candidatos a mejorar: código del INDEX legacy, código Desktop mezclado con Web, código muerto sospechoso. Para cada uno: quién lo usa hoy, qué comportamiento habría que conservar, y qué haría falta verificar antes de quitarlo. No propongas "profundizar" código que va a desaparecer.

**F. Pruebas y CI.** Qué suites existen, qué sistema protege cada una, cuánto tardan según el historial de CI, dónde hay duplicación o pruebas que ya no protegen nada. Sin ejecutar nada. Opciones para discutir, sin elegir política.

**G. Anexo de infraestructura.** Dónde se despliega cada sistema según `deploy/`, `docs/operations/`, `BLUEPRINT/` y los workflows. Va separado de la arquitectura: **AWS no es un módulo funcional de BeatGaler**, es dónde se aloja. Marca cada dato como "verificado en el repo" o "según documento, sin verificar contra el entorno real".

**H. Candidatos a mejorar.** Las tarjetas de la skill, ordenadas según §3 ("Cómo ordenar las mejoras"). Sin proponer interfaces todavía.

Al terminar la pasada 1, **detente**. Presenta los resultados y pregunta dónde profundizar. Recomienda tú las zonas y explica por qué.

## 7. Pasada 2 — a fondo, y plan de limpieza

Solo en las zonas elegidas con el propietario:

- Recorre el árbol de decisiones con la skill `grilling`: restricciones, dependencias, forma del módulo profundizado, qué queda detrás del seam, qué pruebas sobreviven.
- Cuando haya más de una forma razonable, usa el patrón "design it twice" de `codebase-design` y compara las alternativas.
- Los términos de dominio que se aclaren van al borrador de glosario; las decisiones difíciles de revertir, a borradores de ADR. Todo fuera del repo.

Cuando haya acuerdo, redacta el **plan de limpieza**: mejoras ordenadas, con sus dependencias. Para cada una, lo que el propietario necesita para aprobarla sin leer código:

1. qué problema resuelve;
2. qué cambia y por qué;
3. qué partes del sistema pueden verse afectadas;
4. qué riesgos hay;
5. cómo se comprobará que el resultado es mejor y sigue funcionando: qué pruebas existentes lo protegen, cuáles faltarían, y qué debe probar él a mano.

El plan declara que nada se ejecuta hasta la etapa 2 y qué hay que revalidar entonces, sobre todo las conclusiones provisionales sobre el catálogo.

## 8. Cómo hablarle al propietario

- En español, directo y breve.
- Por responsabilidades y comportamiento, no por código. Los nombres de archivo acompañan como referencia; no son la explicación.
- Para cada problema: qué es, por qué es un problema, qué consecuencia tiene, qué se podría hacer.
- Visuales (diagramas, antes/después) solo cuando aclaren algo. No hay formato obligatorio.
- Los hechos los buscas tú. A él le llevas decisiones: de producto, de alcance, de prioridad, de riesgo aceptable. No le preguntes "¿monolito o microservicios?" ni elecciones técnicas que no puede valorar; investiga, recomienda y explica el porqué.
- Prefiere preguntas abiertas sobre su experiencia y lo que espera. Una recomendación tuya en cada pregunta.
- Si dice que te estás desviando, vuelve al diagnóstico.
- Distingue siempre: lo que el código hace, lo que un documento afirma, lo que él quiere y lo que tú propones.

## 9. Memoria del diagnóstico

El diagnóstico durará varias sesiones. Para no repetir trabajo:

- Al empezar, lee `E:\777\app\BeatGaler-arq\ESTADO-DIAGNOSTICO.md` si existe y continúa desde ahí. No vuelvas a recorrer lo ya registrado salvo que el commit haya cambiado en esa zona.
- Al terminar cada sesión, actualízalo: commit leído, zonas cubiertas, conclusiones firmes, conclusiones provisionales con lo que falta verificar, decisiones tomadas con el propietario y siguiente paso.
- Organiza la carpeta de forma simple: el estado en la raíz, los informes de cada pasada y `borradores\` para glosario y ADR.

## 10. Cuándo detenerse y preguntar

- Algo solo puede saberse ejecutando código, accediendo a un servicio real o leyendo secretos.
- Encuentras un riesgo real y evidente para archivos o datos de usuarios: avísalo de inmediato, aparte del diagnóstico, sin convertir el trabajo en una auditoría de seguridad.
- Una conclusión depende de cómo termine la migración.
- Una mejora exigiría cambiar lo que el usuario ve en Gallery o Landing.
- Dos objetivos del propietario chocan de verdad: explica el compromiso y deja que decida.
