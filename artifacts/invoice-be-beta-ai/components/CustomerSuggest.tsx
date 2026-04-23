import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { TextField } from "./TextField";

export type CustomerSuggestion = { name: string; email: string; lastUsed: string };

type Props = {
  customers: CustomerSuggestion[];
  name: string;
  email: string;
  onChangeName: (v: string) => void;
  onChangeEmail: (v: string) => void;
  onPick: (c: CustomerSuggestion) => void;
  nameError?: string;
  emailError?: string;
};

export function CustomerSuggest({
  customers,
  name,
  email,
  onChangeName,
  onChangeEmail,
  onPick,
  nameError,
  emailError,
}: Props) {
  const colors = useColors();
  const [activeField, setActiveField] = useState<"name" | "email" | null>(null);

  const matches = useMemo(() => {
    const q = (activeField === "email" ? email : name).trim().toLowerCase();
    if (!q) return customers.slice(0, 5);
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      .slice(0, 5);
  }, [customers, name, email, activeField]);

  const showList = activeField !== null && matches.length > 0;

  return (
    <View>
      <TextField
        label="Name"
        placeholder="Acme Corp"
        value={name}
        onChangeText={onChangeName}
        error={nameError}
        onFocus={() => setActiveField("name")}
        onBlur={() => setTimeout(() => setActiveField((f) => (f === "name" ? null : f)), 150)}
      />
      <TextField
        label="Email"
        placeholder="billing@acme.com"
        value={email}
        onChangeText={onChangeEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        error={emailError}
        onFocus={() => setActiveField("email")}
        onBlur={() => setTimeout(() => setActiveField((f) => (f === "email" ? null : f)), 150)}
      />

      {showList && (
        <View
          style={[
            styles.list,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Feather name="users" size={12} color={colors.mutedForeground} />
            <Text style={[styles.headerText, { color: colors.mutedForeground }]}>Recent customers</Text>
          </View>
          {matches.map((c, i) => (
            <Pressable
              key={`${c.email}-${i}`}
              onPress={() => {
                onPick(c);
                setActiveField(null);
              }}
              style={({ pressed }) => [
                styles.row,
                i < matches.length - 1 && {
                  borderBottomColor: colors.border,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                <Text style={[styles.avatarText, { color: colors.foreground }]}>
                  {c.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={[styles.email, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {c.email}
                </Text>
              </View>
              <Feather name="corner-down-left" size={14} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    borderWidth: 1,
    marginTop: -6,
    marginBottom: 14,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  headerText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginLeft: 6,
  },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  email: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
});
