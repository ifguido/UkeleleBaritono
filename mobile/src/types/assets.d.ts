/** Los archivos de audio se importan como módulos: Metro los empaqueta y
 *  devuelve el id numérico del asset, que es lo que espera decodeAudioData. */
declare module "*.mp3" {
  const asset: number;
  export default asset;
}
