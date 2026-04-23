import React from "react";
import { FlatList, Platform, Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useInvoices } from "@/contexts/InvoicesContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { RevenueCard } from "@/components/RevenueCard";
import { InvoiceRow } from "@/components/InvoiceRow";
import { EmptyState } from "@/components/EmptyState";

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { invoices, totalRevenue } = useInvoices();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBar = Platform.OS === "web" ? 84 : 84;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: topInset }}>
        <ScreenHeader title="Dashboard" subtitle="Your invoices at a glance" />
      </View>

      <FlatList
        data={invoices}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: tabBar + 24 }}
        ListHeaderComponent={<RevenueCard total={totalRevenue} count={invoices.length} />}
        renderItem={({ item }) => (
          <InvoiceRow invoice={item} onPress={() => router.push(`/invoice/${item.id}`)} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="file-text"
            title="No invoices yet"
            description="Tap the plus button to create your first invoice."
          />
        }
        scrollEnabled={!!invoices.length || true}
      />

      <Pressable
        onPress={() => router.push("/(tabs)/create")}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: tabBar + 16,
            opacity: pressed ? 0.85 : 1,
            shadowColor: colors.foreground,
          },
        ]}
      >
        <Feather name="plus" size={26} color={colors.primaryForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
