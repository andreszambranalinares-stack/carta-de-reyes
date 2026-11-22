# Carta de Reyes

App web familiar: cada uno escribe su carta de Reyes y el resto reserva en secreto qué va a regalar.

- **Entrada:** código de familia (guardado cifrado en la base de datos, nunca en este repositorio), nombre y PIN de 4 números.
  Las personas nuevas quedan pendientes hasta que el administrador las acepta.
- **Cartas:** cada deseo tiene foto, nombre, precio, prioridad (1–3 estrellas), lista (Tecnología, Libros…) y notas.
- **Enlace inteligente:** al pegar el enlace de un producto se intentan sacar la foto, el nombre y el precio
  (vía `r.jina.ai` y, si falla, `api.microlink.io`). Tiendas con antibots (Amazon, Decathlon, PcComponentes,
  MediaMarkt, Carrefour…) no dejan; entonces se pega la foto copiada o se elige del carrete.
- **Sorpresa:** «¡Lo regalo yo!» reserva un deseo. Lo ve el resto de la familia, nunca el dueño de la carta
  (lo garantiza la base de datos, no solo la interfaz).

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html`, `styles.css`, `app.js` | La app (sin dependencias ni compilación) |
| `config.js` | URL y clave pública de Supabase. Vacío = modo demo (datos de ejemplo en el navegador) |
| `supabase/schema.sql` | Tablas y funciones. Se pega en Supabase → SQL Editor → Run |

## Puesta en marcha

1. Crear un proyecto en [supabase.com](https://supabase.com) (plan gratis, región Europa).
2. SQL Editor → pegar `supabase/schema.sql` → Run, y después `002_fotos.sql`, `003_regalos.sql`, `004_seguridad.sql`, `005_ideas.sql`, `006_detalles.sql`, `007_chat.sql` y `008_album.sql` (en ese orden) → Run.
   Luego poner el código de familia con la línea `insert into rdc_config…` que explica `004_seguridad.sql`.
3. Project Settings → API: copiar *Project URL* y la clave *anon public* en `config.js`.
4. Subir la carpeta a un repositorio de GitHub y activar Pages (Settings → Pages → rama `main`, carpeta `/`).

Si alguien olvida su PIN: en Supabase → Table Editor → `rdc_members`, borrar su fila (se borran sus deseos)
o pedir que se lo reseteen con SQL:
`update rdc_members set pin_hash = extensions.crypt('1234', extensions.gen_salt('bf')) where name_key = 'ana';`

Al cambiar archivos, subir el número `?v=` en `index.html` para que los móviles no usen la versión antigua.
