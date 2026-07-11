import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { colors, radius, spacing, fontSize } from "@/src/theme";

type ToastKind = "info" | "success" | "error";
type ToastCtx = { show: (msg: string, kind?: ToastKind) => void };

const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string>("");
  const [kind, setKind] = useState<ToastKind>("info");
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, k: ToastKind = "info") => {
    setMsg(message);
    setKind(k);
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    }, 2400);
  }, [opacity]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const bg =
    kind === "success" ? colors.success :
    kind === "error" ? colors.error :
    colors.surfaceInverse;

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[styles.wrap, { opacity, backgroundColor: bg }]}
      >
        <Text style={styles.text} testID="toast-message">{msg}</Text>
      </Animated.View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xxl + 20,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    zIndex: 9999,
  },
  text: {
    color: "#fff",
    fontSize: fontSize.lg,
    fontWeight: "500",
    textAlign: "center",
  },
});
