# Ukelele Barítono — app iOS y Android

La misma herramienta que la web, como app nativa: adaptador de canciones, explorador e identificador
de acordes, escalas sobre el mástil y afinador por micrófono, para ukelele barítono en **D–G–B–E**.
Funciona sin conexión; lo único que usa internet es importar una canción desde una URL.

Hecha con Expo (SDK 57) y React Native. Se compila y se publica con EAS.

## El motor es el mismo que el de la web

No hay una copia del motor musical acá. Metro y TypeScript apuntan a `../src/lib` del repo con el
alias `@core/*` (ver `metro.config.js` y `tsconfig.json`):

```
@core/engine/*        acordes, voicings, escalas, optimizador, parser de canciones
@core/audio/pitch     detector de altura (YIN) del afinador
```

Los tests del motor viven en la raíz (`npm test` allá) y cubren las dos plataformas. Lo que sí es
propio de la app es todo lo que toca el dispositivo:

```
src/
  app/                 Rutas (Expo Router). Pestañas nativas: cancion, acordes, escalas, afinador.
  audio/               Web Audio nativa (react-native-audio-api): samples de nylon + fallback
                       Karplus–Strong, sesión de audio de iOS, micrófono para el afinador.
  diagrams/            Diagramas en react-native-svg: acorde, mástil, caja, tablatura, dial.
  features/            Cada herramienta, separada de la pantalla que la muestra.
  ui/                  Primitivas (Button, Chip, Card, Field…) con tema claro/oscuro.
  theme/               Paleta (la misma stone/teal de la web) y tipografías.
targets/
  watch/               App de Apple Watch (SwiftUI): solo el afinador. Ver abajo.
assets/
  icon/                Ícono (claro, oscuro, tinted), adaptativo de Android y splash.
  samples/nylon/       Copia de los 12 samples de `public/samples/nylon` (van dentro del paquete).
```

## Desarrollo

La app usa módulos nativos (audio, SVG), así que **no corre en Expo Go**: hace falta una
_development build_.

```bash
cd mobile
npm install

# iOS: simulador (necesita Xcode + CocoaPods)
npm run ios

# Android: emulador o teléfono conectado (necesita Android Studio / SDK + JDK 17)
npm run android

# Después de la primera compilación alcanza con el servidor de desarrollo
npm start

npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npm run doctor      # expo-doctor: dependencias y config
```

Las carpetas `ios/` y `android/` se generan con `expo prebuild` y están ignoradas por git: todo lo
nativo se configura en `app.json` (permisos, ícono, splash, plugins). No se editan a mano.

## Publicar en las tiendas

Todo se hace con EAS desde `mobile/`. Cuenta de Expo: `ifguido`.

### Una sola vez

