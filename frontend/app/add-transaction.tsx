import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { useToast } from "@/src/components/Toast";
import { colors, spacing, radius, fontSize, formatDate } from "@/src/theme";

export default function AddTransaction() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const toast = useToast();

  const { partyId, type, partyName } = useLocalSearchParams<{
    partyId: string;
    type: "gave" | "got";
    partyName: string;
  }>();

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isGave = type === "gave";
  const accent = isGave ? colors.error : colors.success;
  const title = isGave ? t.gaveTitle : t.gotTitle;

  const onSave = async () => {
    const n = parseFloat(amount);
    if (!n || n <= 0) {
      toast.show(t.amountRequired, "error");
      return;
    }
    setSubmitting(true);
    try {
      await api.createTransaction({
        party_id: partyId!,
        type: type!,
        amount: n,
        note: note.trim() || undefined,
      });
      toast.show(t.save + " \u2713", "success");
      router.back();
    } catch (e: any) {
      toast.show(e?.message || t.error, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: accent }]} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="back-btn">
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerTitle}>{title}</Text>
          {!!partyName && <Text style={styles.headerSub}>{partyName}</Text>}
        </View>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.body}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: spacing.xxl }}
          >
            <View style={styles.amountWrap}>
              <Text style={styles.currency}>{"\u20B9"}</Text>
              <TextInput
                value={amount}
                onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ""))}
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={colors.borderStrong}
                keyboardType="decimal-pad"
                autoFocus
                testID="tx-amount-input"
              />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="create-outline" size={18} color={colors.onSurfaceMuted} />
              <TextInput
                value={note}
                onChangeText={setNote}
                style={styles.noteInput}
                placeholder={t.note}
                placeholderTextColor={colors.onSurfaceMuted}
                testID="tx-note-input"
              />
            </View>

            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.onSurfaceMuted} />
              <Text style={styles.dateText}>{t.date}: {formatDate(new Date().toISOString())} ({t.today})</Text>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
            <TouchableOpacity
              onPress={onSave}
              disabled={submitting}
              style={[styles.saveBtn, { backgroundColor: accent }, submitting && { opacity: 0.7 }]}
              testID="save-tx-btn"
            >
              <Text style={styles.saveText}>{t.save}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: fontSize.lg, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: fontSize.sm, color: "#fff", opacity: 0.85, marginTop: 2 },

  body: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  amountWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  currency: { fontSize: fontSize.display - 4, color: colors.onSurfaceTertiary, fontWeight: "600" },
  amountInput: {
    fontSize: fontSize.display,
    fontWeight: "800",
    color: colors.onSurface,
    minWidth: 100,
    textAlign: "left",
    padding: 0,
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 52,
    marginBottom: spacing.md,
  },
  noteInput: { flex: 1, fontSize: fontSize.lg, color: colors.onSurface },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  dateText: { fontSize: fontSize.base, color: colors.onSurfaceTertiary },

  footer: {
    paddingTop: spacing.md,
  },
  saveBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontSize: fontSize.lg, fontWeight: "700" },
});
