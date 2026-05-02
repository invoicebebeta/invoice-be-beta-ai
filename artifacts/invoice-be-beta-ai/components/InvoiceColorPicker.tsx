import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

const PALETTE = [
  { hex: "#3d5a4c", label: "Sage" },
  { hex: "#1e3a5f", label: "Navy" },
  { hex: "#374151", label: "Charcoal" },
  { hex: "#6b21a8", label: "Purple" },
  { hex: "#9f1239", label: "Crimson" },
  { hex: "#0f4c5c", label: "Teal" },
  { hex: "#7c2d12", label: "Terracotta" },
  { hex: "#1e1b4b", label: "Indigo" },
  { hex: "#166534", label: "Forest" },
  { hex: "#92400e", label: "Amber" },
  { hex: "#1f2937", label: "Midnight" },
  { hex: "#be185d", label: "Rose" },
];

interface Props {
  value?: string;
  onChange: (color: string) => void;
}

export function InvoiceColorPicker({ value, onChange }: Props) {
  const colors = useColors();
  const selected = value ?? PALETTE[0].hex;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={styles.preview}>
        <View style={[styles.swatch, { backgroundColor: selected }]} />
        <Text style={[styles.label, { color: colors.foreground }]}>
          {PALETTE.find((p) => p.hex === selected)?.label ?? "Custom"}
        </Text>
      </View>
      <View style={styles.grid}>
        {PALETTE.map((p) => (
          <Pressable
            key={p.hex}
            onPress={() => onChange(p.hex)}
            style={({ pressed }) => [styles.dot, { backgroundColor: p.hex, opacity: pressed ? 0.8 : 1 }]}
          >
            {selected === p.hex && (
              <Feather name="check" size={14} color="#ffffff" />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 16 },
  preview: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  swatch: { width: 32, height: 32, borderRadius: 8 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
