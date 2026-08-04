# Ukelele Barítono

Acordes, escalas, afinador y adaptador de canciones para ukelele barítono en afinación **D–G–B–E**.

Todo lo musical se calcula desde los intervalos y se verifica nota por nota: no hay tablas de
posiciones copiadas en ningún lado. Si un diagrama aparece, es porque el motor comprobó que contiene
las notas que el acorde tiene que contener.

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # motor musical + integridad de las URLs
npm run build   # genera las ~865 páginas estáticas
```

## Estructura

```
src/
  app/                 Rutas (App Router, Next.js 16)
    acordes/[slug]/      420 páginas de acorde
    escalas/[slug]/      432 páginas de escala
    sitemap.ts           858 URLs
    robots.ts
  components/          Vistas. ChordDiagram es server-safe a propósito:
                       los diagramas tienen que estar en el HTML inicial.
  lib/
    engine/            Motor musical. Sin dependencias de React.
    seo/               Metadatos, slugs, structured data.
```

## Convención de URLs

Las URLs de acorde y escala son **permanentes**: están indexadas, y cambiarlas cuesta posiciones.
El mapeo vive en `src/lib/seo/slugs.ts` escrito a mano —no derivado de los nombres de la interfaz,
que cambian cuando se ajusta un texto— y `src/lib/seo/__tests__/slugs.test.ts` comprueba las 852
combinaciones una por una.

```
/acordes/do-mayor              Do mayor        (C)
/acordes/fa-sostenido-m7       Fa♯ menor 7ª    (F#m7)
/escalas/la-pentatonica-menor  La pentatónica menor
/escalas/do-mayor              Do mayor (jónico)
```

Reglas:

- La nota va en cifra española, que es como se busca en castellano.
- De cada par enarmónico hay **una sola** URL canónica; la otra grafía redirige con 308. `Re♭` no
  compite contra `Do♯` por la misma consulta.
- El sostenido se escribe `s` dentro de los sufijos (`7s9`, no `7#9`): `#` abre el fragmento de la
  URL y nunca llegaría al servidor.
- Los alias frecuentes (`do-m`, `la-menor-natural`, `do-jonico`) existen y redirigen al canónico.

## Antes de tocar el SEO

- Ninguna página debe construir sus metadatos a mano: se usa `pageMetadata()`, que es lo que
  garantiza que todas lleven canonical.
- `openGraph` **se reemplaza entero**, no se fusiona, cuando una página lo declara. Por eso
  `pageMetadata()` repite la imagen: sin eso, las páginas se comparten sin miniatura.
- Al agregar una ruta fija, agregarla a `src/lib/seo/routes.ts`. De ahí leen la navegación, el pie y
  el sitemap, así que no puede quedar una página enlazada pero ausente del sitemap.
- `CONTENT_UPDATED_AT`, en `src/app/sitemap.ts`, se sube a mano cuando cambia el contenido. No es
  `new Date()` a propósito: un `lastmod` que cambia en cada deploy sin cambiar nada enseña a Google
  a ignorarlo.
