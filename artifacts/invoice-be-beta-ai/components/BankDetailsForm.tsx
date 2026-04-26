import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { BankDetails } from "@/utils/types";

type Props = {
  value?: BankDetails;
  onChange: (details: BankDetails | null) => void;
};

const EMPTY: BankDetails = {
  accountHolderName: "",
  sortCode: "",
  accountNumber: "",
  bankName: "",
  reference: "",
};

function formatSortCode(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 6);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6)].filter(Boolean);
  return parts.join("-");
}

export function BankDetailsForm({ value, onChange }: Props) {
  const colors = useColors();
  const [enabled, setEnabled] = useState(!!value);
  const [form, setForm] = useState<BankDetails>(value ?? EMPTY);
  const [saved, setSaved] = useState(!!value);

  useEffect(() => {
    if (value) { setEnabled(true); setForm(value); setSaved(true); }
  }, []);

  const set = (key: keyof BankDetails, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    setSaved(false);
  };

  const onToggle = (v: boolean) => {
    setEnabled(v);
    if (!v) { onChange(null); setSaved(true); }
  };

  const onSave = () => {
    const trimmed: BankDetails = {
      accountHolderName: form.accountHolderName.trim(),
      sortCode: form.sortCode.trim(),
      accountNumber: form.accountNumber.trim(),
      bankName: form.bankName?.trim() || undefined,
      reference: form.reference?.trim() || undefined,
    };
    onChange(trimmed);
    setSaved(true);
  };

  const isValid = form.accountHolderName.trim() && form.sortCode.replace(/\D/g, "").length === 6 && form.accountNumber.replace(/\D/g, "").length >= 7;

  const inputStyle = {
    color: colors.foreground,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: colors.radius,
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>BACS bank transfer</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Show payment details on every invoice
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ true: colors.primary, false: colors.muted }}
          thumbColor="#ffffff"
        />
      </View>

      {enabled && (
        <View style={{ marginTop: 14 }}>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Field label="Account holder name" required>
            <TextInput
              placeholder="e.g. Jane Smith"
              placeholderTextColor={colors.mutedForeground}
              value={form.accountHolderName}
              onChangeText={(t) => set("accountHolderName", t)}
              style={[styles.input, inputStyle]}
              autoCorrect={false}
            />
          </Field>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Field label="Sort code" required>
                <TextInput
                  placeholder="00-00-00"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.sortCode}
                  onChangeText={(t) => set("sortCode", formatSortCode(t))}
                  keyboardType="number-pad"
                  maxLength={8}
                  style={[styles.input, inputStyle]}
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Account number" required>
                <TextInput
                  placeholder="12345678"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.accountNumber}
                  onChangeText={(t) => set("accountNumber", t.replace(/\D/g, "").slice(0, 8))}
                  keyboardType="number-pad"
                  maxLength={8}
                  style={[styles.input, inputStyle]}
                />
              </Field>
            </View>
          </View>

          <Field label="Bank name" optional>
            <TextInput
              placeholder="e.g. Barclays"
              placeholderTextColor={colors.mutedForeground}
              value={form.bankName ?? ""}
              onChangeText={(t) => set("bankName", t)}
              style={[styles.input, inputStyle]}
              autoCorrect={false}
            />
          </Field>

          <Field label="Payment reference" optional>
            <TextInput
              placeholder="e.g. your name or invoice number"
              placeholderTextColor={colors.mutedForeground}
              value={form.reference ?? ""}
              onChangeText={(t) => set("reference", t)}
              style={[styles.input, inputStyle]}
            />
          </Field>

          <Pressable
            onPress={onSave}
            disabled={!isValid}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: saved ? colors.muted : colors.primary,
                borderRadius: colors.radius,
                opacity: !isValid ? 0.45 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather
              name={saved ? "check" : "save"}
              size={14}
              color={saved ? colors.mutedForeground : colors.primaryForeground}
            />
            <Text style={[styles.saveBtnText, { color: saved ? colors.mutedForeground : colors.primaryForeground }]}>
              {saved ? "Saved" : "Save bank details"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Field({
  label,
  required,
  optional,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 2 }}>
      <View style={styles.fieldLabelRow}>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
        {optional && (
          <Text style={[styles.optionalTag, { color: colors.mutedForeground }]}>optional</Text>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, marginBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 14 },
  row: { flexDirection: "row" },
  fieldLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3 },
  optionalTag: { fontFamily: "Inter_400Regular", fontSize: 10, textTransform: "lowercase" },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    marginBottom: 10,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
    marginTop: 4,
  },
  saveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
