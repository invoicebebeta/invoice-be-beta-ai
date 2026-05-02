import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

import { useColors } from "@/hooks/useColors";
import { useRecurring } from "@/contexts/RecurringContext";
import { useAuth } from "@/contexts/AuthContext";
import { useInvoices } from "@/contexts/InvoicesContext";
import { CustomerSuggest, CustomerSuggestion } from "@/components/CustomerSuggest";
import { LineItemEditor } from "@/components/LineItemEditor";
import { DepositToggle } from "@/components/DepositToggle";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { calculateDeposit, calculateRemaining, calculateTotal, formatMoney } from "@/utils/calculations";
import { LineItem, RecurringFrequency, RecurringTemplate } from "@/utils/types";

const newId = (p: string) => p + "_" + Date.now().toString() + Math.random().toString(36).slice(2, 8);
const blankItem = (): LineItem => ({ id: newId("li"), name: "", description: "", price: 0, quantity: 1 });

const FREQUENCIES: { label: string; value: RecurringFrequency }[] = [
  { label: "Weekly", value: "weekly" },
  { label: "Every 2 weeks", value: "biweekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
];

export default function RecurringFormScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";

  const { addTemplate, updateTemplate, getTemplate } = useRecurring();
  const { user } = useAuth();
  const { invoices } = useInvoices();

  const existing = isNew ? undefined : getTemplate(String(id));

  const customers = useMemo<CustomerSuggestion[]>(() => {
    const byEmail = new Map<string, CustomerSuggestion>();
    for (const inv of invoices) {
      const key = (inv.customerEmail || inv.customerName).toLowerCase();
      if (!key) continue;
      const ex = byEmail.get(key);
      if (!ex || new Date(inv.createdAt) > new Date(ex.lastUsed)) {
        byEmail.set(key, { name: inv.customerName, email: inv.customerEmail, lastUsed: inv.createdAt });
      }
    }
    return Array.from(byEmail.values()).sort(
      (a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    );
  }, [invoices]);

  const [templateName, setTemplateName] = useState(existing?.name ?? "");
  const [customerName, setCustomerName] = useState(existing?.customerName ?? "");
  const [customerEmail, setCustomerEmail] = useState(existing?.customerEmail ?? "");
  const [items, setItems] = useState<LineItem[]>(existing?.lineItems?.map((li) => ({ ...li })) ?? [blankItem()]);
  const [requireDeposit, setRequireDeposit] = useState(existing?.requireDeposit ?? false);
  const [depositPercent, setDepositPercent] = useState(existing?.depositPercent ?? 20);
  const [frequency, setFrequency] = useState<RecurringFrequency>(existing?.frequency ?? "monthly");
  const [nextDueDate, setNextDueDate] = useState<string>(existing?.nextDueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [autoSend, setAutoSend] = useState(existing?.autoSend ?? false);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBar = 84;

  const total = useMemo(() => calculateTotal(items), [items]);
  const depositAmount = requireDeposit ? calculateDeposit(total, depositPercent) : 0;
  const remaining = calculateRemaining(total, depositAmount);

  const updateItem = (idx: number, item: LineItem) => setItems((prev) => prev.map((it, i) => (i === idx ? item : it)));
  const addItem = () => setItems((prev) => [...prev, blankItem()]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const validate = () => {
    const next: Record<string, string> = {};
    if (!templateName.trim()) next.templateName = "Give this template a name";
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

    const base: RecurringTemplate = {
      id: isNew ? newId("tmpl") : String(id),
      name: templateName.trim(),
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      lineItems: items,
      requireDeposit,
      depositPercent: requireDeposit ? depositPercent : 0,
      currency: user?.currency ?? "USD",
      notes: notes.trim() || undefined,
      frequency,
      nextDueDate,
      autoSend,
      isActive: existing?.isActive ?? true,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      lastGeneratedAt: existing?.lastGeneratedAt,
    };

    if (isNew) {
      await addTemplate(base);
    } else {
      await updateTemplate(String(id), base);
    }

    setSaving(false);
    router.back();
  };

  const dueDateDisplay = new Date(nextDueDate).toLocaleDateString(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (date) setNextDueDate(date.toISOString());
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: topInset }}>
        <ScreenHeader
          title={isNew ? "New recurring template" : "Edit template"}
          subtitle={isNew ? "Set up a repeating invoice schedule" : "Update the template details"}
          right={
            <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 6 }}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
          }
        />
      </View>

      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: tabBar + 24 }}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.section, { color: colors.mutedForeground }]}>Template name</Text>
        <TextInput
          placeholder="e.g. Monthly retainer – Acme Corp"
          placeholderTextColor={colors.mutedForeground}
          value={templateName}
          onChangeText={setTemplateName}
          style={[
            styles.input,
            {
              color: colors.foreground,
              backgroundColor: colors.card,
              borderColor: errors.templateName ? colors.destructive : colors.border,
              borderRadius: colors.radius,
            },
          ]}
        />
        {errors.templateName ? (
          <Text style={[styles.error, { color: colors.destructive }]}>{errors.templateName}</Text>
        ) : null}

        <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 12 }]}>Customer</Text>
        <CustomerSuggest
          customers={customers}
          name={customerName}
          email={customerEmail}
          onChangeName={setCustomerName}
          onChangeEmail={setCustomerEmail}
          onPick={(c) => { setCustomerName(c.name); setCustomerEmail(c.email); }}
          nameError={errors.customerName}
          emailError={errors.customerEmail}
        />

        <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 12 }]}>Line items</Text>
        {items.map((it, i) => (
          <LineItemEditor key={it.id} item={it} onChange={(next) => updateItem(i, next)} onRemove={() => removeItem(i)} canRemove={items.length > 1} />
        ))}
        {errors.items ? <Text style={[styles.error, { color: colors.destructive }]}>{errors.items}</Text> : null}
        <Pressable
          onPress={addItem}
          style={({ pressed }) => [
            styles.addBtn,
            { borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="plus" size={16} color={colors.foreground} />
          <Text style={[styles.addText, { color: colors.foreground }]}>Add line item</Text>
        </Pressable>

        <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 16 }]}>Frequency</Text>
        <View style={styles.chipsRow}>
          {FREQUENCIES.map((f) => {
            const active = frequency === f.value;
            return (
              <Pressable
                key={f.value}
                onPress={() => setFrequency(f.value)}
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
                <Text style={[styles.chipText, { color: active ? colors.primaryForeground : colors.foreground }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 16 }]}>First due date</Text>
        {Platform.OS === "web" ? (
          <View style={[styles.dateCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Feather name="calendar" size={16} color={colors.primary} />
            {/* @ts-ignore web-only */}
            <input
              type="date"
              value={nextDueDate.split("T")[0]}
              onChange={(e: any) => {
                if (e.target.value) setNextDueDate(new Date(e.target.value + "T12:00:00").toISOString());
              }}
              style={{ flex: 1, border: "none", background: "transparent", fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.foreground, outline: "none", cursor: "pointer" }}
            />
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => setShowDatePicker((v) => !v)}
              style={({ pressed }) => [
                styles.dateCard,
                { backgroundColor: colors.card, borderColor: showDatePicker ? colors.primary : colors.border, borderRadius: colors.radius, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather name="calendar" size={16} color={colors.primary} />
              <Text style={[styles.dateLabel, { color: colors.foreground }]}>{dueDateDisplay}</Text>
              <Feather name={showDatePicker ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={new Date(nextDueDate)}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}
          </>
        )}

        <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 16 }]}>Auto-send</Text>
        <View style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Email customer automatically</Text>
            <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>
              {autoSend
                ? `Invoice will be emailed to ${customerEmail || "your customer"} each time it's generated`
                : "You'll send the invoice manually after generating it"}
            </Text>
          </View>
          <Switch
            value={autoSend}
            onValueChange={setAutoSend}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.primaryForeground}
          />
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

        <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 16 }]}>Notes & terms</Text>
        <TextInput
          placeholder="Payment instructions, terms..."
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

        <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Per invoice total</Text>
          <Text style={[styles.totalValue, { color: colors.foreground }]}>
            {formatMoney(total, user?.currency)}
          </Text>
        </View>

        <PrimaryButton title={isNew ? "Create template" : "Save changes"} onPress={onSave} loading={saving} icon="check" />
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: "Inter_600SemiBold", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  input: { paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, fontFamily: "Inter_500Medium", fontSize: 15, marginBottom: 6 },
  error: { fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 8 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderWidth: 1, borderStyle: "dashed", marginBottom: 8 },
  addText: { fontFamily: "Inter_500Medium", fontSize: 14, marginLeft: 6 },
  chipsRow: { flexDirection: "row", marginBottom: 6, flexWrap: "wrap" },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, marginRight: 8, marginBottom: 8 },
  chipText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
    gap: 10,
  },
  dateLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15, flex: 1 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  toggleLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: 3 },
  toggleSub: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },
  notesInput: { minHeight: 80, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, fontFamily: "Inter_400Regular", fontSize: 14, textAlignVertical: "top", marginBottom: 6 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 18, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, marginBottom: 18 },
  totalLabel: { fontFamily: "Inter_500Medium", fontSize: 14, textTransform: "uppercase", letterSpacing: 0.4 },
  totalValue: { fontFamily: "Inter_700Bold", fontSize: 24, fontVariant: ["tabular-nums"] },
});
