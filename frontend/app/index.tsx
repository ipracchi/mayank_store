import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { api } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { useToast } from "@/src/components/Toast";
import PinKeypad from "@/src/components/PinKeypad";
import { colors, spacing, fontSize } from "@/src/theme";

type Mode = "loading" | "setup" | "confirm" | "verify";

export default function PinScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>("loading");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [errorText, setErrorText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const shake = useRef(new Animated.Value(0)).current;

useEffect(() => {
  (async () => {
    try {
      const status = await api.authStatus();

      if (status.pin_set) {
        setMode("verify");
      } else {
        setMode("setup");
      }
    } catch (e) {
      setMode("setup");
    }
  })();
}, []);

  const triggerShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    Animated.sequence([
      Animated.timing(shake, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const onSubmit = async (completed: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (mode === "setup") {
        setFirstPin(completed);
        setPin("");
        setMode("confirm");
        setErrorText("");
      } else if (mode === "confirm") {
        if (completed !== firstPin) {
          setErrorText(t.pinsDontMatch);
          triggerShake();
          setPin("");
        } else {
          await api.setupPin(completed);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          router.replace("/dashboard");
        }
      } else if (mode === "verify") {
        try {
          await api.verifyPin(completed);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          router.replace("/dashboard");
        } catch {
          setErrorText(t.incorrectPin);
          triggerShake();
          setPin("");
        }
      }
    } catch (e: any) {
      setErrorText(e?.message || t.error);
      triggerShake();
      setPin("");
    } finally {
      setSubmitting(false);
    }
  };

  const onKey = (digit: string) => {
    if (pin.length >= 4) return;
    setErrorText("");
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => onSubmit(next), 120);
    }
  };

  const onDelete = () => {
    setErrorText("");
    setPin((p) => p.slice(0, -1));
  };

  if (mode === "loading") {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  const title =
    mode === "setup" ? t.setPin : mode === "confirm" ? t.confirmPin : t.enterPin;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.topSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>MS</Text>
          </View>
          <Text style={styles.appName}>{t.appName}</Text>
          <Text style={styles.tagline}>{t.shopTagline}</Text>
        </View>

        <View style={styles.middleSection}>
          <Text style={styles.title}>{title}</Text>
          <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shake }] }]} testID="pin-dots">
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.dot, i < pin.length && styles.dotFilled]}
              />
            ))}
          </Animated.View>
          <Text style={styles.errorText} testID="pin-error">
            {errorText}
          </Text>
        </View>

        <View style={styles.bottomSection}>
          <PinKeypad onKey={onKey} onDelete={onDelete} />
          {mode === "verify" && (
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={async () => {
  try {
    await api.resetPin();
    router.replace("/");
  } catch (e: any) {
    toast.show(e.message, "error");
  }
}}
              testID="forgot-pin-btn"
            >
              <Text style={styles.forgotText}>{t.forgotPin}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  container: { flex: 1, justifyContent: "space-between" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topSection: {
    alignItems: "center",
    paddingTop: spacing.xl,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 76,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  logoText: {
    color: colors.onBrand,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 2,
  },
  appName: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
    color: colors.onSurface,
  },
  tagline: {
    marginTop: 4,
    fontSize: fontSize.base,
    color: colors.onSurfaceMuted,
  },
  middleSection: { alignItems: "center", paddingHorizontal: spacing.lg },
  title: {
    fontSize: fontSize.lg,
    color: colors.onSurfaceTertiary,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  dotsRow: { flexDirection: "row", gap: spacing.lg },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: "transparent",
  },
  dotFilled: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  errorText: {
    marginTop: spacing.md,
    color: colors.error,
    fontSize: fontSize.base,
    minHeight: 20,
    fontWeight: "500",
  },
  bottomSection: { paddingBottom: spacing.lg },
  forgotBtn: { alignItems: "center", marginTop: spacing.lg },
  forgotText: { color: colors.onSurfaceMuted, fontSize: fontSize.base },
});
