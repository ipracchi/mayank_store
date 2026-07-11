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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { useToast } from "@/src/components/Toast";
import { colors, spacing, radius, fontSize } from "@/src/theme";

type BalanceType = "none" | "receive" | "pay";

export default function AddParty() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const toast = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [firmName, setFirmName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [balanceType, setBalanceType] = useState<BalanceType>("none");
  const [openingAmount, setOpeningAmount] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSave = async () => {
    if (!name.trim()) {
      toast.show(t.nameRequired, "error");
      return;
    }
    let ob = 0;
    if (balanceType !== "none") {
      const n = parseFloat(openingAmount);
      if (!isNaN(n) && n > 0) {
        ob = balanceType === "receive" ? n : -n;
      }
    }
    setSubmitting(true);
    try {
      const p = await api.createParty({
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        firm_name: firmName.trim() || undefined,
        contact_person: contactPerson.trim() || undefined,
        gst_number: gstNumber.trim() || undefined,
        opening_balance: ob,
      });
      toast.show(t.save + " \u2713", "success");
      router.replace(`/party/${p.id}`);
    } catch (e: any) {
      toast.show(e?.message || t.error, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="back-btn">
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.newParty}</Text>
        <View style={styles.iconBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>{t.name} *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder={t.name}
            placeholderTextColor={colors.onSurfaceMuted}
            autoFocus
            testID="party-name-input"
          />

          <Text style={styles.label}>{t.phone}</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            placeholder="+91 90000 00000"
            placeholderTextColor={colors.onSurfaceMuted}
            keyboardType="phone-pad"
            testID="party-phone-input"
          />

          {/* Opening Balance Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.openingBalance}</Text>
            <Text style={styles.hint}>{t.openingBalanceHint}</Text>

            <View style={styles.balanceRow}>
              <TouchableOpacity
                style={[styles.balanceChip, balanceType === "none" && styles.balanceChipActive]}
                onPress={() => setBalanceType("none")}
                testID="balance-none"
              >
                <Text style={[styles.balanceChipText, balanceType === "none" && styles.balanceChipTextActive]}>
                  {t.noOpeningBalance}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.balanceRow}>
              <TouchableOpacity
                style={[
                  styles.balanceOption,
                  balanceType === "receive" && { borderColor: colors.success, backgroundColor: colors.successTint },
                ]}
                onPress={() => setBalanceType("receive")}
                testID="balance-receive"
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={22}
                  color={balanceType === "receive" ? colors.success : colors.onSurfaceMuted}
                />
                <Text
                  style={[
                    styles.balanceOptionText,
                    balanceType === "receive" && { color: colors.success, fontWeight: "700" },
                  ]}
                >
                  {t.toReceive}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.balanceOption,
                  balanceType === "pay" && { borderColor: colors.error, backgroundColor: colors.errorTint },
                ]}
                onPress={() => setBalanceType("pay")}
                testID="balance-pay"
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={22}
                  color={balanceType === "pay" ? colors.error : colors.onSurfaceMuted}
                />
                <Text
                  style={[
                    styles.balanceOptionText,
                    balanceType === "pay" && { color: colors.error, fontWeight: "700" },
                  ]}
                >
                  {t.toPay}
                </Text>
              </TouchableOpacity>
            </View>

            {balanceType !== "none" && (
              <View style={styles.amountWrap}>
                <Text style={styles.currency}>{"\u20B9"}</Text>
                <TextInput
                  value={openingAmount}
                  onChangeText={(v) => setOpeningAmount(v.replace(/[^0-9.]/g, ""))}
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={colors.borderStrong}
                  keyboardType="decimal-pad"
                  testID="opening-balance-input"
                />
              </View>
            )}
          </View>

          {/* More info toggle */}
          <TouchableOpacity
            style={styles.moreToggle}
            onPress={() => setShowMore((s) => !s)}
            testID="toggle-more-fields"
          >
            <Text style={styles.moreText}>
              {showMore ? "\u2212 " : "+ "}
              {t.firmName} / {t.contactPerson} / {t.gstNumber}
            </Text>
            <Text style={styles.optionalTag}>({t.optional})</Text>
          </TouchableOpacity>

          {showMore && (
            <>
              <Text style={styles.label}>{t.firmName}</Text>
              <TextInput
                value={firmName}
                onChangeText={setFirmName}
                style={styles.input}
                placeholder={t.firmName}
                placeholderTextColor={colors.onSurfaceMuted}
                testID="party-firm-input"
              />

              <Text style={styles.label}>{t.contactPerson}</Text>
              <TextInput
                value={contactPerson}
                onChangeText={setContactPerson}
                style={styles.input}
                placeholder={t.contactPerson}
                placeholderTextColor={colors.onSurfaceMuted}
                testID="party-contact-input"
              />

              <Text style={styles.label}>{t.gstNumber}</Text>
              <TextInput
                value={gstNumber}
                onChangeText={(v) => setGstNumber(v.toUpperCase())}
                style={styles.input}
                placeholder="22AAAAA0000A1Z5"
                placeholderTextColor={colors.onSurfaceMuted}
                autoCapitalize="characters"
                maxLength={15}
                testID="party-gst-input"
              />

              <Text style={styles.label}>{t.address}</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                style={[styles.input, styles.multiline]}
                placeholder={t.address}
                placeholderTextColor={colors.onSurfaceMuted}
                multiline
                testID="party-address-input"
              />
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <TouchableOpacity
            onPress={onSave}
            disabled={submitting}
            style={[styles.saveBtn, submitting && { opacity: 0.6 }]}
            testID="save-party-btn"
          >
            <Text style={styles.saveText}>{t.save}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
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
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.onSurfaceTertiary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.lg,
    color: colors.onSurface,
    minHeight: 52,
  },
  multiline: { height: 96, textAlignVertical: "top" },

  section: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.onSurface },
  hint: { fontSize: fontSize.sm, color: colors.onSurfaceMuted, marginTop: 4, marginBottom: spacing.md },

  balanceRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  balanceChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
  },
  balanceChipActive: { backgroundColor: colors.onSurfaceMuted, borderColor: colors.onSurfaceMuted },
  balanceChipText: { color: colors.onSurfaceTertiary, fontWeight: "600" },
  balanceChipTextActive: { color: "#fff" },
  balanceOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
    flexDirection: "column",
    justifyContent: "center",
  },
  balanceOptionText: { fontSize: fontSize.base, color: colors.onSurfaceTertiary, fontWeight: "600" },

  amountWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currency: { fontSize: fontSize.xxl, color: colors.onSurfaceTertiary, fontWeight: "600" },
  amountInput: {
    flex: 1,
    fontSize: fontSize.xxl,
    fontWeight: "700",
    color: colors.onSurface,
    padding: 0,
  },

  moreToggle: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderStyle: "dashed",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  moreText: { color: colors.brand, fontWeight: "600", fontSize: fontSize.base, flexShrink: 1 },
  optionalTag: { color: colors.onSurfaceMuted, fontSize: fontSize.sm },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  saveBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  saveText: { color: colors.onBrand, fontSize: fontSize.lg, fontWeight: "700" },
});
