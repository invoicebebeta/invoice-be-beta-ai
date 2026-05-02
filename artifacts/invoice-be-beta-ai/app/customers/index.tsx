import React, { useMemo, useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useCustomers } from "@/contexts/CustomersContext";
import { useInvoices } from "@/contexts/InvoicesContext";
import { EmptyState } from "@/components/EmptyState";
import { Customer } from "@/utils/types";
import { formatMoney } from "@/utils/calculations";

export default function CustomersScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { customers, deleteCustomer } = useCustomers();
  const { invoices } = useInvoices();
  const [query, setQuery] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const enriched = useMemo(() => {
    return customers.map((c) => {
      const cInvoices = invoices.filter(
        (inv) => inv.customerEmail.toLowerCase() === c.email.toLowerCase()
      );
      const total = cInvoices.reduce((s, inv) => {
        if (inv.status === "fully_paid") return s + inv.total;
        if (inv.status === "deposit_paid") return s + inv.depositAmount;
        return s;
      }, 0);
      const currency = cInvoices[0]?.currency;
      return { ...c, invoiceCount: cInvoices.length, lifetimeValue: total, currency };
    });
  }, [customers, invoices]);

  const filtered = useMemo(() => {
    if (!query.trim()) return enriched;
    const q = query.trim().toLowerCase();
    return enriched.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
    );
  }, [enriched, query]);

  const handleDelete = (c: Customer) => {
    const doDelete = () => deleteCustomer(c.id);
    if (Platform.OS === "web") {
      if (window.confirm(`Remove ${c.name} from your address book?`)) doDelete();
    } else {
      Alert.alert(
        "Remove customer?",
        `Remove ${c.name} from your address book? Their invoice history will not be affected.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: doDelete },
        ]
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: topInset + 8 }}
        ListHeaderComponent={
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Address book</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {customers.length} {customers.length === 1 ? "customer" : "customers"} saved
            </Text>
            <View
              style={[
                styles.searchWrap,
                { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
              ]}
            >
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                placeholder="Search customers"
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
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/customer/${encodeURIComponent(item.email)}`)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.customerName, { color: colors.foreground }]}>{item.name}</Text>
              <Text style={[styles.customerEmail, { color: colors.mutedForeground }]}>{item.email}</Text>
              {item.phone ? (
                <Text style={[styles.customerPhone, { color: colors.mutedForeground }]}>{item.phone}</Text>
              ) : null}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {formatMoney(item.lifetimeValue, item.currency)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                {item.invoiceCount} {item.invoiceCount === 1 ? "invoice" : "invoices"}
              </Text>
            </View>
            <Pressable
              onPress={() => handleDelete(item)}
              hitSlop={8}
              style={{ padding: 8, marginLeft: 4 }}
            >
              <Feather name="trash-2" size={15} color={colors.mutedForeground} />
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          query.trim() ? (
            <EmptyState icon="search" title="No matches" description="Try a different search term." />
          ) : (
            <EmptyState
              icon="users"
              title="No customers yet"
              description="Customers are saved automatically when you create invoices or quotes."
            />
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: "Inter_700Bold", fontSize: 24, marginBottom: 4 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, marginBottom: 16 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "web" ? 10 : 8,
    borderWidth: 1,
    marginBottom: 16,
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
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 17 },
  customerName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  customerEmail: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  customerPhone: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 14, fontVariant: ["tabular-nums"] },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
});
