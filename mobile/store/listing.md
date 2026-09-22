# Ficha para App Store y Google Play

Textos listos para pegar. Los límites de caracteres son los de cada tienda.

## Identidad

| Campo | Valor |
|---|---|
| Nombre | Ukelele Barítono |
| Bundle ID (iOS) / package (Android) | `com.ifguido.ukelelebaritono` |
| Categoría | Música (App Store: Music · Play: Music & Audio) |
| Idioma principal | Español |
| Sitio web | https://ukelelebaritone.com |
| Política de privacidad | https://ukelelebaritone.com/privacidad |
| Soporte | farannaguido@gmail.com |
| Clasificación de edad | 4+ / Para todos (sin contenido sensible) |
| Precio | Gratis, sin compras ni anuncios |

## Subtítulo (App Store, 30 caracteres) / Descripción corta (Play, 80)

- App Store: `Acordes, escalas y afinador`
- Google Play: `Acordes, escalas, afinador y adaptador de canciones para ukelele barítono (D-G-B-E)`

## Descripción (App Store 4000 · Play 4000)

```
Todo lo que necesita un ukelele barítono, calculado para su afinación real: D–G–B–E.

Casi todo lo que se publica de ukelele está pensado para soprano, y las formas no se trasladan: lo que en soprano es un Do, en barítono suena Sol. Esta app no copia tablas de ningún lado. Cada posición se genera recorriendo el diapasón y se verifica nota por nota contra la fórmula del acorde. Si un diagrama aparece, es porque contiene las notas que tiene que contener.

CANCIÓN
Pegá una canción con los acordes sobre la letra (o una URL de un sitio de acordes) y te la devuelve con las posiciones más cómodas para el barítono, eligiendo cada una en función de la anterior y la siguiente: menos saltos de mano, mejor bajo, mejor conducción de voces. Tocá un acorde para escucharlo, cambiá una posición en toda la canción o solo en una parte, reemplazá un acorde (E → E7), ajustá el tempo y escuchá el arreglo entero o una sección.

ACORDES
Buscá cualquier cifrado —de Do mayor a C#m7b5 o G/B— y compará todas sus posiciones ordenadas por dificultad, bajo o registro. ¿Tenés los dedos puestos y no sabés qué acorde es? Marcá los trastes y te lo dice.

ESCALAS
36 escalas y modos en las doce tonalidades: pentatónicas, blues, mayor y sus modos, menor armónica y melódica, bebop, simétricas y escalas de carácter. Cada una sobre el mástil completo, en cajas para puntear sin mover la mano, en tablatura, con los acordes que salen de ella, progresiones para practicar encima y ejercicios de variación.

COMPARTIR Y LISTO
Desde Safari, Chrome o cualquier sitio de acordes, tocá Compartir → Ukelele Barítono: la canción se importa y se arregla sola.

AFINADOR
Afiná con el micrófono, cuerda por cuerda o en modo cromático, con precisión en cents y referencia ajustable (La = 440 Hz o la que uses). El audio se analiza en el teléfono y nunca sale de él.

TAMBIÉN EN APPLE WATCH
El afinador está en tu muñeca: usa el micrófono del reloj, funciona sin el iPhone y vibra cuando la cuerda queda afinada.

TODO SUENA
Los acordes y las escalas se escuchan con muestras reales de cuerda de nylon. Funciona sin conexión.

Sin cuentas, sin anuncios, sin seguimiento.
```

## Palabras clave (App Store, 100 caracteres)

```
ukelele,baritono,ukulele,acordes,escalas,afinador,tuner,chords,DGBE,canciones
```

## Novedades (versión 1.0.0)

```
Primera versión: adaptador de canciones, explorador e identificador de acordes, escalas sobre el mástil y afinador por micrófono para ukelele barítono (D–G–B–E).
```

## Capturas de pantalla

Se necesitan como mínimo (se pueden sacar del simulador con ⌘S / desde Android Studio):

- iPhone 6,9" (1320×2868) — obligatorias. iPad 13" (2064×2752) si `supportsTablet` sigue en `true`.
- Android: teléfono (mín. 1080×1920), 2 a 8 capturas; ícono 512×512 (`assets/icon/icon.png` sirve);
  imagen destacada 1024×500.
- Apple Watch (App Store): al menos una captura de 410×502 (Ultra) o 396×484 (Series 7–10, 45 mm).
  Se saca desde el reloj (corona + botón lateral) y se sincroniza a Fotos del iPhone.

Sugerencia de secuencia (misma en las dos tiendas):

1. Canción con el arreglo y la tira de acordes.
2. Mesa de trabajo de un acorde con las posiciones alternativas.
3. Explorador de acordes.
4. Escala sobre el mástil (pestaña Diapasón).
5. Caja de escala con tablatura.
6. Afinador con una cuerda afinada.

## Cuestionarios de privacidad

### App Store — "App Privacy"

- **Data Not Collected**. La app no recopila datos. No hay analítica, ni publicidad, ni cuentas.
- Micrófono: se usa para el afinador (iPhone y Apple Watch); el audio se procesa en el dispositivo y no se almacena ni transmite.
- `ITSAppUsesNonExemptEncryption` ya está en `false` en `app.json` (solo HTTPS estándar).

### Google Play — "Data safety"

- ¿Recopila o comparte datos del usuario? **No.**
- ¿Los datos se cifran en tránsito? Sí (solo hay una petición HTTPS al importar una URL).
- ¿Se pueden pedir la eliminación de datos? No aplica: no se recopilan.
- Permiso `RECORD_AUDIO`: declarar uso "Afinador de instrumento; el audio se analiza localmente".

### Google Play — otras declaraciones

- Anuncios: no contiene anuncios.
- Público objetivo: 13+ (no está dirigida a niños; evita el programa Families).
- Contenido: cuestionario IARC → sin violencia, sin contenido sexual, sin apuestas → "Para todos".
