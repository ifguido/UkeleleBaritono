/**
 * Acceso al micrófono para el afinador.
 *
 * Se piden explícitamente los procesados apagados: la cancelación de eco, la
 * supresión de ruido y el control automático de ganancia están pensados para
 * la voz y le comen los armónicos a una cuerda, que es justo lo que el
 * detector necesita para no equivocarse de octava.
 */

import { sharedAudioContext } from "./synth";

export type MicrophoneErrorKind =
  | "insecure"
  | "unsupported"
  | "denied"
  | "notFound"
  | "busy"
  | "unknown";

export class MicrophoneError extends Error {
  constructor(
    readonly kind: MicrophoneErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "MicrophoneError";
  }
}

export interface Microphone {
  sampleRate: number;
  /** Muestras que devuelve cada lectura. */
  bufferLength: number;
  /**
   * Últimas muestras capturadas. Siempre es el mismo buffer: se reescribe en
   * cada llamada para no generar basura en un bucle que corre a 60 fps.
   */
  read(): Float32Array;
  stop(): void;
}

export interface MicrophoneOptions {
  /**
   * Tamaño de ventana. 4096 muestras son ~93 ms a 44,1 kHz: alcanza para
   * seis períodos del D3 (la cuerda más grave) y la pantalla sigue yendo
   * fluida.
   */
  fftSize?: number;
  /** Id del dispositivo, si el usuario eligió uno. */
  deviceId?: string;
}

/** Traduce el error del navegador a algo que se pueda leer y accionar. */
function describe(error: unknown): MicrophoneError {
  const name = error instanceof Error ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return new MicrophoneError(
        "denied",
        "No me diste permiso para usar el micrófono. Habilitalo desde el candado en la barra de direcciones y volvé a intentar.",
      );
    case "NotFoundError":
    case "OverconstrainedError":
      return new MicrophoneError(
        "notFound",
        "No encuentro ningún micrófono conectado.",
      );
    case "NotReadableError":
    case "AbortError":
      return new MicrophoneError(
        "busy",
        "El micrófono está ocupado por otra aplicación. Cerrala y volvé a intentar.",
      );
    default:
      return new MicrophoneError(
        "unknown",
        "No pude abrir el micrófono. Probá recargar la página.",
      );
  }
}

export async function openMicrophone(options: MicrophoneOptions = {}): Promise<Microphone> {
  const fftSize = options.fftSize ?? 4096;

  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    // getUserMedia solo existe en contextos seguros: https o localhost.
    const insecure =
      typeof window !== "undefined" && !window.isSecureContext;
    throw new MicrophoneError(
      insecure ? "insecure" : "unsupported",
      insecure
        ? "El micrófono necesita una conexión segura (https). Abrí la página con https o desde localhost."
        : "Este navegador no permite usar el micrófono desde una página web.",
    );
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
        ...(options.deviceId ? { deviceId: { exact: options.deviceId } } : {}),
      },
      video: false,
    });
  } catch (error) {
    throw describe(error);
  }

  const ctx = sharedAudioContext();
  if (ctx.state === "suspended") await ctx.resume();

  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = fftSize;
  // Sin suavizado: cada lectura tiene que ser el audio de ese instante.
  analyser.smoothingTimeConstant = 0;
  source.connect(analyser);
  // El analizador NO se conecta a la salida: sería realimentación.

  const samples = new Float32Array(analyser.fftSize);
  let stopped = false;
  return {
    sampleRate: ctx.sampleRate,
    bufferLength: analyser.fftSize,
    read() {
      if (!stopped) analyser.getFloatTimeDomainData(samples);
      return samples;
    },
    stop() {
      if (stopped) return;
      stopped = true;
      try {
        source.disconnect();
      } catch {
        // ya desconectado
      }
      for (const track of stream.getTracks()) track.stop();
    },
  };
}
