> **HISTÓRICO — congelado el 2026-11-21. No es estado vigente.** Borrador sin acordar (11-nov). Entrada vigente: [README](../README.md).

# Glosario de BeatGaler — BORRADOR (fuera del repo)

**Estado:** borrador de la pasada 1 (2026-11-11, commit `5cb6ccc`). No está acordado con el propietario. Entra al repo en la etapa 2, con aprobación.
**Regla:** una palabra, un significado. Donde hoy una palabra nombra varias cosas, se marca **COLISIÓN** y queda pendiente elegir nombre.
Las definiciones describen comportamiento, no código. Entre paréntesis, dónde vive hoy.

## Lo que el usuario ve

- **Beat** — una obra en la biblioteca: un audio principal más, opcionalmente, WAV, portada y proyecto, con nombre, BPM, tono y tags.
- **Biblioteca** — todos los beats de una cuenta, incluida su papelera.
- **Landing** — la página pública de presentación (`src/features/design/LANDING/`).
- **Gallery** — la pantalla donde se ve y se trabaja la biblioteca. Hoy hay dos: la paginada sobre INDEX y la infinita virtualizada sobre catálogo. Tras la migración solo debe quedar la segunda.
- **BeatCard** — la tarjeta de un beat en la Gallery (`src/components/BeatCard.tsx`).
- **Tag Bar** — la barra de tags para filtrar (`src/features/design/GALLERY/TagNavigation.tsx`).
- **Playbar** — la barra de reproducción (`src/components/Player.tsx`).
- **Drawer** — el panel de edición de un beat (`src/components/Drawer.tsx`). *Pendiente: ¿"editor" en español?*
- **Papelera** — beats apartados que aún se pueden restaurar (14 días en el catálogo).
- **Purga** — borrado definitivo de lo que hay en la papelera, incluidos los archivos en Telegram.
- **Prefetch** — precarga del primer trozo de audio de los beats que probablemente vas a escuchar, para que el play sea inmediato.

## Partes de un beat

- **Audio principal** — el MP3 que suena. En el código se llama `master` / `MASTER` como tipo de archivo. **COLISIÓN** con la cuenta MASTER (ver abajo).
- **WAV**, **Portada** (`ARTWORK`), **Proyecto** (`PROJECT`, un ZIP; único archivo cuyos bytes pasan hoy por el servidor).

## Almacenamiento en Telegram

- **Cuenta MASTER** — la cuenta de usuario de Telegram del servicio. Es dueña de todos los grupos, crea hilos, sube proyectos y borra. **COLISIÓN** con "master" = audio principal.
- **Vault** — el grupo privado de Telegram de una cuenta, donde viven sus archivos. Uno por usuario.
- **Topic** — el hilo de un beat dentro del vault.
- **Bot gestor** — bot que solo emite y rota las llaves de los bots de transporte; nunca entra en los vaults.
- **Bot de transporte** — bot asignado a un vault; es la identidad con la que el navegador sube y baja archivos hoy.
- **Asignación** — qué bot de transporte atiende a qué vault (estable).
- **Membresía** — si el bot asignado está dentro del vault con los permisos correctos (`pending / ready / repair`).
- **INDEX** — documento con toda la biblioteca de una cuenta, fijado en su vault. Autoridad de metadatos hoy; se retira con la migración.
- **Llave temporal** (`temp auth`) — llave de unos 10 minutos que deja al navegador actuar como el bot de transporte.
- **Gateway** — pieza del servidor que, en el camino catálogo, sube, descarga y borra en Telegram en nombre del navegador. Hoy sin conectar a Telegram real.

## Catálogo PostgreSQL

- **Catálogo** — la biblioteca guardada en PostgreSQL: autoridad de metadatos tras la migración.
- **Era** — identidad de la "vida" de una biblioteca; cambia si se reinicia.
- **Época** — contador que sube cuando cambia algo de fondo (cambio de vault, restauración); invalida permisos anteriores.
- **Revisión** — contador que sube con cada cambio confirmado de la biblioteca.
- **Versión (de un beat)** — contador por beat para detectar que dos dispositivos lo editan a la vez.
- **Generación** — una copia completa de la biblioteca dentro del catálogo. Una biblioteca nativa tiene una sola. *Pendiente tras la migración: ¿sigue haciendo falta el concepto?*
- **Documento canónico** — la ficha completa de un beat tal como se guarda. En el código se llama `legacy_json`, aunque es el dato vivo. **Nombre engañoso.**
- **Tombstone** — marca permanente de un beat purgado; impide que reaparezca o que se reutilice su identificador.
- **Query-set** — la lista congelada de beats que cumplen un filtro en un momento dado; base de la selección global y del "siguiente".
- **Selección** — conjunto de beats elegido por el usuario, guardado en el servidor para que cubra toda la biblioteca y no solo lo visible.
- **Reserva** — hueco de cuota apartado mientras dura una subida.
- **Cuarentena** — bloqueo de una cuenta cuando sus datos de control entran en conflicto.

## Palabras con varios significados hoy (COLISIONES a resolver)

| Palabra | Significados actuales |
|---|---|
| **capability** | (1) permiso de un uso del transporte directo; (2) permiso de un uso de subida del catálogo; (3) lo que un plan permite hacer; (4) lo que una plataforma (Web/Desktop) soporta. |
| **legacy** | (1) el INDEX; (2) el guardado de cuentas en archivos JSON; (3) copias antiguas de proyectos; (4) rutas de la época Bot API. |
| **MASTER / master** | (1) la cuenta de Telegram del servicio; (2) el audio principal de un beat. |
| **index** | (1) el INDEX de la biblioteca; (2) el índice de rutas de arranque (primeros 14 beats). |
| **operación** | (1) operación del transporte directo; (2) edición en lote del catálogo; (3) subida del catálogo; (4) purga del catálogo. |
| **sesión** | (1) sesión de la cuenta (login); (2) sesión de transporte con Telegram; (3) `features/session`, que es estado de conexión, no sesión. |
| **Direct** | Nombre genérico de todo el transporte directo navegador↔Telegram y de su coordinación en el servidor. |

## Cuentas y pagos

- **Cuenta** — un usuario de BeatGaler.
- **Instalación** — un navegador o dispositivo concreto de una cuenta.
- **Alta pendiente** — registro iniciado y aún sin verificar por código.
- **Plan** — lo contratado. **Acceso** (`entitlement`) — lo que ese plan permite ahora mismo (se calcula al consultar, no se guarda).
- **Cuota** — límite de beats (y de tamaño de proyecto) según el plan.
- **Checkout** — inicio de un pago en Polar. **Portal** — gestión de la suscripción en Polar.
- **Reconciliación** — repaso periódico que corrige diferencias entre Polar y BeatGaler.

## Arquitectura (se usan tal cual, en inglés)

- **Module** — cualquier pieza con una cara y un interior.
- **Interface** — la cara: todo lo que hay que saber para usar la pieza.
- **Implementation** — el interior.
- **Depth** — deep: cara pequeña, mucho detrás. Shallow: la cara es casi tan compleja como el interior.
- **Seam** — la costura donde una pieza se une a otra y se puede cambiar una sin tocar la otra.
- **Adapter** — lo que se enchufa en una costura.
- **Leverage** — lo que gana quien usa una pieza deep.
- **Locality** — lo que gana quien la mantiene: cambios y fallos en un solo sitio.
