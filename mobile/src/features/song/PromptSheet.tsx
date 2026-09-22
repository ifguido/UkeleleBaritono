import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { radius, space } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { AppText, Button, Field } from "@/ui";

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  initialValue?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

/** Diálogo con un campo de texto; RN solo lo trae para iOS. */
export function PromptSheet({ visible, title, message, initialValue = "", confirmLabel = "Guardar", onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      {/* La key reinicia el campo cada vez que se abre con otro valor inicial. */}
      <PromptBody key={`${visible}-${initialValue}`} title={title} message={message} initialValue={initialValue} confirmLabel={confirmLabel} onConfirm={onConfirm} onCancel={onCancel} />
    </Modal>
  );
}

function PromptBody({ title, message, initialValue = "", confirmLabel, onConfirm, onCancel }: Omit<Props, "visible">) {
  const t = useTheme();
  const [value, setValue] = useState(initialValue);
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Cerrar" />
      <View style={[styles.box, { backgroundColor: t.card, borderColor: t.border }]}>
        <AppText variant="heading">{title}</AppText>
        {message && <AppText variant="muted">{message}</AppText>}
        <Field autoFocus value={value} onChangeText={setValue} onSubmitEditing={() => onConfirm(value)} returnKeyType="done" autoCapitalize="sentences" />
        <View style={styles.actions}>
          <Button title="Cancelar" variant="ghost" onPress={onCancel} />
          <Button title={confirmLabel ?? "Guardar"} onPress={() => onConfirm(value)} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", padding: space.xl, backgroundColor: "rgba(0,0,0,0.45)" },
  box: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg, gap: space.md },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: space.sm },
});
