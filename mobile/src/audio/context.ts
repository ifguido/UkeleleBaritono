/**
 * Sesión de audio compartida.
 *
 * Un solo AudioContext para toda la app: el sintetizador y el afinador lo
 * comparten, igual que en la web. iOS además exige declarar para qué se usa
 * el audio (categoría de sesión): reproducir ignora el interruptor de
 * silencio —quien pulsa "escuchar" quiere escuchar— y grabar abre el
 * micrófono sin procesamiento de voz, que es lo que un afinador necesita.
 */

import { AudioContext, AudioManager } from "react-native-audio-api";

let ctx: AudioContext | null = null;
let sessionMode: "playback" | "playAndRecord" | null = null;

export function sharedAudioContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  return ctx;
}

/** Configura la sesión del sistema. Es idempotente: solo actúa si cambia el modo. */
export async function configureSession(mode: "playback" | "playAndRecord"): Promise<void> {
  if (sessionMode === mode) return;
  sessionMode = mode;
  if (mode === "playAndRecord") {
    AudioManager.setAudioSessionOptions({
      iosCategory: "playAndRecord",
      // "measurement" apaga la cancelación de eco y el control automático de
      // ganancia: están pensados para la voz y le comen los armónicos a una
      // cuerda, que es justo lo que el detector usa para no errar de octava.
      iosMode: "measurement",
      iosOptions: ["defaultToSpeaker", "allowBluetoothA2DP"],
      iosAllowHaptics: true,
    });
  } else {
    AudioManager.setAudioSessionOptions({
      iosCategory: "playback",
      iosMode: "default",
      iosOptions: [],
      iosAllowHaptics: true,
      iosNotifyOthersOnDeactivation: true,
    });
  }
  try {
    await AudioManager.setAudioSessionActivity(true);
  } catch {
    // Si el sistema no deja activar la sesión (otra app con prioridad),
    // el audio sigue intentando sonar: no hay nada mejor que hacer acá.
  }
}

/** El contexto listo para sonar: sesión activa y reloj corriendo. */
export async function readyContext(): Promise<AudioContext> {
  const ac = sharedAudioContext();
  if (sessionMode === null) await configureSession("playback");
  if (ac.state === "suspended") {
    try {
      await ac.resume();
    } catch {
      // ya corriendo o cerrado: ignorar
    }
  }
  return ac;
}
