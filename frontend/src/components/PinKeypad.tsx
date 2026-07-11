import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, spacing, radius, fontSize } from "@/src/theme";

type Props = {
  onKey: (digit: string) => void;
  onDelete: () => void;
};

const KEYS: (string | "del")[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export default function PinKeypad({ onKey, onDelete }: Props) {
  const press = (k: string | "del" | "") => {
    if (k === "") return;
    Haptics.selectionAsync().catch(() => {});
    if (k === "del") onDelete();
    else onKey(k);
  };

  return (
    <View style={styles.grid} testID="pin-keypad">
      {KEYS.map((k, idx) => {
        if (k === "") {
          return <View key={idx} style={styles.key} />;
        }
        return (
          <TouchableOpacity
            key={idx}
            style={styles.key}
            activeOpacity={0.6}
            onPress={() => press(k)}
            testID={k === "del" ? "pin-key-delete" : `pin-key-${k}`}
          >
            {k === "del" ? (
              <Ionicons name="backspace-outline" size={28} color={colors.onSurface} />
            ) : (
              <Text style={styles.keyText}>{k}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  key: {
    width: "30%",
    aspectRatio: 1.6,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyText: {
    fontSize: fontSize.xxl + 4,
    fontWeight: "600",
    color: colors.onSurface,
  },
});
