import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { api, MonthlyReport } from "@/src/api";
import { useI18n, Lang } from "@/src/i18n";
import { useToast } from "@/src/components/Toast";
import { colors, spacing, radius, fontSize, formatINR, formatDate } from "@/src/theme";

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_HI = ["जन", "फर", "मार्च", "अप्रैल", "मई", "जून", "जुल", "अग", "सित", "अक्ट", "नव", "दिस"];

export default function Settings() {
  const router = useRouter();
  const { t, lang, setLang } = useI18n();
  const toast = useToast();

  const [pinModal, setPinModal] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);

  const now = new Date();
  const [reportYear, setReportYear] = useState(now.getFullYear());
  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1);
  const [reportBusy, setReportBusy] = useState(false);

  const chooseLang = async (l: Lang) => {
    await setLang(l);
    toast.show(l === "en" ? "English" : "हिंदी", "success");
  };

  const changePin = async () => {
    if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin)) {
      toast.show(t.amountRequired, "error");
      return;
    }
    setPinBusy(true);
    try {
      await api.changePin(currentPin, newPin);
      toast.show(t.save + " \u2713", "success");
      setPinModal(false);
      setCurrentPin("");
      setNewPin("");
    } catch (e: any) {
      toast.show(e?.message || t.error, "error");
    } finally {
      setPinBusy(false);
    }
  };

  const buildHTML = (data: MonthlyReport) => {
    const monthName = (lang === "hi" ? MONTHS_HI : MONTHS_EN)[data.month - 1];
    const rowsHTML = data.rows
      .map((r) => {
        const amtColor = r.type === "gave" ? "#DC2626" : "#16A34A";
        const label = r.type === "gave" ? (lang === "hi" ? "दिए" : "Gave") : lang === "hi" ? "लिए" : "Got";
        return `<tr>
          <td>${formatDate(r.date)}</td>
          <td>${escapeHtml(r.party_name)}</td>
          <td>${escapeHtml(r.note || "-")}</td>
          <td>${label}</td>
          <td style="text-align:right;color:${amtColor};font-weight:600">${formatINR(r.amount)}</td>
        </tr>`;
      })
      .join("");
    const net = data.total_got - data.total_gave;
    const netColor = net >= 0 ? "#16A34A" : "#DC2626";
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;color:#111827}
      h1{margin:0;color:#E05A33}
      .sub{color:#6B7280;margin-top:4px}
      .cards{display:flex;gap:12px;margin:24px 0}
      .card{flex:1;padding:16px;border:1px solid #E5E7EB;border-radius:12px}
      .card .label{font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.6px}
      .card .val{font-size:22px;font-weight:700;margin-top:6px}
      table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
      th,td{border-bottom:1px solid #E5E7EB;padding:8px 6px;text-align:left}
      th{background:#F3F4F6;color:#374151;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
      .foot{margin-top:24px;font-size:11px;color:#6B7280;text-align:center}
    </style></head><body>
    <h1>Mayank Store \u2014 ${lang === "hi" ? "महीने की रिपोर्ट" : "Monthly Report"}</h1>
    <div class="sub">${monthName} ${data.year}</div>
    <div class="cards">
      <div class="card"><div class="label">${lang === "hi" ? "कुल दिए" : "Total Gave"}</div><div class="val" style="color:#DC2626">${formatINR(data.total_gave)}</div></div>
      <div class="card"><div class="label">${lang === "hi" ? "कुल लिए" : "Total Got"}</div><div class="val" style="color:#16A34A">${formatINR(data.total_got)}</div></div>
      <div class="card"><div class="label">${lang === "hi" ? "शुद्ध" : "Net"}</div><div class="val" style="color:${netColor}">${formatINR(net)}</div></div>
    </div>
    <table><thead><tr>
      <th>${lang === "hi" ? "तारीख" : "Date"}</th>
      <th>${lang === "hi" ? "ग्राहक" : "Party"}</th>
      <th>${lang === "hi" ? "नोट" : "Note"}</th>
      <th>${lang === "hi" ? "प्रकार" : "Type"}</th>
      <th style="text-align:right">${lang === "hi" ? "रकम" : "Amount"}</th>
    </tr></thead><tbody>${rowsHTML || `<tr><td colspan="5" style="text-align:center;padding:24px;color:#6B7280">${lang === "hi" ? "इस महीने कोई लेन-देन नहीं" : "No transactions this month"}</td></tr>`}</tbody></table>
    <div class="foot">Generated by Mayank Store Khata</div>
    </body></html>`;
  };

  const generateReport = async () => {
    setReportBusy(true);
    try {
      const data = await api.monthlyReport(reportYear, reportMonth);
      const html = buildHTML(data);
      const { uri } = await Print.printToFileAsync({ html });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: t.monthlyReport });
      }
      toast.show(t.reportGenerated + " \u2713", "success");
      setReportModal(false);
    } catch (e: any) {
      toast.show(e?.message || t.error, "error");
    } finally {
      setReportBusy(false);
    }
  };

  const lockApp = () => {
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="back-btn">
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.settings}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.language}</Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langBtn, lang === "en" && styles.langBtnActive]}
              onPress={() => chooseLang("en")}
              testID="lang-en"
            >
              <Text style={[styles.langText, lang === "en" && styles.langTextActive]}>{t.english}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, lang === "hi" && styles.langBtnActive]}
              onPress={() => chooseLang("hi")}
              testID="lang-hi"
            >
              <Text style={[styles.langText, lang === "hi" && styles.langTextActive]}>{t.hindi}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.row} onPress={() => setPinModal(true)} testID="change-pin-row">
            <Ionicons name="key-outline" size={22} color={colors.brand} />
            <Text style={styles.rowText}>{t.changePin}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceMuted} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => setReportModal(true)} testID="report-row">
            <Ionicons name="document-text-outline" size={22} color={colors.brand} />
            <Text style={styles.rowText}>{t.monthlyReport}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceMuted} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={lockApp} testID="lock-app-row">
            <Ionicons name="lock-closed-outline" size={22} color={colors.brand} />
            <Text style={styles.rowText}>{t.lockApp}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.aboutStore}</Text>
          <Text style={styles.aboutText}>{t.aboutText}</Text>
        </View>
      </ScrollView>

      {/* Change PIN Modal */}
      <Modal visible={pinModal} transparent animationType="fade" onRequestClose={() => setPinModal(false)}>
        <View style={styles.modalBg}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{t.changePin}</Text>
              <TextInput
                value={currentPin}
                onChangeText={(v) => setCurrentPin(v.replace(/\D/g, "").slice(0, 4))}
                style={styles.pinInput}
                placeholder={t.currentPin}
                placeholderTextColor={colors.onSurfaceMuted}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                testID="current-pin-input"
              />
              <TextInput
                value={newPin}
                onChangeText={(v) => setNewPin(v.replace(/\D/g, "").slice(0, 4))}
                style={styles.pinInput}
                placeholder={t.newPin}
                placeholderTextColor={colors.onSurfaceMuted}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                testID="new-pin-input"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setPinModal(false)} style={styles.modalCancel}>
                  <Text style={styles.modalCancelText}>{t.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={changePin}
                  disabled={pinBusy}
                  style={[styles.modalOk, pinBusy && { opacity: 0.6 }]}
                  testID="submit-change-pin"
                >
                  {pinBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalOkText}>{t.save}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal visible={reportModal} transparent animationType="fade" onRequestClose={() => setReportModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t.selectMonth}</Text>
            <View style={styles.monthGrid}>
              {(lang === "hi" ? MONTHS_HI : MONTHS_EN).map((m, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.monthChip, reportMonth === i + 1 && styles.monthChipActive]}
                  onPress={() => setReportMonth(i + 1)}
                  testID={`month-${i + 1}`}
                >
                  <Text style={[styles.monthText, reportMonth === i + 1 && styles.monthTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.yearRow}>
              <TouchableOpacity onPress={() => setReportYear((y) => y - 1)} style={styles.yearBtn} testID="year-minus">
                <Ionicons name="chevron-back" size={20} color={colors.onSurface} />
              </TouchableOpacity>
              <Text style={styles.yearText}>{reportYear}</Text>
              <TouchableOpacity onPress={() => setReportYear((y) => y + 1)} style={styles.yearBtn} testID="year-plus">
                <Ionicons name="chevron-forward" size={20} color={colors.onSurface} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setReportModal(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={generateReport}
                disabled={reportBusy}
                style={[styles.modalOk, reportBusy && { opacity: 0.6 }]}
                testID="generate-report-btn"
              >
                {reportBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalOkText}>{t.generateReport}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
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

  section: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.onSurfaceMuted,
    marginBottom: spacing.md,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  langRow: { flexDirection: "row", gap: spacing.md },
  langBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
  },
  langBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  langText: { fontSize: fontSize.base, color: colors.onSurfaceTertiary, fontWeight: "600" },
  langTextActive: { color: colors.onBrand },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowText: { flex: 1, fontSize: fontSize.lg, color: colors.onSurface, fontWeight: "500" },
  divider: { height: 1, backgroundColor: colors.divider },

  aboutText: { fontSize: fontSize.base, color: colors.onSurfaceMuted, lineHeight: 20 },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.lg },
  modalCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: { fontSize: fontSize.xl, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.lg },
  pinInput: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.xl,
    textAlign: "center",
    marginBottom: spacing.md,
    letterSpacing: 8,
    color: colors.onSurface,
  },
  modalActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  modalCancel: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
  },
  modalCancelText: { fontSize: fontSize.base, color: colors.onSurfaceTertiary, fontWeight: "600" },
  modalOk: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  modalOkText: { color: colors.onBrand, fontSize: fontSize.base, fontWeight: "700" },

  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  monthChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTertiary,
    minWidth: 60,
    alignItems: "center",
  },
  monthChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  monthText: { color: colors.onSurfaceTertiary, fontWeight: "600" },
  monthTextActive: { color: colors.onBrand },

  yearRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.lg, marginBottom: spacing.md },
  yearBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary },
  yearText: { fontSize: fontSize.xl, fontWeight: "700", color: colors.onSurface },
});
