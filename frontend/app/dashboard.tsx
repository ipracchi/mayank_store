import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { api, Party, Summary } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { useToast } from "@/src/components/Toast";
import { colors, spacing, radius, fontSize, formatINR, formatDate } from "@/src/theme";

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const toast = useToast();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([api.getSummary(), api.listParties(search.trim() || undefined)]);
      setSummary(s);
      setParties(p);
    } catch (e: any) {
      toast.show(e?.message || t.error, "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, toast, t.error]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  useEffect(() => {
    const id = setTimeout(load, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderParty = ({ item }: { item: Party }) => {
    const bal = item.balance;
    const isPositive = bal > 0;
    const isNegative = bal < 0;
    return (
      <TouchableOpacity
        style={styles.partyRow}
        onPress={() => router.push(`/party/${item.id}`)}
        activeOpacity={0.7}
        testID={`party-row-${item.id}`}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.partyInfo}>
          <Text style={styles.partyName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.partyMeta} numberOfLines={1}>
            {item.last_transaction_at ? formatDate(item.last_transaction_at) : (item.phone || "\u2014")}
          </Text>
        </View>
        <View style={styles.balanceCol}>
          <Text
            style={[
              styles.balanceAmount,
              isPositive && { color: colors.success },
              isNegative && { color: colors.error },
              !isPositive && !isNegative && { color: colors.onSurfaceMuted },
            ]}
          >
            {formatINR(bal)}
          </Text>
          <Text
            style={[
              styles.balanceLabel,
              isPositive && { color: colors.success },
              isNegative && { color: colors.error },
              !isPositive && !isNegative && { color: colors.onSurfaceMuted },
            ]}
          >
            {isPositive ? t.theyOweYou : isNegative ? t.youOweThem : t.settled}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const header = (
    <View>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.giveCard]} testID="summary-give-card">
          <View style={styles.summaryIcon}>
            <Ionicons name="arrow-up-circle" size={22} color={colors.error} />
          </View>
          <Text style={styles.summaryLabel}>{t.youWillGive}</Text>
          <Text style={[styles.summaryAmount, { color: colors.error }]} testID="summary-payable-amount">
            {formatINR(summary?.total_payable || 0)}
          </Text>
        </View>
        <View style={[styles.summaryCard, styles.getCard]} testID="summary-get-card">
          <View style={styles.summaryIcon}>
            <Ionicons name="arrow-down-circle" size={22} color={colors.success} />
          </View>
          <Text style={styles.summaryLabel}>{t.youWillGet}</Text>
          <Text style={[styles.summaryAmount, { color: colors.success }]} testID="summary-receivable-amount">
            {formatINR(summary?.total_receivable || 0)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.remindersBanner}
        onPress={() => router.push("/reminders")}
        activeOpacity={0.8}
        testID="reminders-banner"
      >
        <Ionicons name="notifications-outline" size={20} color={colors.brandDark} />
        <Text style={styles.remindersText}>{t.reminders}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.brandDark} />
      </TouchableOpacity>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.onSurfaceMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t.searchParties}
          placeholderTextColor={colors.onSurfaceMuted}
          style={styles.searchInput}
          testID="search-input"
        />
      </View>

      <Text style={styles.sectionHeader}>{t.parties}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerLogo}>
            <Text style={styles.headerLogoText}>MS</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>{t.appName}</Text>
            <Text style={styles.headerSubtitle}>{t.shopTagline}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/settings")}
          style={styles.iconBtn}
          testID="settings-btn"
        >
          <Ionicons name="settings-outline" size={22} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={parties}
          keyExtractor={(p) => p.id}
          renderItem={renderParty}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
          }
          ListEmptyComponent={
            <View style={styles.empty} testID="empty-state">
              <View style={styles.emptyCircle}>
                <Ionicons name="people-outline" size={48} color={colors.brand} />
              </View>
              <Text style={styles.emptyTitle}>
                {search ? t.noResults : t.emptyPartiesTitle}
              </Text>
              {!search && (
                <Text style={styles.emptyBody}>{t.emptyPartiesBody}</Text>
              )}
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => router.push("/add-party")}
        activeOpacity={0.85}
        testID="add-party-fab"
      >
        <Ionicons name="add" size={22} color={colors.onBrand} />
        <Text style={styles.fabText}>{t.addParty}</Text>
      </TouchableOpacity>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 44,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogoText: { color: colors.onBrand, fontWeight: "800", fontSize: fontSize.lg, letterSpacing: 1 },
  headerTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.onSurface },
  headerSubtitle: { fontSize: fontSize.sm, color: colors.onSurfaceMuted, marginTop: 2 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },

  summaryRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  giveCard: {},
  getCard: {},
  summaryIcon: { marginBottom: spacing.sm },
  summaryLabel: { fontSize: fontSize.sm, color: colors.onSurfaceMuted, marginBottom: 4 },
  summaryAmount: { fontSize: fontSize.xl, fontWeight: "700" },

  remindersBanner: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.brandTint,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  remindersText: { flex: 1, fontSize: fontSize.base, color: colors.brandDark, fontWeight: "600" },

  searchWrap: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchInput: { flex: 1, color: colors.onSurface, fontSize: fontSize.base },

  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.onSurfaceMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  partyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  avatarText: { color: colors.brandDark, fontWeight: "700", fontSize: fontSize.lg },
  partyInfo: { flex: 1, marginRight: spacing.sm },
  partyName: { fontSize: fontSize.lg, fontWeight: "600", color: colors.onSurface },
  partyMeta: { fontSize: fontSize.sm, color: colors.onSurfaceMuted, marginTop: 2 },
  balanceCol: { alignItems: "flex-end" },
  balanceAmount: { fontSize: fontSize.lg, fontWeight: "700" },
  balanceLabel: { fontSize: 11, marginTop: 2 },

  separator: { height: 1, backgroundColor: colors.divider, marginHorizontal: spacing.lg },

  empty: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  emptyCircle: {
    width: 100,
    height: 100,
    borderRadius: 100,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.onSurface,
    textAlign: "center",
  },
  emptyBody: {
    marginTop: spacing.sm,
    fontSize: fontSize.base,
    color: colors.onSurfaceMuted,
    textAlign: "center",
    lineHeight: 20,
  },

  fab: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: colors.brand,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  fabText: { color: colors.onBrand, fontWeight: "700", fontSize: fontSize.lg },
});
