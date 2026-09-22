// App de Apple Watch: solo el afinador. Corre sin el iPhone (usa el micrófono
// del reloj) y se publica dentro de la misma ficha del App Store.
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: "watch",
  name: "UkeleleWatch",
  displayName: "Ukelele Barítono",
  // → com.ifguido.ukelelebaritono.watchkitapp
  bundleIdentifier: ".watchkitapp",
  // watchOS 10 cubre desde el Series 4 (2018).
  deploymentTarget: "10.0",
  icon: "../../assets/icon/icon.png",
  colors: {
    $accent: "#0d9488",
  },
  frameworks: ["SwiftUI", "AVFoundation", "WatchKit"],
};
