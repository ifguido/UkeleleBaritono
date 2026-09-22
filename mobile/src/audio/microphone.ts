/**
 * Acceso al micrófono para el afinador.
 *
 * Expone la misma interfaz que la versión web (`read()` devuelve la última
 * ventana de muestras), así el bucle del afinador y el detector YIN son
 * idénticos en las dos plataformas. Por debajo, el grabador nativo entrega
 * bloques de PCM que se van acumulando en un buffer circular.
 */

import { AudioManager, AudioRecorder } from "react-native-audio-api";
import { configureSession } from "./context";

export type MicrophoneErrorKind = "denied" | "unsupported" | "busy" | "unknown";

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
  /** Frecuencia de muestreo real de los datos (puede diferir de la pedida). */
  readonly sampleRate: number;
  /** Muestras que devuelve cada lectura. */
  readonly bufferLength: number;
  /**
   * Últimas muestras capturadas. Siempre es el mismo buffer: se reescribe en
   * cada llamada para no generar basura en un bucle que corre 25 veces por
   * segundo.
   */
  read(): Float32Array;
  stop(): Promise<void>;
}

export interface MicrophoneOptions {
  /**
   * Tamaño de ventana. 4096 muestras son ~85 ms a 48 kHz: alcanza para
   * seis períodos del D3 (la cuerda más grave) y la pantalla sigue fluida.
   */
  fftSize?: number;
}

/** Un solo grabador para toda la app: crear varios gasta memoria y batería. */
let recorder: AudioRecorder | null = null;

export async function openMicrophone(options: MicrophoneOptions = {}): Promise<Microphone> {
  const fftSize = options.fftSize ?? 4096;

  const permission = await AudioManager.requestRecordingPermissions();
  if (permission !== "Granted") {
    throw new MicrophoneError(
      "denied",
      "No me diste permiso para usar el micrófono. Habilitalo en Ajustes del sistema y volvé a intentar.",
    );
  }

  await configureSession("playAndRecord");

  const preferredRate = AudioManager.getDevicePreferredSampleRate() || 48000;
  if (!recorder) recorder = new AudioRecorder();
  const rec = recorder;
  rec.disableFileOutput();

  // Buffer circular con la última ventana; `read()` la desenrolla en orden.
  const ring = new Float32Array(fftSize);
  const window = new Float32Array(fftSize);
  let writePos = 0;
  let sampleRate = preferredRate;
  let stopped = false;

  const ready = rec.onAudioReady({ sampleRate: preferredRate, bufferLength: 1024, channelCount: 1 }, ({ buffer, numFrames }) => {
    if (stopped) return;
    if (buffer.sampleRate > 0) sampleRate = buffer.sampleRate;
    const data = buffer.getChannelData(0);
    const n = Math.min(numFrames, data.length);
    for (let i = 0; i < n; i++) {
      ring[writePos] = data[i];
      writePos = (writePos + 1) % fftSize;
    }
  });
  if (ready.status === "error") {
    throw new MicrophoneError("unsupported", `No pude conectar el micrófono: ${ready.message}`);
  }

  const started = await rec.start();
  if (started.status === "error") {
    rec.clearOnAudioReady();
    const busy = /busy|in use|ocupado/i.test(started.message);
    throw new MicrophoneError(
      busy ? "busy" : "unknown",
      busy
        ? "El micrófono está ocupado por otra aplicación. Cerrala y volvé a intentar."
        : `No pude abrir el micrófono: ${started.message}`,
    );
  }

  return {
    get sampleRate() {
      return sampleRate;
    },
    bufferLength: fftSize,
    read() {
      // Desenrollar el anillo: lo más viejo primero, lo más nuevo al final.
      const head = fftSize - writePos;
      window.set(ring.subarray(writePos), 0);
      window.set(ring.subarray(0, writePos), head);
      return window;
    },
    async stop() {
      if (stopped) return;
      stopped = true;
      rec.clearOnAudioReady();
      try {
        await rec.stop();
      } catch {
        // ya detenido
      }
      // De vuelta a la sesión de reproducción: sin esto el sonido de los
      // acordes saldría por el auricular en vez del parlante.
      await configureSession("playback");
    },
  };
}
