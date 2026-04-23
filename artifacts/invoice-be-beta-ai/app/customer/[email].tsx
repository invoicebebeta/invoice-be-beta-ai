import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useInvoices } from "@/contexts/InvoicesContext";
import { useAuth } from "@/contexts/AuthContext";
import { InvoiceRow } from "@/components/InvoiceRow";
import { EmptyState } from "@/components/EmptyState";
import { formatMoney } from "@/utils/calculations";

export default function CustomerDetailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const customerEmail = decodeURIComponent(String(email ?? ""));
  const colors = useColors();
  const router = useRouter();
  const { invoices } = useInvoices();
  const { user } = useAuth();

  const customerInvoices = useMemo(
    () =>
      invoices
        .filter((inv) => inv.customerEmail.toLowerCase() === customerEmail.toLowerCase())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [invoices, customerEmail]
  );

  const customerName = customerInvoices[0]?.customerName ?? customerEmail;
  const currency = customerInvoices[0]?.currency ?? user?.currency;

  const stats = useMemo(() => {
    let lifetime = 0;
    let outstanding = 0;
    let paidCount = 0;
    for (const inv of customerInvoices) {
      if (inv.status === "fully_paid") {
        lifetime += inv.total;
        paidCount += 1;
      } else if (inv.status === "deposit_paid") {
        lifetime += inv.depositAmount;
        outstanding += inv.remainingBalance;
      } else {
        outstanding += inv.total;
      }
    }
    return { lifetime, outstanding, paidCount };
  }, [customerInvoices]);

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 }}
      data={customerInvoices}
      keyExtractor={(i) => i.id}
      ListHeaderComponent={
        <View>
          <View
            style={[
              styles.header,
              { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
                {customerName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.name, { color: colors.foreground }]}>{customerName}</Text>
            <Text style={[styles.email, { color: colors.mutedForeground }]}>{customerEmail}</Text>
          </View>

          <View style={styles.statsRow}>
            <Stat
              label="Lifetime"
              value={formatMoney(stats.lifetime, currency)}
              icon="trending-up"
              tone="primary"
            />
            <Stat
              label="Outstanding"
              value={formatMoney(stats.outstanding, currency)}
              icon="clock"
              tone="muted"
            />
          </View>
          <View style={styles.statsRow}>
            <Stat
              label="Invoices"
              value={String(customerInvoices.length)}
              icon="file-text"
              tone="muted"
            />
            <Stat
              label="Paid"
              value={String(stats.paidCount)}
              icon="check-circle"
              tone="muted"
            />
          </View>

          <Text style={[styles.section, { color: colors.mutedForeground }]}>Invoice history</Text>
        </View>
      }
      renderItem={({ item }) => (
        <InvoiceRow invoice={item} onPress={() => router.push(`/invoice/${item.id}`)} />
      )}
      ListEmptyComponent={
        <EmptyState
          icon="users"
          title="No invoices for this customer"
          description="Create an invoice to start tracking work with this customer."
        />
      }
    />
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  tone: "primary" | "muted";
}) {
  const colors = useColors();
  const isPrimary = tone === "primary";
  return (
    <View
      style={[
        styles.stat,
        {
          backgroundColor: isPrimary ? colors.primary : colors.card,
          borderColor: isPrimary ? colors.primary : colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={styles.statTopRow}>
        <Feather name={icon} size={14} color={isPrimary ? colors.primaryForeground : colors.mutedForeground} />
        <Text
          style={[
            styles.statLabel,
            { color: isPrimary ? colors.primaryForeground : colors.mutedForeground },
          ]}
        >
          {label}
        </Text>
      </View>
      <Text
        style={[
          styles.statValue,
          { color: isPrimary ? colors.primaryForeground : colors.foreground },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 22 },
  name: { fontFamily: "Inter_700Bold", fontSize: 18 },
  email: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  stat: { flex: 1, padding: 14, borderWidth: 1, marginRight: 10 },
  statTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 6 },
  statLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginLeft: 6,
  },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 18, fontVariant: ["tabular-nums"] },
  section: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 12,
  },
});
