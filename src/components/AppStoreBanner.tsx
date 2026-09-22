"use client";

import { useSyncExternalStore } from "react";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/seo/apps";

const DISMISSED_KEY = "ukelelebaritono:app-banner-dismissed";

type Store = "ios" | "android" | null;

/**
 * En qué tienda mandar a esta visita, o null si no corresponde mostrar nada:
 * escritorio, app ya instalada (modo standalone), banner cerrado antes, o
 * Safari en iOS, donde el Smart App Banner del sistema (meta `apple-itunes-app`
 * en el layout) ya hace este trabajo y duplicarlo sería insistir.
 */
function storeFor(): Store {
  if (typeof window === "undefined") return null;
  try {
    if (window.localStorage.getItem(DISMISSED_KEY) === "1") return null;
  } catch {
    // Sin localStorage (modo privado estricto): se muestra igual.
  }
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;
  if (standalone) return null;

  const ua = window.navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) {
    const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|DuckDuckGo|GSA\/|Brave/.test(ua);
    return otherBrowser ? "ios" : null;
  }
  if (/Android/.test(ua) && PLAY_STORE_URL) return "android";
  return null;
}

const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function dismiss() {
  try {
    window.localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // sin persistencia: se cierra igual para esta visita
  }
  listeners.forEach((listener) => listener());
}

/**
 * Barra "Descargá la app" para quien entra desde un teléfono. Se decide en
 * el cliente (depende del navegador) y en el servidor no se dibuja, así el
 * HTML inicial es el mismo para todos y no hay salto de hidratación.
 */
export default function AppStoreBanner() {
  const store = useSyncExternalStore(subscribe, storeFor, () => null);
  if (!store) return null;
  const href = store === "ios" ? APP_STORE_URL : PLAY_STORE_URL!;
  const where = store === "ios" ? "iPhone y Apple Watch" : "Android";

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-lg font-bold text-white"
        >
          ♪
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-900">Ukelele Barítono, la app</p>
          <p className="truncate text-xs text-stone-500">
            Afinador, acordes y canciones para {where}. Funciona sin conexión.
          </p>
        </div>
        <a
          href={href}
          className="shrink-0 rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Descargar
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar"
          className="shrink-0 rounded px-1.5 py-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
