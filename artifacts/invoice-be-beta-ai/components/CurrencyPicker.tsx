import React, { useState } from "react";
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { CURRENCIES, getCurrencyOption } from "@/utils/currencies";

type Props = {
  value: string;
  onChange: (code: string) => void;
};

export function CurrencyPicker({ value, onChange }: Props) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const current = getCurrencyOption(value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <View style={[styles.symbolBubble, { backgroundColor: colors.muted }]}>
          <Text style={[styles.symbolText, { color: colors.foreground }]}>{current.symbol}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.code, { color: colors.foreground }]}>{current.code}</Text>
          <Text style={[styles.name, { color: colors.mutedForeground }]}>{current.name}</Text>
        </View>
        <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            onPress={() => {}}
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingBottom: Platform.OS === "web" ? 24 : 36,
              },
            ]}
          >
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Select currency</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(c) => c.code}
              renderItem={({ item }) => {
                const active = item.code === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.code);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.row,
                      { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <View style={[styles.rowSymbol, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.rowSymbolText, { color: colors.foreground }]}>{item.symbol}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.rowCode, { color: colors.foreground }]}>{item.code}</Text>
                      <Text style={[styles.rowName, { color: colors.mutedForeground }]}>{item.name}</Text>
                    </View>
                    {active && <Feather name="check" size={18} color={colors.primary} />}
                  </Pressable>
                );
              }}
              style={{ maxHeight: 480 }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
  },
  symbolBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  symbolText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  code: { fontFamily: "Inter_700Bold", fontSize: 15 },
  name: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { paddingTop: 8 },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(120,120,120,0.4)",
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowSymbol: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  rowSymbolText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  rowCode: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  rowName: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
});
