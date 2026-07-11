import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { api, Party } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { useToast } from "@/src/components/Toast";
import { colors, spacing, radius, fontSize, formatINR, formatDate } from "@/src/theme";

export default function Reminders() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const toast = useToast();

  const [items, setItems] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const list = await api.getReminders();
      setItems(list);
    } catch (e: any) {
      toast.show(e?.message || t.error, "error");
    } finally {
      setLoading(false);
    }
  }, [toast, t.error]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sendWA = (p: Party) => {
    const msg = t.reminderMessage(p.name, formatINR(p.balance));
    const phone = (p.phone || "").replace(/\D/g, "");
    const url = phone
      ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(msg)}`
      : `whatsapp://send?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`).catch(() =>
        toast.show("WhatsApp unavailable", "error")
      );
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="back-btn">
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.reminders}</Text>
        <View style={styles.iconBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 + insets.bottom }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyCircle}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              </View>
              <Text style={styles.emptyText}>{t.noReminders}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card} testID={`reminder-${item.id}`}>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => router.push(`/party/${item.id}`)}
              >
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.due}>{t.pendingFrom}: {formatDate(item.last_transaction_at || item.created_at)}</Text>
                <Text style={styles.amount}>{formatINR(item.balance)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.waBtn}
                onPress={() => sendWA(item)}
                testID={`reminder-wa-${item.id}`}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.onSurface },

  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  name: { fontSize: fontSize.lg, fontWeight: "700", color: colors.onSurface },
  due: { fontSize: fontSize.sm, color: colors.onSurfaceMuted, marginTop: 4 },
  amount: { fontSize: fontSize.xl, fontWeight: "800", color: colors.success, marginTop: spacing.sm },
  waBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  emptyCircle: {
    width: 100,
    height: 100,
    borderRadius: 100,
    backgroundColor: colors.successTint,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: fontSize.lg, color: colors.onSurfaceTertiary, textAlign: "center" },
});
