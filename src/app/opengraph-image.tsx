import { ImageResponse } from "next/og";
import { SITE_NAME, TUNING_LABEL } from "@/lib/seo/site";

export const alt = `${SITE_NAME} — acordes, escalas y afinador para ukelele barítono`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Imagen de compartido por defecto. Al estar en la raíz de `app`, cascadea a
 * todas las rutas que no definan la suya, así que ningún enlace del sitio queda
 * sin previsualización en WhatsApp, X o Discord.
 *
 * Satori solo entiende flexbox y un subconjunto de CSS: nada de grid.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#fafaf9",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#0f766e",
            }}
          >
            Ukelele barítono · {TUNING_LABEL}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 82,
              fontWeight: 700,
              lineHeight: 1.1,
              color: "#1c1917",
            }}
          >
            Acordes, escalas y afinador
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: 34,
              lineHeight: 1.35,
              color: "#57534e",
            }}
          >
            Cada posición calculada y verificada nota por nota.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 600, color: "#1c1917" }}>
            {SITE_NAME}
          </div>
          {/* Las cuatro cuerdas al aire, como firma visual. */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {["D", "G", "B", "E"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 74,
                  height: 74,
                  marginLeft: 16,
                  borderRadius: 999,
                  backgroundColor: "#0f766e",
                  color: "#ffffff",
                  fontSize: 34,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