1. `npx eas-cli@latest login` (cuenta `ifguido`).
2. El proyecto ya existe en Expo y está enlazado: `@ifguido/ukelele-baritono`
   (<https://expo.dev/accounts/ifguido/projects/ukelele-baritono>); el `projectId` está en `app.json`.
3. Cuentas de tienda:
   - **Apple**: la app ya existe en App Store Connect (cuenta `gfaranna95@icloud.com`, app
     `6814575871`, bundle id `com.ifguido.ukelelebaritono`). `eas submit` ya apunta ahí (`eas.json`).
     La extensión de compartir usa el bundle id `com.ifguido.ukelelebaritono.share-extension` y el
     App Group `group.com.ifguido.ukelelebaritono`. EAS crea los dos identificadores, pero **no
     activa la capacidad App Groups en el de la extensión** (bug conocido de EAS con extensiones:
     [expo/expo#43676](https://github.com/expo/expo/issues/43676)), y el build falla con
     _"Provisioning profile … doesn't support the group.com.ifguido.ukelelebaritono App Group"_.
     Se arregla una sola vez, a mano:
     1. <https://developer.apple.com/account/resources/identifiers/list> → Identifiers →
        `com.ifguido.ukelelebaritono.share-extension` → marcar **App Groups** → Configure → elegir
        `group.com.ifguido.ukelelebaritono` → Save. Comprobar que el App ID principal
        `com.ifguido.ukelelebaritono` tenga el mismo grupo asignado.
     2. `npx eas-cli@latest credentials -p ios` → perfil `production` → target **ShareExtension** →
        Provisioning Profile → **Delete** (el perfil viejo no incluye el grupo).
     3. Volver a compilar: `npm run build:prod`. EAS genera un perfil nuevo, ya con App Groups.
   - **Google Play Console** (25 USD una vez): <https://play.google.com/console/signup>.
     Crear la app con el package `com.ifguido.ukelelebaritono`.
4. Credenciales: EAS las genera y guarda solas la primera vez que se compila para producción
   (certificados de Apple, keystore de Android). Para Android, la primera subida a Play se hace a
   mano con el `.aab` (Play Console exige la primera manualmente); desde ahí `eas submit` puede
   automatizarlo con una cuenta de servicio (<https://docs.expo.dev/submit/android/>).

### Cada versión

```bash
# 1. Subir la versión visible en app.json ("version": "1.1.0"). El build number /
#    versionCode los incrementa EAS solo (autoIncrement en eas.json).

# 2. Compilar para las dos tiendas (en la nube; tarda 10–20 min)
npm run build:prod

# 3. Enviar a revisión
npm run submit:ios        # → App Store Connect (TestFlight primero, después revisión)
npm run submit:android    # → Play Console, pista interna en borrador
```

Antes de mandar a producción conviene probar el build en un teléfono real:

```bash
npm run build:preview     # .apk para Android + build interno para iOS (dispositivos registrados)
```

### Ficha de la tienda

El texto, las capturas y las respuestas a los cuestionarios de privacidad están en
[`store/listing.md`](store/listing.md). La política de privacidad que piden las dos tiendas está
publicada en <https://www.ukelelebaritone.com/privacidad> (`src/app/privacidad` del sitio).

## Apple Watch

`targets/watch/` es una app de reloj independiente con el afinador, escrita en SwiftUI (React Native
no corre en watchOS). La agrega al proyecto de Xcode el plugin `@bacons/apple-targets` en cada
`prebuild`, como target `UkeleleWatch` (bundle id `com.ifguido.ukelelebaritono.watchkitapp`), y se
publica dentro de la misma ficha del App Store.

- `Pitch.swift` y `Tuning.swift` son traducciones fieles de `src/lib/audio/pitch.ts` y
  `src/lib/engine/tuning.ts` (mismo YIN, mismos umbrales). Si se cambia algo allá, se cambia acá.
- `AudioInput.swift` toma el micrófono del reloj con `AVAudioEngine` en modo *measurement*;
  `TunerModel.swift` es el mismo bucle que la pantalla del teléfono (40 ms, mediana, 0,7 s para dar
  la cuerda por afinada, vibración al lograrlo).
- `Info.plist` del target lleva el texto de permiso de micrófono y `WKRunsIndependentlyOfCompanionApp`.
- **Para compilar el proyecto hace falta la plataforma watchOS en Xcode** (Xcode › Settings ›
  Components › watchOS, unos 4 GB), también para archivar la app del iPhone, porque la del reloj va
  embebida. EAS ya la tiene.
- La pantalla del reloj se apaga sola según el ajuste "Volver al reloj" del sistema; Apple no permite
  mantenerla encendida para un afinador.
- Solo se prueba de verdad en un Apple Watch real: el simulador no da micrófono.

## Decisiones que conviene conocer

- **Audio**: `react-native-audio-api` implementa la Web Audio API en nativo, así que `src/audio/synth.ts`
  es casi el mismo código que la web. FFmpeg está desactivado (`disableFFmpeg` en `app.json`): los mp3
  se decodifican con miniaudio y el binario queda mucho más chico.
- **Sesión de iOS**: reproducir usa la categoría `playback` (suena aunque el interruptor esté en
  silencio); el afinador cambia a `playAndRecord` con modo `measurement`, que apaga la cancelación de
  eco y el control de ganancia que le comen los armónicos a la cuerda. Al detener, vuelve a `playback`.
- **Sin modo de fondo ni servicio en primer plano**: el afinador se apaga al pasar a segundo plano.
  Pedir `audio` en `UIBackgroundModes` sin justificación es motivo de rechazo en la revisión de Apple.
- **Importar por URL** llama a `https://www.ukelelebaritone.com/api/import`: el scraping vive en el
  servidor a propósito, para arreglarlo sin publicar una versión nueva de la app.
- **Pestañas nativas** (`expo-router/unstable-native-tabs`): en iOS 26 son la barra de cristal del
  sistema. Los íconos son SF Symbols en iOS y Material Symbols en Android.
- **Compartir desde otras apps** (`expo-share-intent`): en Safari, Chrome o un sitio de acordes,
  "Compartir → Ukelele Barítono" abre la pestaña Canción con la URL (o el texto) ya importado y
  optimizado. En iOS es una Share Extension (target `ShareExtension` en Xcode, generado en el
  prebuild); en Android, un intent `SEND` de `text/*`. `plugins/withShareExtensionName.js` pone el
  nombre visible de la extensión, porque el nombre por defecto chocaba con el target de la app.
  Solo se prueba de verdad en un dispositivo (o simulador) compartiendo desde Safari: no hay forma
  de dispararlo desde código.
- **Títulos grandes de iOS**: no pasar `headerTitleStyle`/`headerLargeTitleStyle` al Stack; en
  iOS 26 hacen que el título grande no se dibuje. Los colores salen del tema de navegación.
