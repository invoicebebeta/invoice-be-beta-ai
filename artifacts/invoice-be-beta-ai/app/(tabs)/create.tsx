import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

import { useColors } from "@/hooks/useColors";
import { useInvoices } from "@/contexts/InvoicesContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomers } from "@/contexts/CustomersContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { CustomerSuggest, CustomerSuggestion } from "@/components/CustomerSuggest";
import { LineItemEditor } from "@/components/LineItemEditor";
import { DepositToggle } from "@/components/DepositToggle";
import { PrimaryButton } from "@/components/PrimaryButton";
import { calculateDeposit, calculateRemaining, calculateTotal, formatMoney } from "@/utils/calculations";
import { Invoice, InvoiceStatus, LineItem } from "@/utils/types";

const newId = (p: string) => p + "_" + Date.now().toString() + Math.random().toString(36).slice(2, 8);

const blankItem = (): LineItem => ({ id: newId("li"), name: "", description: "", price: 0, quantity: 1 });

const DUE_PRESETS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
];

const daysFromNow = (iso: string) => {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(1, Math.round(diff / (24 * 60 * 60 * 1000)));
};

export default function CreateInvoiceScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addInvoice, updateInvoice, getInvoice, invoices } = useInvoices();
  const { user } = useAuth();
  const { customers, upsertFromInvoice } = useCustomers();
  const params = useLocalSearchParams<{ editId?: string }>();
  const editId = typeof params.editId === "string" ? params.editId : undefined;
  const editing = !!editId;
  const editingInvoice = editing ? getInvoice(editId!) : undefined;
  const editLocked = false;
  const editInProgress = editing && editingInvoice && editingInvoice.status !== "draft";

  const customerSuggestions = useMemo<CustomerSuggestion[]>(() => {
    const byEmail = new Map<string, CustomerSuggestion>();
    for (const c of customers) {
      const key = c.email.toLowerCase();
      byEmail.set(key, { name: c.name, email: c.email, lastUsed: c.createdAt });
    }
    for (const inv of invoices) {
      const key = (inv.customerEmail || inv.customerName).toLowerCase();
      if (!key) continue;
      if (!byEmail.has(key)) {
        byEmail.set(key, { name: inv.customerName, email: inv.customerEmail, lastUsed: inv.createdAt });
      } else {
        const existing = byEmail.get(key)!;
        if (new Date(inv.createdAt) > new Date(existing.lastUsed)) {
          byEmail.set(key, { ...existing, lastUsed: inv.createdAt });
        }
      }
    }
    return Array.from(byEmail.values()).sort(
      (a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    );
  }, [customers, invoices]);

  const [isQuote, setIsQuote] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [items, setItems] = useState<LineItem[]>([blankItem()]);
  const [requireDeposit, setRequireDeposit] = useState(false);
  const [depositPercent, setDepositPercent] = useState(20);
  const [dueDays, setDueDays] = useState(14);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadedForRef = useRef<string | null>(null);

  const resetForm = () => {
    setIsQuote(false);
    setCustomerName("");
    setCustomerEmail("");
    setItems([blankItem()]);
    setRequireDeposit(false);
    setDepositPercent(20);
    setDueDays(14);
    setNotes("");
    setErrors({});
    loadedForRef.current = null;
  };

  useEffect(() => {
    if (!editing) {
      if (loadedForRef.current !== null) resetForm();
      return;
    }
    if (!editingInvoice) return;
    if (loadedForRef.current === editingInvoice.id) return;
    setIsQuote(editingInvoice.isQuote ?? false);
    setCustomerName(editingInvoice.customerName);
    setCustomerEmail(editingInvoice.customerEmail);
    setItems(editingInvoice.lineItems.map((li) => ({ ...li })));
    setRequireDeposit(editingInvoice.requireDeposit);
    setDepositPercent(editingInvoice.depositPercent || 20);
    setDueDays(daysFromNow(editingInvoice.dueDate));
    setNotes(editingInvoice.notes ?? "");
    setErrors({});
    loadedForRef.current = editingInvoice.id;
  }, [editing, editingInvoice]);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        if (editing) {
          router.setParams({ editId: undefined as unknown as string });
        }
      };
    }, [editing, router])
  );

  const total = useMemo(() => calculateTotal(items), [items]);
  const depositAmount = requireDeposit && !isQuote ? calculateDeposit(total, depositPercent) : 0;
  const remaining = calculateRemaining(total, depositAmount);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBar = 84;

  const updateItem = (idx: number, item: LineItem) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? item : it)));
  };
  const addItem = () => setItems((prev) => [...prev, blankItem()]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const validate = () => {
    const next: Record<string, string> = {};
    if (!customerName.trim()) next.customerName = "Customer name is required";
    if (!customerEmail.trim()) next.customerEmail = "Customer email is required";
    if (items.some((it) => !it.name.trim() || it.price <= 0 || it.quantity <= 0)) {
      next.items = "Each line item needs a name, price, and quantity";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSave = async () => {
    if (!validate()) return;
    setSaving(true);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const dueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString();

    if (editing && editingInvoice) {
      const patch: Partial<Invoice> = {
        isQuote,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        lineItems: items,
        dueDate,
        requireDeposit: isQuote ? false : requireDeposit,
        depositPercent: !isQuote && requireDeposit ? depositPercent : 0,
        total,
        depositAmount,
        remainingBalance: remaining,
        notes: notes.trim() || undefined,
        depositLink: !isQuote && requireDeposit ? editingInvoice.depositLink : undefined,
      };
      await updateInvoice(editingInvoice.id, patch);
      await upsertFromInvoice(customerName.trim(), customerEmail.trim());
      setSaving(false);
      router.replace(`/invoice/${editingInvoice.id}`);
      return;
    }

    const id = newId("inv");
    const status: InvoiceStatus = !isQuote && requireDeposit ? "awaiting_deposit" : "draft";
    const invoice: Invoice = {
      id,
      userId: user?.id ?? "anonymous",
      isQuote,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      lineItems: items,
      dueDate,
      requireDeposit: isQuote ? false : requireDeposit,
      depositPercent: !isQuote && requireDeposit ? depositPercent : 0,
      total,
      depositAmount,
      remainingBalance: remaining,
      status,
      currency: user?.currency ?? "USD",
      depositLink: undefined,
      finalLink: undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    await addInvoice(invoice);
    await upsertFromInvoice(customerName.trim(), customerEmail.trim());
    setSaving(false);
    resetForm();
    router.push(`/invoice/${id}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: topInset }}>
        <ScreenHeader
          title={editing ? (isQuote ? "Edit quote" : "Edit invoice") : "New"}
          subtitle={editing ? "Update the details below" : "Fill in the details below"}
          right={
            editing ? (
              <Pressable onPress={() => router.replace(`/invoice/${editingInvoice!.id}`)} hitSlop={10} style={{ padding: 6 }}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            ) : undefined
          }
        />
      </View>

      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: tabBar + 24 }}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
      >
        {!editing && (
          <View style={[styles.typeToggle, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Pressable
              onPress={() => setIsQuote(false)}
              style={[
                styles.typeBtn,
                { borderRadius: colors.radius - 2, backgroundColor: !isQuote ? colors.primary : "transparent" },
              ]}
            >
              <Feather name="file-text" size={14} color={!isQuote ? colors.primaryForeground : colors.mutedForeground} />
              <Text style={[styles.typeBtnText, { color: !isQuote ? colors.primaryForeground : colors.mutedForeground }]}>
                Invoice
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setIsQuote(true)}
              style={[
                styles.typeBtn,
                { borderRadius: colors.radius - 2, backgroundColor: isQuote ? colors.primary : "transparent" },
              ]}
            >
              <Feather name="clipboard" size={14} color={isQuote ? colors.primaryForeground : colors.mutedForeground} />
              <Text style={[styles.typeBtnText, { color: isQuote ? colors.primaryForeground : colors.mutedForeground }]}>
                Quote
              </Text>
            </Pressable>
          </View>
        )}

        {editInProgress && (
          <View style={[styles.warnBanner, { backgroundColor: "#fef3c7", borderColor: "#fcd34d", borderRadius: colors.radius }]}>
            <Feather name="alert-circle" size={15} color="#92400e" style={{ marginTop: 1 }} />
            <Text style={styles.warnText}>
              This invoice is already in progress. Editing will update the details but will not regenerate any existing payment links.
            </Text>
          </View>
        )}

        <Text style={[styles.section, { color: colors.mutedForeground }]}>Customer</Text>
        <CustomerSuggest
          customers={customerSuggestions}
          name={customerName}
          email={customerEmail}
          onChangeName={setCustomerName}
          onChangeEmail={setCustomerEmail}
          onPick={(c) => {
            setCustomerName(c.name);
            setCustomerEmail(c.email);
          }}
          nameError={errors.customerName}
          emailError={errors.customerEmail}
        />

        <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 12 }]}>Line items</Text>
        {items.map((it, i) => (
          <LineItemEditor key={it.id} item={it} onChange={(next) => updateItem(i, next)} onRemove={() => removeItem(i)} canRemove={items.length > 1} />
        ))}
        {errors.items ? <Text style={{ color: colors.destructive, fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 10 }}>{errors.items}</Text> : null}
        <Pressable onPress={addItem} style={({ pressed }) => [styles.addBtn, { borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.7 : 1 }]}>
          <Feather name="plus" size={16} color={colors.foreground} />
          <Text style={[styles.addText, { color: colors.foreground }]}>Add line item</Text>
        </Pressable>

        <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 16 }]}>
          {isQuote ? "Valid for" : "Due date"}
        </Text>
        <View style={styles.chipsRow}>
          {DUE_PRESETS.map((p) => {
            const active = dueDays === p.days;
            return (
              <Pressable
                key={p.label}
                onPress={() => setDueDays(p.days)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    borderRadius: colors.radius,
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: active ? colors.primaryForeground : colors.foreground }]}>{p.label}</Text>
              </Pressable>
            );
          })}
          {!DUE_PRESETS.some((p) => p.days === dueDays) && (
            <View style={[styles.chip, { borderRadius: colors.radius, backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <Text style={[styles.chipText, { color: colors.primaryForeground }]}>{dueDays} days</Text>
            </View>
          )}
        </View>

        {!isQuote && (
          <>
            <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 16 }]}>Deposit</Text>
            <DepositToggle
              enabled={requireDeposit}
              onToggle={setRequireDeposit}
              percent={depositPercent}
              onPercentChange={setDepositPercent}
              total={total}
              depositAmount={depositAmount}
              remaining={remaining}
              currency={editing ? editingInvoice?.currency : user?.currency}
            />
          </>
        )}

        <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 16 }]}>Notes & terms</Text>
        <TextInput
          placeholder="Payment instructions, thank-you message, terms..."
          placeholderTextColor={colors.mutedForeground}
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={500}
          style={[
            styles.notesInput,
            {
              color: colors.foreground,
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        />
        <Text style={[styles.notesHint, { color: colors.mutedForeground }]}>
          {notes.length}/500 · Shown to your customer on the {isQuote ? "quote" : "invoice"}
        </Text>

        <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total</Text>
          <Text style={[styles.totalValue, { color: colors.foreground }]}>
            {formatMoney(total, editing ? editingInvoice?.currency : user?.currency)}
          </Text>
        </View>

        <PrimaryButton
          title={editing ? "Save changes" : isQuote ? "Save quote" : "Save invoice"}
          onPress={onSave}
          loading={saving}
          icon="check"
        />
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  typeToggle: {
    flexDirection: "row",
    padding: 4,
    borderWidth: 1,
    marginBottom: 20,
    gap: 4,
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
  },
  typeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  section: { fontFamily: "Inter_600SemiBold", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderWidth: 1, borderStyle: "dashed", marginBottom: 8 },
  addText: { fontFamily: "Inter_500Medium", fontSize: 14, marginLeft: 6 },
  chipsRow: { flexDirection: "row", marginBottom: 6, flexWrap: "wrap" },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, marginRight: 8, marginBottom: 8 },
  chipText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 18, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, marginBottom: 18 },
  totalLabel: { fontFamily: "Inter_500Medium", fontSize: 14, textTransform: "uppercase", letterSpacing: 0.4 },
  totalValue: { fontFamily: "Inter_700Bold", fontSize: 24, fontVariant: ["tabular-nums"] },
  notesInput: {
    minHeight: 96,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlignVertical: "top",
    marginBottom: 6,
  },
  notesHint: { fontFamily: "Inter_400Regular", fontSize: 11, marginBottom: 12 },
  warnBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderWidth: 1, marginBottom: 16, marginTop: 4 },
  warnText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#92400e", flex: 1, lineHeight: 18 },
});
