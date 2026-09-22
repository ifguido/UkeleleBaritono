/**
 * Origen del sitio web. La app usa su API para importar canciones desde una
 * URL (el scraping vive en el servidor: así no hay que actualizar la app cada
 * vez que un sitio de acordes cambia el HTML).
 */
export const WEB_ORIGIN = "https://www.ukelelebaritone.com";
export const IMPORT_ENDPOINT = `${WEB_ORIGIN}/api/import`;
export const PRIVACY_URL = `${WEB_ORIGIN}/privacidad`;
