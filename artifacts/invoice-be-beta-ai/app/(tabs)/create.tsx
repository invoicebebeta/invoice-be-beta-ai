import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

import { useColors } from "@/hooks/useColors";
import { useInvoices } from "@/contexts/InvoicesContext";
import { useAuth } from "@/contexts/AuthContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TextField } from "@/components/TextField";
import { CustomerSuggest, CustomerSuggestion } from "@/components/CustomerSuggest";
import { LineItemEditor } from "@/components/LineItemEditor";
import { DepositToggle } from "@/components/DepositToggle";
import { PrimaryButton } from "@/components/PrimaryButton";
import { calculateDeposit, calculateRemaining, calculateTotal, formatMoney } from "@/utils/calculations";
import { Invoice, InvoiceStatus, LineItem } from "@/utils/types";
import { generateShareLink } from "@/utils/mockLinks";

const newId = (p: string) => p + "_" + Date.now().toString() + Math.random().toString(36).slice(2, 8);

const blankItem = (): LineItem => ({ id: newId("li"), name: "", description: "", price: 0, quantity: 1 });

const DUE_PRESETS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
];

export default function CreateInvoiceScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addInvoice, invoices } = useInvoices();
  const { user } = useAuth();

  const customers = useMemo<CustomerSuggestion[]>(() => {
    const byEmail = new Map<string, CustomerSuggestion>();
    for (const inv of invoices) {
      const key = (inv.customerEmail || inv.customerName).toLowerCase();
      if (!key) continue;
      const existing = byEmail.get(key);
      if (!existing || new Date(inv.createdAt) > new Date(existing.lastUsed)) {
        byEmail.set(key, { name: inv.customerName, email: inv.customerEmail, lastUsed: inv.createdAt });
      }
    }
    return Array.from(byEmail.values()).sort(
      (a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    );
  }, [invoices]);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [items, setItems] = useState<LineItem[]>([blankItem()]);
  const [requireDeposit, setRequireDeposit] = useState(false);
  const [depositPercent, setDepositPercent] = useState(20);
  const [dueDays, setDueDays] = useState(14);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const total = useMemo(() => calculateTotal(items), [items]);
  const depositAmount = requireDeposit ? calculateDeposit(total, depositPercent) : 0;
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
    const id = newId("inv");
    const status: InvoiceStatus = requireDeposit ? "awaiting_deposit" : "draft";
    const dueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString();
    const invoice: Invoice = {
      id,
      userId: user?.id ?? "anonymous",
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      lineItems: items,
      dueDate,
      requireDeposit,
      depositPercent: requireDeposit ? depositPercent : 0,
      total,
      depositAmount,
      remainingBalance: remaining,
      status,
      currency: user?.currency ?? "USD",
      depositLink: requireDeposit ? generateShareLink(id, "deposit") : undefined,
      finalLink: generateShareLink(id, "final"),
      createdAt: new Date().toISOString(),
    };
    await addInvoice(invoice);
    setSaving(false);
    setCustomerName("");
    setCustomerEmail("");
    setItems([blankItem()]);
    setRequireDeposit(false);
    setDepositPercent(20);
    setDueDays(14);
    setErrors({});
    router.push(`/invoice/${id}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: topInset }}>
        <ScreenHeader title="New invoice" subtitle="Fill in the details below" />
      </View>

      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: tabBar + 24 }}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.section, { color: colors.mutedForeground }]}>Customer</Text>
        <CustomerSuggest
          customers={customers}
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

        <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 16 }]}>Due date</Text>
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
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 16 }]}>Deposit</Text>
        <DepositToggle
          enabled={requireDeposit}
          onToggle={setRequireDeposit}
          percent={depositPercent}
          onPercentChange={setDepositPercent}
          total={total}
          depositAmount={depositAmount}
          remaining={remaining}
          currency={user?.currency}
        />

        <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total</Text>
          <Text style={[styles.totalValue, { color: colors.foreground }]}>{formatMoney(total, user?.currency)}</Text>
        </View>

        <PrimaryButton title="Save invoice" onPress={onSave} loading={saving} icon="check" />
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: "Inter_600SemiBold", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderWidth: 1, borderStyle: "dashed", marginBottom: 8 },
  addText: { fontFamily: "Inter_500Medium", fontSize: 14, marginLeft: 6 },
  chipsRow: { flexDirection: "row", marginBottom: 6 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, marginRight: 8 },
  chipText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 18, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, marginBottom: 18 },
  totalLabel: { fontFamily: "Inter_500Medium", fontSize: 14, textTransform: "uppercase", letterSpacing: 0.4 },
  totalValue: { fontFamily: "Inter_700Bold", fontSize: 24, fontVariant: ["tabular-nums"] },
});
