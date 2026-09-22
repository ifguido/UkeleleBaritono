// Metro necesita ver el motor musical, que vive fuera de este directorio:
// `src/lib` del repo es la única fuente de verdad (acordes, escalas, afinador)
// y se comparte con la web sin copiar nada. El alias `@core/*` de tsconfig
// apunta al mismo lugar; acá se le dice a Metro que esa carpeta existe.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const coreRoot = path.resolve(projectRoot, '../src/lib');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), coreRoot];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  '@core': coreRoot,
};
// Solo se resuelven dependencias desde node_modules de la app: el motor no
// importa nada externo, y así el node_modules de Next.js nunca entra en juego.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = config;
