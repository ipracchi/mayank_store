import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { api, Party, Transaction } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { useToast } from "@/src/components/Toast";
import { colors, spacing, radius, fontSize, formatINR, formatDate } from "@/src/theme";

export default function PartyDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const toast = useToast();

  const [party, setParty] = useState<Party | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminderOpen, setReminderOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [p, list] = await Promise.all([api.getParty(id), api.listTransactions(id)]);
      setParty(p);
      setTxs(list);
    } catch (e: any) {
      toast.show(e?.message || t.error, "error");
    } finally {
      setLoading(false);
    }
  }, [id, toast, t.error]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const onDeleteParty = () => {
    Alert.alert(t.confirmDelete, t.deletePartyMsg, [
      { text: t.no, style: "cancel" },
      {
        text: t.yes,
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteParty(id!);
            router.back();
          } catch (e: any) {
            toast.show(e?.message || t.error, "error");
          }
        },
      },
    ]);
  };

  const onDeleteTx = (txId: string) => {
    Alert.alert(t.confirmDelete, t.deleteTxMsg, [
      { text: t.no, style: "cancel" },
      {
        text: t.yes,
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteTransaction(txId);
            load();
          } catch (e: any) {
            toast.show(e?.message || t.error, "error");
          }
        },
      },
    ]);
  };

  const openWhatsApp = async () => {
    if (!party) return;
    const msg = t.reminderMessage(party.name, formatINR(party.balance));
    const phone = (party.phone || "").replace(/\s+/g, "");
    const url = phone
      ? `whatsapp://send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(msg)}`
      : `whatsapp://send?text=${encodeURIComponent(msg)}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      Linking.openURL(url);
    } else {
      Linking.openURL(`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`).catch(() =>
        toast.show("WhatsApp not installed", "error")
      );
    }
    setReminderOpen(false);
  };

  const openSMS = async () => {
    if (!party) return;
    const msg = t.reminderMessage(party.name, formatINR(party.balance));
    const phone = (party.phone || "").replace(/\s+/g, "");
    const sep = Platform.OS === "ios" ? "&" : "?";
    const url = `sms:${phone}${sep}body=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => toast.show("SMS unavailable", "error"));
    setReminderOpen(false);
  };

  const callParty = () => {
    if (!party?.phone) return;
    Linking.openURL(`tel:${party.phone.replace(/\s+/g, "")}`).catch(() => {});
  };

  if (loading || !party) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  const bal = party.balance;
  const balColor = bal > 0 ? colors.success : bal < 0 ? colors.error : colors.onSurfaceMuted;
  const balLabel = bal > 0 ? t.theyOweYou : bal < 0 ? t.youOweThem : t.settled;

  const renderTx = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      onLongPress={() => onDeleteTx(item.id)}
      activeOpacity={0.7}
      style={styles.txRow}
      testID={`tx-row-${item.id}`}
    >
      <View style={[styles.txIcon, { backgroundColor: item.type === "gave" ? colors.errorTint : colors.successTint }]}>
        <Ionicons
          name={item.type === "gave" ? "arrow-up" : "arrow-down"}
          size={18}
          color={item.type === "gave" ? colors.error : colors.success}
        />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txLabel}>
          {item.type === "gave" ? t.youGave : t.youGot}
        </Text>
        {!!item.note && <Text style={styles.txNote} numberOfLines={1}>{item.note}</Text>}
        <Text style={styles.txDate}>{formatDate(item.date)}</Text>
      </View>
      <Text
        style={[
          styles.txAmount,
          { color: item.type === "gave" ? colors.error : colors.success },
        ]}
      >
        {formatINR(item.amount)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="back-btn">
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerName} numberOfLines={1}>{party.name}</Text>
          {!!party.phone && <Text style={styles.headerPhone}>{party.phone}</Text>}
        </View>
        <TouchableOpacity onPress={onDeleteParty} style={styles.iconBtn} testID="delete-party-btn">
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={txs}
        keyExtractor={(x) => x.id}
        renderItem={renderTx}
        ItemSeparatorComponent={() => <View style={styles.txSep} />}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        ListHeaderComponent={
          <View>
            <View style={styles.balanceCard} testID="party-balance-card">
              <Text style={styles.balanceLabel}>{balLabel}</Text>
              <Text style={[styles.balanceAmount, { color: balColor }]}>
                {formatINR(bal)}
              </Text>
              <View style={styles.actionRow}>
                {!!party.phone && (
                  <TouchableOpacity style={styles.actionBtn} onPress={callParty} testID="call-btn">
                    <Ionicons name="call-outline" size={18} color={colors.brandDark} />
                    <Text style={styles.actionText}>{t.call}</Text>
                  </TouchableOpacity>
                )}
                {bal > 0 && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnPrimary]}
                    onPress={() => setReminderOpen(true)}
                    testID="send-reminder-btn"
                  >
                    <Ionicons name="paper-plane-outline" size={18} color={colors.onBrand} />
                    <Text style={[styles.actionText, { color: colors.onBrand }]}>{t.sendReminder}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {(party.firm_name || party.contact_person || party.gst_number || party.address) && (
              <View style={styles.infoCard}>
                {!!party.firm_name && (
                  <View style={styles.infoRow}>
                    <Ionicons name="business-outline" size={16} color={colors.onSurfaceMuted} />
                    <Text style={styles.infoText}>{party.firm_name}</Text>
                  </View>
                )}
                {!!party.contact_person && (
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={16} color={colors.onSurfaceMuted} />
                    <Text style={styles.infoText}>{party.contact_person}</Text>
                  </View>
                )}
                {!!party.gst_number && (
                  <View style={styles.infoRow}>
                    <Ionicons name="document-text-outline" size={16} color={colors.onSurfaceMuted} />
                    <Text style={styles.infoText}>GST: {party.gst_number}</Text>
                  </View>
                )}
                {!!party.address && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color={colors.onSurfaceMuted} />
                    <Text style={styles.infoText}>{party.address}</Text>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.sectionHeader}>{t.transactions}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={colors.brandTint} />
            <Text style={styles.emptyTitle}>{t.noTransactions}</Text>
            <Text style={styles.emptyBody}>{t.tapBelowToStart}</Text>
          </View>
        }
      />

      <View style={[styles.stickyRow, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity
          style={[styles.stickyBtn, { backgroundColor: colors.error }]}
          onPress={() => router.push({ pathname: "/add-transaction", params: { partyId: id, type: "gave", partyName: party.name } })}
          testID="you-gave-btn"
        >
          <Ionicons name="arrow-up" size={20} color="#fff" />
          <View style={styles.stickyBtnLabel}>
            <Text style={styles.stickyBtnText}>{t.youGave}</Text>
            <Text style={styles.stickyBtnSubtext}>{t.toReceive}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.stickyBtn, { backgroundColor: colors.success }]}
          onPress={() => router.push({ pathname: "/add-transaction", params: { partyId: id, type: "got", partyName: party.name } })}
          testID="you-got-btn"
        >
          <Ionicons name="arrow-down" size={20} color="#fff" />
          <View style={styles.stickyBtnLabel}>
            <Text style={styles.stickyBtnText}>{t.youGot}</Text>
            <Text style={styles.stickyBtnSubtext}>{t.toPay}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        visible={reminderOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setReminderOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBg}
          activeOpacity={1}
          onPress={() => setReminderOpen(false)}
        >
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t.sendReminder}</Text>
            <TouchableOpacity style={styles.modalOption} onPress={openWhatsApp} testID="reminder-whatsapp">
              <Ionicons name="logo-whatsapp" size={24} color={colors.success} />
              <Text style={styles.modalOptionText}>{t.whatsapp}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={openSMS} testID="reminder-sms">
              <Ionicons name="chatbox-outline" size={24} color={colors.brand} />
              <Text style={styles.modalOptionText}>{t.sms}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  headerName: { fontSize: fontSize.lg, fontWeight: "700", color: colors.onSurface },
  headerPhone: { fontSize: fontSize.sm, color: colors.onSurfaceMuted, marginTop: 2 },

  balanceCard: {
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  balanceLabel: { fontSize: fontSize.sm, color: colors.onSurfaceMuted, marginBottom: spacing.sm, textTransform: "uppercase", letterSpacing: 0.8 },
  balanceAmount: { fontSize: fontSize.xxxl, fontWeight: "800" },
  actionRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg, flexWrap: "wrap", justifyContent: "center" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTint,
  },
  actionBtnPrimary: { backgroundColor: colors.brand },
  actionText: { color: colors.brandDark, fontSize: fontSize.base, fontWeight: "600" },

  infoCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  infoText: { fontSize: fontSize.base, color: colors.onSurfaceTertiary, flex: 1 },

  sectionHeader: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.onSurfaceMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
  },
  txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  txInfo: { flex: 1 },
  txLabel: { fontSize: fontSize.base, fontWeight: "600", color: colors.onSurface },
  txNote: { fontSize: fontSize.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  txDate: { fontSize: 11, color: colors.onSurfaceMuted, marginTop: 2 },
  txAmount: { fontSize: fontSize.lg, fontWeight: "700" },
  txSep: { height: 1, backgroundColor: colors.divider, marginHorizontal: spacing.lg },

  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.onSurface, textAlign: "center" },
  emptyBody: { fontSize: fontSize.base, color: colors.onSurfaceMuted, textAlign: "center" },

  stickyRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  stickyBtn: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  stickyBtnLabel: { alignItems: "flex-start" },
  stickyBtnText: { color: "#fff", fontWeight: "700", fontSize: fontSize.lg, lineHeight: 20 },
  stickyBtnSubtext: {
    color: "#fff",
    opacity: 0.85,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 2,
  },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.surfaceSecondary,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  modalHandle: {
    width: 44,
    height: 4,
    backgroundColor: colors.borderStrong,
    borderRadius: 4,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.md },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  modalOptionText: { fontSize: fontSize.lg, color: colors.onSurface, fontWeight: "500" },
});
