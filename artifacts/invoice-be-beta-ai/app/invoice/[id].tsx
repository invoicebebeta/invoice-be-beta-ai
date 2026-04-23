import React, { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { useColors } from "@/hooks/useColors";
import { useInvoices } from "@/contexts/InvoicesContext";
import { AmountBreakdown } from "@/components/AmountBreakdown";
import { StatusBadge } from "@/components/StatusBadge";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { Invoice, InvoiceStatus } from "@/utils/types";
import { simulatePayment } from "@/utils/mockPayment";
import { formatMoney } from "@/utils/calculations";
import { generateShareLink } from "@/utils/mockLinks";

const NEXT_ACTION: Record<InvoiceStatus, string> = {
  draft: "Send invoice to customer",
  awaiting_deposit: "Deposit required",
  deposit_paid: "Awaiting final payment",
  fully_paid: "Paid in full",
};

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { getInvoice, updateInvoice, duplicateInvoice, deleteInvoice } = useInvoices();
  const invoice = getInvoice(String(id));
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  if (!invoice) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>Invoice not found</Text>
      </View>
    );
  }

  const haptic = (type: "success" | "warning" = "success") => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(
        type === "success" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
      );
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const requestDeposit = async () => {
    setPendingAction("request_deposit");
    await updateInvoice(invoice.id, {
      status: "awaiting_deposit",
      depositLink: invoice.depositLink ?? generateShareLink(invoice.id, "deposit"),
    });
    setPendingAction(null);
    haptic();
    showAlert("Deposit requested", "We've generated a payment link you can share with your customer.");
  };

  const markDepositPaid = async () => {
    setPendingAction("mark_deposit");
    await updateInvoice(invoice.id, { status: "deposit_paid" });
    setPendingAction(null);
    haptic();
  };

  const payDeposit = async () => {
    setPendingAction("pay_deposit");
    const r = await simulatePayment(invoice.depositAmount);
    setPendingAction(null);
    if (r.success) {
      await updateInvoice(invoice.id, { status: "deposit_paid" });
      haptic("success");
      showAlert("Payment successful", `Deposit of ${formatMoney(invoice.depositAmount, invoice.currency)} received.`);
    } else {
      haptic("warning");
      showAlert("Payment failed", "The simulated payment failed. Try again.");
    }
  };

  const requestFinal = async () => {
    setPendingAction("request_final");
    await updateInvoice(invoice.id, {
      finalLink: invoice.finalLink ?? generateShareLink(invoice.id, "final"),
    });
    setPendingAction(null);
    haptic();
    showAlert("Final payment requested", "We've generated a final payment link you can share.");
  };

  const markFullyPaid = async () => {
    setPendingAction("mark_full");
    await updateInvoice(invoice.id, { status: "fully_paid" });
    setPendingAction(null);
    haptic();
    router.push(`/review/${invoice.id}`);
  };

  const payRemaining = async () => {
    setPendingAction("pay_remaining");
    const r = await simulatePayment(invoice.remainingBalance);
    setPendingAction(null);
    if (r.success) {
      await updateInvoice(invoice.id, { status: "fully_paid" });
      haptic("success");
      router.push(`/review/${invoice.id}`);
    } else {
      haptic("warning");
      showAlert("Payment failed", "The simulated payment failed. Try again.");
    }
  };

  const onDelete = () => {
    const doDelete = async () => {
      await deleteInvoice(invoice.id);
      haptic();
      router.replace("/(tabs)");
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Delete this draft for ${invoice.customerName}? This cannot be undone.`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        "Delete draft?",
        `This will permanently remove the invoice for ${invoice.customerName}.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: doDelete },
        ]
      );
    }
  };

  const onDuplicate = async () => {
    setPendingAction("duplicate");
    const copy = await duplicateInvoice(invoice.id);
    setPendingAction(null);
    if (copy) {
      haptic();
      router.replace(`/invoice/${copy.id}`);
    }
  };

  const copyLink = async (link: string) => {
    await Clipboard.setStringAsync(link);
    if (Platform.OS !== "web") Haptics.selectionAsync();
    showAlert("Link copied", link);
  };

  const showAwaitingBanner = invoice.status === "awaiting_deposit" || invoice.status === "draft" || invoice.status === "deposit_paid";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      {showAwaitingBanner && (
        <View style={[styles.banner, {
          backgroundColor: invoice.status === "deposit_paid" ? "#dbeafe" : invoice.status === "awaiting_deposit" ? "#fef3c7" : colors.muted,
          borderRadius: colors.radius,
        }]}>
          <Feather
            name={invoice.status === "deposit_paid" ? "clock" : invoice.status === "awaiting_deposit" ? "alert-circle" : "edit-3"}
            size={18}
            color={invoice.status === "deposit_paid" ? "#1e40af" : invoice.status === "awaiting_deposit" ? "#92400e" : colors.mutedForeground}
          />
          <Text style={[styles.bannerText, { color: invoice.status === "deposit_paid" ? "#1e40af" : invoice.status === "awaiting_deposit" ? "#92400e" : colors.foreground }]}>
            {NEXT_ACTION[invoice.status]}
          </Text>
        </View>
      )}

      <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.customerName, { color: colors.foreground }]}>{invoice.customerName}</Text>
            <Text style={[styles.customerEmail, { color: colors.mutedForeground }]}>{invoice.customerEmail}</Text>
          </View>
          <StatusBadge status={invoice.status} />
        </View>
        <Text style={[styles.due, { color: colors.mutedForeground }]}>
          Due {new Date(invoice.dueDate).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
        </Text>
      </View>

      <Text style={[styles.section, { color: colors.mutedForeground }]}>Line items</Text>
      <View style={[styles.itemsCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        {invoice.lineItems.map((it, i) => (
          <View key={it.id} style={[styles.itemRow, i < invoice.lineItems.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.itemName, { color: colors.foreground }]}>{it.name}</Text>
              {it.description ? <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{it.description}</Text> : null}
              <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                {it.quantity} × {formatMoney(it.price, invoice.currency)}
              </Text>
            </View>
            <Text style={[styles.itemTotal, { color: colors.foreground }]}>{formatMoney(it.price * it.quantity, invoice.currency)}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 20 }]}>Amount</Text>
      <AmountBreakdown
        currency={invoice.currency}
        rows={[
          { label: "Total", value: invoice.total, emphasis: !invoice.requireDeposit },
          ...(invoice.requireDeposit
            ? [
                { label: "Deposit", value: invoice.depositAmount },
                { label: "Remaining", value: invoice.remainingBalance, emphasis: true },
              ]
            : []),
        ]}
      />

      {(invoice.depositLink || invoice.finalLink) && (
        <>
          <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 20 }]}>Shareable links</Text>
          {invoice.depositLink && <LinkRow label="Deposit link" value={invoice.depositLink} onCopy={copyLink} />}
          {invoice.finalLink && <LinkRow label="Final payment link" value={invoice.finalLink} onCopy={copyLink} />}
        </>
      )}

      <View style={{ marginTop: 24, gap: 10 }}>
        {invoice.status === "draft" && invoice.requireDeposit && (
          <PrimaryButton title="Request deposit" onPress={requestDeposit} loading={pendingAction === "request_deposit"} icon="send" />
        )}
        {invoice.status === "awaiting_deposit" && (
          <>
            <PrimaryButton title={`Pay deposit (${formatMoney(invoice.depositAmount, invoice.currency)})`} onPress={payDeposit} loading={pendingAction === "pay_deposit"} icon="credit-card" />
            <SecondaryButton title="Mark deposit as paid" onPress={markDepositPaid} icon="check" />
          </>
        )}
        {invoice.status === "deposit_paid" && (
          <>
            <PrimaryButton title={`Pay remaining (${formatMoney(invoice.remainingBalance, invoice.currency)})`} onPress={payRemaining} loading={pendingAction === "pay_remaining"} icon="credit-card" variant="success" />
            <SecondaryButton title="Request final payment" onPress={requestFinal} icon="send" />
            <SecondaryButton title="Mark as fully paid" onPress={markFullyPaid} icon="check-circle" />
          </>
        )}
        {invoice.status === "draft" && !invoice.requireDeposit && (
          <>
            <PrimaryButton title={`Pay invoice (${formatMoney(invoice.total, invoice.currency)})`} onPress={payRemaining} loading={pendingAction === "pay_remaining"} icon="credit-card" variant="success" />
            <SecondaryButton title="Request payment" onPress={requestFinal} icon="send" />
            <SecondaryButton title="Mark as fully paid" onPress={markFullyPaid} icon="check-circle" />
          </>
        )}
        {invoice.status === "fully_paid" && (
          <PrimaryButton title="Leave a review" onPress={() => router.push(`/review/${invoice.id}`)} icon="star" variant="success" />
        )}
        {invoice.status === "draft" && (
          <SecondaryButton title="Edit invoice" onPress={() => router.push(`/(tabs)/create?editId=${invoice.id}`)} icon="edit-2" />
        )}
        <SecondaryButton title="Duplicate invoice" onPress={onDuplicate} icon="copy" />
        {invoice.status === "draft" && (
          <SecondaryButton title="Delete draft" onPress={onDelete} icon="trash-2" variant="destructive" />
        )}
      </View>
    </ScrollView>
  );
}

function LinkRow({ label, value, onCopy }: { label: string; value: string; onCopy: (v: string) => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => onCopy(value)}
      style={({ pressed }) => [
        styles.linkRow,
        { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.linkLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.linkValue, { color: colors.foreground }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Feather name="copy" size={16} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", padding: 14, marginBottom: 16, gap: 10 },
  bannerText: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginLeft: 8 },
  headerCard: { padding: 18, borderWidth: 1, marginBottom: 18 },
  customerName: { fontFamily: "Inter_700Bold", fontSize: 20 },
  customerEmail: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  due: { fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 6 },
  section: { fontFamily: "Inter_600SemiBold", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  itemsCard: { borderWidth: 1, paddingHorizontal: 16 },
  itemRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 14 },
  itemName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  itemDesc: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2, lineHeight: 17 },
  itemMeta: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 },
  itemTotal: { fontFamily: "Inter_600SemiBold", fontSize: 14, fontVariant: ["tabular-nums"] },
  linkRow: { flexDirection: "row", alignItems: "center", padding: 14, borderWidth: 1, marginBottom: 8 },
  linkLabel: { fontFamily: "Inter_500Medium", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 },
  linkValue: { fontFamily: "Inter_500Medium", fontSize: 13 },
});
