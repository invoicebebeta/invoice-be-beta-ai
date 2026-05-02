import React, { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useInvoices } from "@/contexts/InvoicesContext";
import { AmountBreakdown } from "@/components/AmountBreakdown";
import { StatusBadge } from "@/components/StatusBadge";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { Invoice, InvoiceStatus } from "@/utils/types";
import { simulatePayment } from "@/utils/mockPayment";
import {
  calculateDiscountTotal,
  calculateSubtotal,
  calculateTaxTotal,
  formatMoney,
  lineTotal,
} from "@/utils/calculations";
import { downloadInvoicePdf } from "@/utils/invoicePdf";
import { createStripeCheckout } from "@/utils/stripeApi";
import { sendInvoiceEmail } from "@/utils/emailApi";
import { getReviewPageUrl, sendReviewRequestEmail } from "@/utils/reviewApi";
import * as Sharing from "expo-sharing";

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
  const { getInvoice, updateInvoice, duplicateInvoice, deleteInvoice, convertQuoteToInvoice } = useInvoices();
  const { user } = useAuth();
  const invoice = getInvoice(String(id));
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [stripeLinkLoading, setStripeLinkLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [reviewEmailLoading, setReviewEmailLoading] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);

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

  const handleConvertToInvoice = async () => {
    setConvertLoading(true);
    const converted = await convertQuoteToInvoice(invoice.id);
    setConvertLoading(false);
    if (converted) {
      haptic();
      showAlert("Quote converted", `${invoice.invoiceNumber} has been converted to invoice ${converted.invoiceNumber}. You can now send it to your customer.`);
    }
  };

  const requestDeposit = async () => {
    setPendingAction("request_deposit");
    let depositLink = invoice.depositLink ?? undefined;
    if (!depositLink && user?.stripeConnectedAccountId) {
      const result = await createStripeCheckout({
        userId: user.id,
        amount: invoice.depositAmount,
        currency: invoice.currency,
        description: `Deposit — Invoice ${invoice.invoiceNumber ?? invoice.id} for ${invoice.customerName}`,
        invoiceRef: invoice.invoiceNumber ?? invoice.id,
      });
      if (!('error' in result)) {
        depositLink = (result as { url: string }).url;
      }
    }
    await updateInvoice(invoice.id, {
      status: "awaiting_deposit",
      ...(depositLink ? { depositLink } : {}),
    });
    setPendingAction(null);
    haptic();
    if (depositLink) {
      await Clipboard.setStringAsync(depositLink);
      showAlert("Deposit requested", "A Stripe payment link has been generated and copied to your clipboard. Share it with your customer.");
    } else {
      showAlert("Deposit requested", "Invoice updated. Connect a Stripe account in your profile to generate a payment link.");
    }
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
    if (!user) return;
    setPendingAction("request_final");
    let finalLink = invoice.finalLink ?? undefined;
    if (!finalLink && user?.stripeConnectedAccountId) {
      const result = await createStripeCheckout({
        userId: user.id,
        amount: invoice.remainingBalance,
        currency: invoice.currency,
        description: `Final payment — Invoice ${invoice.invoiceNumber ?? invoice.id} for ${invoice.customerName}`,
        invoiceRef: invoice.invoiceNumber ?? invoice.id,
      });
      if (!('error' in result)) {
        finalLink = (result as { url: string }).url;
      }
    }
    await updateInvoice(invoice.id, {
      ...(finalLink ? { finalLink } : {}),
    });
    await sendInvoiceEmail(invoice, user, finalLink);
    setPendingAction(null);
    haptic();
    showAlert("Payment requested", `Invoice emailed to ${invoice.customerEmail}${finalLink ? " with a payment link" : ""}.`);
  };

  const markFullyPaid = async () => {
    setPendingAction("mark_full");
    await updateInvoice(invoice.id, { status: "fully_paid" });
    setPendingAction(null);
    haptic();
    showAlert("Invoice paid in full", "You can now email a review request to your customer or share the review link.");
  };

  const payRemaining = async () => {
    setPendingAction("pay_remaining");
    const r = await simulatePayment(invoice.remainingBalance);
    setPendingAction(null);
    if (r.success) {
      await updateInvoice(invoice.id, { status: "fully_paid" });
      haptic("success");
      showAlert("Payment received", `${formatMoney(invoice.remainingBalance, invoice.currency)} received. You can now request a review from ${invoice.customerName}.`);
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
    const isDraft = invoice.status === "draft";
    const title = isDraft ? "Delete invoice?" : "Delete invoice?";
    const message = isDraft
      ? `This will permanently remove the draft for ${invoice.customerName}. This cannot be undone.`
      : `This invoice for ${invoice.customerName} is already in progress. Deleting it will remove it from your records permanently. Any shared payment links will still work until they expire. This cannot be undone.`;
    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n\n${message}`)) {
        doDelete();
      }
    } else {
      Alert.alert(title, message, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
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

  const getStripePaymentLink = async () => {
    if (!user?.stripeConnectedAccountId) return;
    setStripeLinkLoading(true);
    const isDeposit = invoice.status === 'awaiting_deposit';
    const isFinal = invoice.status === 'deposit_paid';
    const amountToPay = isDeposit
      ? invoice.depositAmount
      : isFinal
        ? invoice.remainingBalance
        : invoice.total;
    const labelPrefix = isDeposit ? 'Deposit' : isFinal ? 'Final payment' : 'Payment';
    const result = await createStripeCheckout({
      userId: user.id,
      amount: amountToPay,
      currency: invoice.currency,
      description: `${labelPrefix} — Invoice ${invoice.invoiceNumber ?? invoice.id} for ${invoice.customerName}`,
      invoiceRef: invoice.invoiceNumber ?? invoice.id,
    });
    setStripeLinkLoading(false);
    if ('error' in result) {
      showAlert('Payment link failed', (result as any).error);
      return;
    }
    const { url } = result as { url: string };
    if (isDeposit) {
      await updateInvoice(invoice.id, { depositLink: url });
    } else if (isFinal) {
      await updateInvoice(invoice.id, { finalLink: url });
    }
    await Clipboard.setStringAsync(url);
    haptic();
    showAlert('Payment link copied', 'A fresh Stripe checkout link has been generated and copied to your clipboard.');
  };

  const handleShareReviewLink = async () => {
    if (!user) return;
    const url = getReviewPageUrl(user.id, invoice.customerName, invoice.invoiceNumber);
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      try {
        await Sharing.shareAsync(url, { dialogTitle: `Share review link with ${invoice.customerName}` });
        return;
      } catch {}
    }
    await Clipboard.setStringAsync(url);
    if (Platform.OS !== "web") Haptics.selectionAsync();
    showAlert("Review link copied", `Share this link with ${invoice.customerName} so they can leave you a review.`);
  };

  const handleEmailReviewRequest = async () => {
    if (!user || !invoice.customerEmail) {
      showAlert("Missing email", "This invoice doesn't have a customer email address.");
      return;
    }
    setReviewEmailLoading(true);
    const url = getReviewPageUrl(user.id, invoice.customerName, invoice.invoiceNumber);
    const result = await sendReviewRequestEmail(invoice.customerEmail, invoice.customerName, user.businessName, url);
    setReviewEmailLoading(false);
    haptic();
    if (result.ok) {
      showAlert("Review request sent", `An email has been sent to ${invoice.customerEmail} with a link to leave you a review.`);
    } else {
      showAlert("Failed to send email", result.error ?? "Something went wrong.");
    }
  };

  const handleEmailInvoice = async () => {
    if (!user) return;
    setEmailLoading(true);
    const paymentLink =
      invoice.status === 'awaiting_deposit' ? invoice.depositLink :
      invoice.status === 'deposit_paid' ? invoice.finalLink :
      invoice.depositLink ?? invoice.finalLink;
    const result = await sendInvoiceEmail(invoice, user, paymentLink);
    setEmailLoading(false);
    haptic();
    if ('error' in result) {
      showAlert('Email failed', (result as any).error);
    } else {
      showAlert(invoice.isQuote ? 'Quote sent' : 'Invoice sent', `${invoice.isQuote ? 'Quote' : 'Invoice'} emailed to ${invoice.customerEmail}.`);
    }
  };

  const docLabel = invoice.isQuote ? "Quote" : "Invoice";
  const showAwaitingBanner = !invoice.isQuote && (invoice.status === "awaiting_deposit" || invoice.status === "draft" || invoice.status === "deposit_paid");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      {invoice.isQuote && (
        <View style={[styles.banner, { backgroundColor: colors.primary + '1a', borderRadius: colors.radius }]}>
          <Feather name="clipboard" size={18} color={colors.primary} />
          <Text style={[styles.bannerText, { color: colors.primary }]}>
            This is a quote — convert it to an invoice when approved
          </Text>
        </View>
      )}
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
        <View style={[styles.brandRow, { borderBottomColor: colors.border }]}>
          {user?.logoUri ? (
            <Image source={{ uri: user.logoUri }} style={styles.logo} contentFit="cover" />
          ) : (
            <View style={[styles.logoFallback, { backgroundColor: colors.primary }]}>
              <Feather name="briefcase" size={18} color={colors.primaryForeground} />
            </View>
          )}
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={[styles.brandName, { color: colors.foreground }]} numberOfLines={1}>
              {user?.businessName ?? "Your business"}
            </Text>
            <Text style={[styles.brandEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
              {user?.email ?? ""}
            </Text>
          </View>
          {invoice.invoiceNumber ? (
            <View style={[styles.invNumBadge, { backgroundColor: invoice.isQuote ? colors.primary + '1a' : colors.muted, borderColor: invoice.isQuote ? colors.primary + '44' : colors.border }]}>
              <Text style={[styles.invNumText, { color: invoice.isQuote ? colors.primary : colors.mutedForeground }]}>{invoice.invoiceNumber}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, marginTop: 14 }}>
          <Pressable
            onPress={() => router.push(`/customer/${encodeURIComponent(invoice.customerEmail)}`)}
            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.customerName, { color: colors.foreground }]}>{invoice.customerName}</Text>
            <Text style={[styles.customerEmail, { color: colors.mutedForeground }]}>{invoice.customerEmail}</Text>
          </Pressable>
          {invoice.isQuote ? (
            <View style={[styles.quoteBadge, { backgroundColor: colors.primary + '1a', borderColor: colors.primary + '44' }]}>
              <Feather name="clipboard" size={11} color={colors.primary} />
              <Text style={[styles.quoteBadgeText, { color: colors.primary }]}>Quote</Text>
            </View>
          ) : (
            <StatusBadge status={invoice.status} />
          )}
        </View>
        <Text style={[styles.due, { color: colors.mutedForeground }]}>
          {invoice.isQuote ? "Valid until" : "Due"}{" "}
          {new Date(invoice.dueDate).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
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
                {(it.discountPercent ?? 0) > 0 ? `  ·  -${it.discountPercent}% off` : ""}
                {(it.taxRate ?? 0) > 0 ? `  ·  +${it.taxRate}% tax` : ""}
              </Text>
            </View>
            <Text style={[styles.itemTotal, { color: colors.foreground }]}>{formatMoney(lineTotal(it), invoice.currency)}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 20 }]}>Amount</Text>
      <AmountBreakdown
        currency={invoice.currency}
        rows={(() => {
          const subtotal = calculateSubtotal(invoice.lineItems);
          const discount = calculateDiscountTotal(invoice.lineItems);
          const tax = calculateTaxTotal(invoice.lineItems);
          const rows: { label: string; value: number; emphasis?: boolean }[] = [];
          if (discount > 0 || tax > 0) {
            rows.push({ label: "Subtotal", value: subtotal });
            if (discount > 0) rows.push({ label: "Discount", value: -discount });
            if (tax > 0) rows.push({ label: "Tax", value: tax });
          }
          rows.push({ label: "Total", value: invoice.total, emphasis: !invoice.requireDeposit });
          if (!invoice.isQuote && invoice.requireDeposit) {
            rows.push({ label: "Deposit", value: invoice.depositAmount });
            rows.push({ label: "Remaining", value: invoice.remainingBalance, emphasis: true });
          }
          return rows;
        })()}
      />

      {invoice.notes ? (
        <>
          <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 20 }]}>Notes & terms</Text>
          <View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.notesText, { color: colors.foreground }]}>{invoice.notes}</Text>
          </View>
        </>
      ) : null}

      {!invoice.isQuote && user?.bankDetails && (
        <>
          <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 20 }]}>Bank transfer details</Text>
          <View style={[styles.bankCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            {user.bankDetails.bankName ? (
              <BankRow label="Bank" value={user.bankDetails.bankName} />
            ) : null}
            <BankRow label="Account holder" value={user.bankDetails.accountHolderName} />
            <BankRow label="Sort code" value={user.bankDetails.sortCode} mono />
            <BankRow label="Account number" value={user.bankDetails.accountNumber} mono />
            {user.bankDetails.reference ? (
              <BankRow label="Reference" value={user.bankDetails.reference} last />
            ) : null}
          </View>
        </>
      )}

      {!invoice.isQuote && (invoice.depositLink || invoice.finalLink) && (
        <>
          <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 20 }]}>Shareable links</Text>
          {invoice.depositLink && <LinkRow label="Deposit link" value={invoice.depositLink} onCopy={copyLink} />}
          {invoice.finalLink && <LinkRow label="Final payment link" value={invoice.finalLink} onCopy={copyLink} />}
        </>
      )}

      <View style={{ marginTop: 24, gap: 10 }}>
        {invoice.isQuote && (
          <>
            <PrimaryButton
              title={convertLoading ? "Converting…" : "Convert to invoice"}
              onPress={handleConvertToInvoice}
              loading={convertLoading}
              icon="file-text"
            />
            <SecondaryButton
              title={emailLoading ? "Sending quote…" : `Email quote to ${invoice.customerEmail}`}
              icon="mail"
              onPress={handleEmailInvoice}
            />
            <SecondaryButton title="Edit quote" onPress={() => router.push(`/(tabs)/create?editId=${invoice.id}`)} icon="edit-2" />
            <SecondaryButton title="Duplicate quote" onPress={onDuplicate} icon="copy" />
            <SecondaryButton
              title={pdfLoading ? "Generating PDF…" : "Download PDF"}
              icon="download"
              onPress={async () => {
                setPdfLoading(true);
                try {
                  await downloadInvoicePdf(invoice, user ?? null);
                } finally {
                  setPdfLoading(false);
                }
              }}
            />
            <SecondaryButton
              title="Delete quote"
              onPress={onDelete}
              icon="trash-2"
              variant="destructive"
            />
          </>
        )}

        {!invoice.isQuote && (
          <>
            {invoice.status === "draft" && invoice.requireDeposit && (
              <PrimaryButton title="Request deposit" onPress={requestDeposit} loading={pendingAction === "request_deposit"} icon="send" />
            )}
            {invoice.status === "awaiting_deposit" && (
              <PrimaryButton title="Mark deposit as paid" onPress={markDepositPaid} loading={pendingAction === "mark_deposit"} icon="check" />
            )}
            {invoice.status === "deposit_paid" && (
              <>
                <PrimaryButton title="Request final payment" onPress={requestFinal} loading={pendingAction === "request_final"} icon="send" />
                <SecondaryButton title="Mark as fully paid" onPress={markFullyPaid} icon="check-circle" />
              </>
            )}
            {invoice.status === "draft" && !invoice.requireDeposit && (
              <>
                <PrimaryButton title="Request payment" onPress={requestFinal} icon="send" />
                <SecondaryButton title="Mark as fully paid" onPress={markFullyPaid} icon="check-circle" />
              </>
            )}
            {invoice.status === "fully_paid" && (
              <>
                <PrimaryButton
                  title={reviewEmailLoading ? "Sending request…" : `Email review request to ${invoice.customerName}`}
                  onPress={handleEmailReviewRequest}
                  icon="send"
                  variant="success"
                  loading={reviewEmailLoading}
                />
                <SecondaryButton
                  title="Share review link"
                  onPress={handleShareReviewLink}
                  icon="share-2"
                />
              </>
            )}
            <SecondaryButton title="Edit invoice" onPress={() => router.push(`/(tabs)/create?editId=${invoice.id}`)} icon="edit-2" />
            <SecondaryButton title="Duplicate invoice" onPress={onDuplicate} icon="copy" />
            <SecondaryButton
              title={emailLoading ? "Sending email…" : `Email invoice to ${invoice.customerEmail}`}
              icon="mail"
              onPress={handleEmailInvoice}
            />
            {user?.stripeConnectedAccountId && invoice.status !== "fully_paid" && (
              <SecondaryButton
                title={
                  stripeLinkLoading
                    ? "Generating link…"
                    : invoice.status === "awaiting_deposit"
                      ? (invoice.depositLink ? "Regenerate deposit payment link" : "Get deposit payment link")
                      : invoice.status === "deposit_paid"
                        ? (invoice.finalLink ? "Regenerate final payment link" : "Get final payment link")
                        : "Get Stripe payment link"
                }
                icon="credit-card"
                onPress={getStripePaymentLink}
              />
            )}
            <SecondaryButton
              title={pdfLoading ? "Generating PDF…" : "Download PDF"}
              icon="download"
              onPress={async () => {
                setPdfLoading(true);
                try {
                  await downloadInvoicePdf(invoice, user ?? null);
                } finally {
                  setPdfLoading(false);
                }
              }}
            />
            <SecondaryButton
              title={invoice.status === "draft" ? "Delete draft" : "Delete invoice"}
              onPress={onDelete}
              icon="trash-2"
              variant="destructive"
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

function BankRow({ label, value, mono, last }: { label: string; value: string; mono?: boolean; last?: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.bankRow, { borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <Text style={[styles.bankLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[mono ? styles.bankValueMono : styles.bankValue, { color: colors.foreground }]}>{value}</Text>
    </View>
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
  bannerText: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginLeft: 8, flex: 1 },
  headerCard: { padding: 18, borderWidth: 1, marginBottom: 18 },
  brandRow: { flexDirection: "row", alignItems: "center", paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  logo: { width: 44, height: 44, borderRadius: 10 },
  logoFallback: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  brandName: { fontFamily: "Inter_700Bold", fontSize: 15 },
  brandEmail: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  invNumBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, alignSelf: "flex-start" },
  invNumText: { fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.5 },
  customerName: { fontFamily: "Inter_700Bold", fontSize: 20 },
  customerEmail: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  due: { fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 6 },
  notesCard: { padding: 16, borderWidth: 1 },
  notesText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 },
  bankCard: { borderWidth: 1, overflow: "hidden" },
  bankRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  bankLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  bankValue: { fontFamily: "Inter_500Medium", fontSize: 13 },
  bankValueMono: { fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 0.5 },
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
  quoteBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  quoteBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
});
