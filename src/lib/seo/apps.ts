/**
 * Las apps en las tiendas. De acá salen el Smart App Banner de Safari, la
 * barra de descarga para otros navegadores de iOS y cualquier enlace a la
 * tienda que se agregue después.
 */

/** Id de la app en App Store Connect (`com.ifguido.ukelelebaritono`). */
export const APP_STORE_ID = "6814575871";

export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;

/**
 * Google Play: todavía no publicada. Cuando exista, poner acá la URL
 * (`https://play.google.com/store/apps/details?id=com.ifguido.ukelelebaritono`)
 * y la barra de descarga empieza a mostrarse también en Android.
 */
export const PLAY_STORE_URL: string | null = null;
