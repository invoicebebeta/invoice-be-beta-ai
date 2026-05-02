import React, { useCallback, useMemo, useRef } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useRecurring } from "@/contexts/RecurringContext";
import { useInvoices, FREE_TIER_LIMIT } from "@/contexts/InvoicesContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/lib/revenuecat";
import { ScreenHeader } from "@/components/ScreenHeader";
import { EmptyState } from "@/components/EmptyState";
import { RecurringFrequency } from "@/utils/types";
import { formatMoney, calculateTotal } from "@/utils/calculations";
import { sendInvoiceEmail } from "@/utils/emailApi";

const FREQ_LABEL: Record<RecurringFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

function isDue(nextDueDate: string) {
  return new Date(nextDueDate).getTime() <= Date.now() + 2 * 24 * 60 * 60 * 1000;
}

export default function RecurringScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { templates, loading, updateTemplate, deleteTemplate, buildInvoice, markGenerated } = useRecurring();
  const { addInvoice, canCreateInvoice, monthlyInvoiceCount } = useInvoices();
  const { isSubscribed } = useSubscription();
  const { user } = useAuth();
  const processedRef = useRef<Set<string>>(new Set());

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBar = 84;

  const sorted = useMemo(
    () => [...templates].sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()),
    [templates]
  );

  useFocusEffect(
    useCallback(() => {
      if (loading || !user) return;
      const overdue = templates.filter(
        (t) => t.isActive && t.autoSend && new Date(t.nextDueDate).getTime() <= Date.now() && !processedRef.current.has(t.id)
      );
      if (overdue.length === 0) return;

      (async () => {
        let slotsRemaining = isSubscribed ? Infinity : Math.max(0, FREE_TIER_LIMIT - monthlyInvoiceCount);
        const generated: typeof overdue = [];
        for (const tmpl of overdue) {
          if (slotsRemaining <= 0) break;
          processedRef.current.add(tmpl.id);
          const invoice = buildInvoice(tmpl.id, user.id);
          if (!invoice) continue;
          await addInvoice(invoice);
          await markGenerated(tmpl.id);
          await sendInvoiceEmail(invoice, user);
          generated.push(tmpl);
          slotsRemaining--;
        }
        if (generated.length === 0) return;
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const names = generated.map((t) => t.customerName).join(", ");
        const count = generated.length;
        Alert.alert(
          `${count} invoice${count > 1 ? "s" : ""} sent automatically`,
          `Invoice${count > 1 ? "s" : ""} for ${names} ${count > 1 ? "have" : "has"} been generated and emailed.`
        );
      })();
    }, [templates, loading, user])
  );

  const onGenerate = async (templateId: string) => {
    if (!canCreateInvoice) {
      router.push("/paywall");
      return;
    }
    const tmpl = templates.find((t) => t.id === templateId);
    const invoice = buildInvoice(templateId, user?.id ?? "anonymous");
    if (!invoice || !tmpl) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addInvoice(invoice);
    await markGenerated(templateId);
    if (tmpl.autoSend) {
      await sendInvoiceEmail(invoice, user ?? null);
    }
    router.push(`/invoice/${invoice.id}`);
  };

  const onToggleActive = async (id: string, isActive: boolean) => {
    await updateTemplate(id, { isActive: !isActive });
  };

  const onDelete = (id: string, name: string) => {
    const doDelete = async () => {
      await deleteTemplate(id);
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${name}"?`)) doDelete();
    } else {
      Alert.alert("Delete template?", `"${name}" will be permanently removed.`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: topInset }}>
        <ScreenHeader
          title="Recurring"
          subtitle="Templates that generate invoices automatically"
          right={
            <Pressable
              onPress={() => router.push("/recurring/new")}
              style={({ pressed }) => [
                styles.fabInline,
                { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather name="plus" size={16} color={colors.primaryForeground} />
              <Text style={[styles.fabText, { color: colors.primaryForeground }]}>New</Text>
            </Pressable>
          }
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: tabBar + 24 }}>
        {sorted.length === 0 ? (
          <EmptyState
            icon="repeat"
            title="No recurring templates"
            description="Create a template to auto-generate invoices for retainer clients or subscription work."
          />
        ) : (
          sorted.map((tmpl) => {
            const total = calculateTotal(tmpl.lineItems);
            const due = isDue(tmpl.nextDueDate);
            return (
              <View
                key={tmpl.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: due && tmpl.isActive ? colors.primary : colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                        {tmpl.name}
                      </Text>
                      {due && tmpl.isActive && (
                        <View style={[styles.dueBadge, { backgroundColor: colors.primary }]}>
                          <Text style={[styles.dueBadgeText, { color: colors.primaryForeground }]}>Due</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.customer, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {tmpl.customerName} · {tmpl.customerEmail}
                    </Text>
                  </View>
                  <Text style={[styles.amount, { color: colors.foreground }]}>
                    {formatMoney(total, tmpl.currency)}
                  </Text>
                </View>

                <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
                  <View style={styles.metaItem}>
                    <Feather name="repeat" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                      {FREQ_LABEL[tmpl.frequency]}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Feather name="calendar" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                      Next due {new Date(tmpl.nextDueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </Text>
                  </View>
                  {tmpl.autoSend && (
                    <View style={styles.metaItem}>
                      <Feather name="mail" size={12} color={colors.primary} />
                      <Text style={[styles.metaText, { color: colors.primary }]}>Auto-send</Text>
                    </View>
                  )}
                </View>

                <View style={styles.actions}>
                  <Pressable
                    onPress={() => onGenerate(tmpl.id)}
                    disabled={!tmpl.isActive}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      {
                        backgroundColor: colors.primary,
                        borderRadius: colors.radius,
                        opacity: !tmpl.isActive ? 0.4 : pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Feather name="send" size={13} color={colors.primaryForeground} />
                    <Text style={[styles.actionText, { color: colors.primaryForeground }]}>Generate now</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => onToggleActive(tmpl.id, tmpl.isActive)}
                    style={({ pressed }) => [
                      styles.actionGhost,
                      { borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Feather name={tmpl.isActive ? "pause" : "play"} size={13} color={colors.mutedForeground} />
                    <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
                      {tmpl.isActive ? "Pause" : "Resume"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => router.push(`/recurring/${tmpl.id}`)}
                    style={({ pressed }) => [
                      styles.actionGhost,
                      { borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Feather name="edit-2" size={13} color={colors.mutedForeground} />
                  </Pressable>

                  <Pressable
                    onPress={() => onDelete(tmpl.id, tmpl.name)}
                    style={({ pressed }) => [
                      styles.actionGhost,
                      { borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Feather name="trash-2" size={13} color={colors.destructive} />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fabInline: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  fabText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  card: { borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", padding: 16 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  name: { fontFamily: "Inter_700Bold", fontSize: 16, flexShrink: 1 },
  customer: { fontFamily: "Inter_400Regular", fontSize: 12 },
  amount: { fontFamily: "Inter_700Bold", fontSize: 18, fontVariant: ["tabular-nums"] },
  dueBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  dueBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.3 },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  actions: { flexDirection: "row", gap: 8, padding: 12, paddingTop: 6 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 6,
    flex: 1,
    justifyContent: "center",
  },
  actionGhost: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    gap: 6,
  },
  actionText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});
