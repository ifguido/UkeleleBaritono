// Nombre visible de la extensión de compartir en la hoja de iOS.
//
// expo-share-intent usa `iosShareExtensionName` a la vez como nombre del
// target de Xcode y como CFBundleDisplayName. "Ukelele Barítono" sanitizado
// coincide con el target de la app ("UkeleleBartono"), y el plugin entonces
// cree que la extensión ya existe y no la crea. Acá la extensión conserva su
// nombre interno por defecto ("ShareExtension") y solo se corrige el texto
// que ve la persona.
//
// Va ANTES de "expo-share-intent" en app.json: los mods se ejecutan en orden
// inverso al de registro, así que este corre después de que la extensión
// haya escrito su Info.plist.
const { withXcodeProject } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withShareExtensionName(config, { displayName }) {
  return withXcodeProject(config, (config) => {
    const plist = path.join(config.modRequest.platformProjectRoot, "ShareExtension", "ShareExtension-Info.plist");
    if (fs.existsSync(plist)) {
      const content = fs.readFileSync(plist, "utf8");
      const patched = content.replace(
        /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/,
        `$1${displayName}$2`,
      );
      fs.writeFileSync(plist, patched);
    } else {
      console.warn("[withShareExtensionName] No encontré ShareExtension-Info.plist; el nombre queda el de expo-share-intent.");
    }
    return config;
  });
};
