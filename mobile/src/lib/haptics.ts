import * as Haptics from "expo-haptics";

/** Toque leve al pulsar un acorde: confirma el gesto sin mirar. */
export function tapFeedback(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Confirmación: una cuerda quedó afinada, se guardó una canción. */
export function successFeedback(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function selectionFeedback(): void {
  void Haptics.selectionAsync().catch(() => {});
}
