import React, { useMemo, useState } from "react";
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useInvoices } from "@/contexts/InvoicesContext";
import { useAuth } from "@/contexts/AuthContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { RevenueCard } from "@/components/RevenueCard";
import { InvoiceRow } from "@/components/InvoiceRow";
import { EmptyState } from "@/components/EmptyState";
import { InvoiceStatus } from "@/utils/types";

type FilterKey = "all" | "overdue" | InvoiceStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "draft", label: "Draft" },
  { key: "awaiting_deposit", label: "Awaiting deposit" },
  { key: "deposit_paid", label: "Deposit paid" },
  { key: "fully_paid", label: "Paid" },
];

const isOverdueInvoice = (inv: { status: InvoiceStatus; dueDate: string }) =>
  inv.status !== "fully_paid" && new Date(inv.dueDate).getTime() < Date.now();

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { invoices, totalRevenue } = useInvoices();
  const { user } = useAuth();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBar = Platform.OS === "web" ? 84 : 84;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (filter === "overdue") {
        if (!isOverdueInvoice(inv)) return false;
      } else if (filter !== "all" && inv.status !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerEmail.toLowerCase().includes(q) ||
        inv.lineItems.some((li) => li.name.toLowerCase().includes(q) || li.description.toLowerCase().includes(q))
      );
    });
  }, [invoices, query, filter]);

  const counts = useMemo(() => {
    const map: Record<FilterKey, number> = {
      all: invoices.length,
      overdue: 0,
      draft: 0,
      awaiting_deposit: 0,
      deposit_paid: 0,
      fully_paid: 0,
    };
    for (const inv of invoices) {
      map[inv.status] += 1;
      if (isOverdueInvoice(inv)) map.overdue += 1;
    }
    return map;
  }, [invoices]);

  const isFiltering = query.trim().length > 0 || filter !== "all";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: topInset }}>
        <ScreenHeader title="Dashboard" subtitle="Your invoices at a glance" />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: tabBar + 24 }}
        ListHeaderComponent={
          <View>
            <RevenueCard total={totalRevenue} count={invoices.length} currency={user?.currency} />
            {invoices.length > 0 && (
              <>
                <View
                  style={[
                    styles.searchWrap,
                    { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
                  ]}
                >
                  <Feather name="search" size={16} color={colors.mutedForeground} />
                  <TextInput
                    placeholder="Search by customer or item"
                    placeholderTextColor={colors.mutedForeground}
                    value={query}
                    onChangeText={setQuery}
                    style={[styles.searchInput, { color: colors.foreground }]}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {query.length > 0 && (
                    <Pressable onPress={() => setQuery("")} hitSlop={10}>
                      <Feather name="x" size={16} color={colors.mutedForeground} />
                    </Pressable>
                  )}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterRow}
                >
                  {FILTERS.map((f) => {
                    const active = filter === f.key;
                    const count = counts[f.key];
                    return (
                      <Pressable
                        key={f.key}
                        onPress={() => setFilter(f.key)}
                        style={({ pressed }) => [
                          styles.filterChip,
                          {
                            borderRadius: colors.radius,
                            backgroundColor: active ? colors.primary : colors.card,
                            borderColor: active ? colors.primary : colors.border,
                            opacity: pressed ? 0.85 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterText,
                            { color: active ? colors.primaryForeground : colors.foreground },
                          ]}
                        >
                          {f.label}
                        </Text>
                        <View
                          style={[
                            styles.countBubble,
                            { backgroundColor: active ? "rgba(255,255,255,0.25)" : colors.muted },
                          ]}
                        >
                          <Text
                            style={[
                              styles.countText,
                              { color: active ? colors.primaryForeground : colors.mutedForeground },
                            ]}
                          >
                            {count}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <InvoiceRow invoice={item} onPress={() => router.push(`/invoice/${item.id}`)} />
        )}
        ListEmptyComponent={
          isFiltering ? (
            <EmptyState
              icon="search"
              title="No matches"
              description="Try a different search or status filter."
            />
          ) : (
            <EmptyState
              icon="file-text"
              title="No invoices yet"
              description="Tap the plus button to create your first invoice."
            />
          )
        }
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "web" ? 10 : 8,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    marginLeft: 8,
    paddingVertical: 4,
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  filterRow: { paddingBottom: 14, gap: 8, paddingRight: 4 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  countBubble: {
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  countText: { fontFamily: "Inter_700Bold", fontSize: 11, fontVariant: ["tabular-nums"] },
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
