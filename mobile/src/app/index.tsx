import { Redirect } from "expo-router";

/** La raíz no tiene pantalla propia: la app arranca en la pestaña Canción. */
export default function Index() {
  return <Redirect href="/cancion" />;
}
