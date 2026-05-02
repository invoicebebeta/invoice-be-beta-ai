import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useInvoices, FREE_TIER_LIMIT } from "@/contexts/InvoicesContext";
import { useSubscription } from "@/lib/revenuecat";

export function UsageBanner() {
  const colors = useColors();
  const router = useRouter();
  const { monthlyInvoiceCount } = useInvoices();
  const { isSubscribed } = useSubscription();

  if (isSubscribed) return null;
  if (monthlyInvoiceCount < FREE_TIER_LIMIT - 1) return null;

  const atLimit = monthlyInvoiceCount >= FREE_TIER_LIMIT;
  const bg = atLimit ? "#fef2f2" : "#fffbeb";
  const borderColor = atLimit ? "#fca5a5" : "#fcd34d";
  const textColor = atLimit ? "#991b1b" : "#92400e";

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: bg, borderColor, borderRadius: colors.radius },
      ]}
    >
      <Feather
        name={atLimit ? "alert-circle" : "info"}
        size={15}
        color={textColor}
        style={{ marginTop: 1 }}
      />
      <Text style={[styles.text, { color: textColor, flex: 1 }]}>
        {atLimit
          ? "You've reached your free limit of 3 invoices this month"
          : `${monthlyInvoiceCount} of ${FREE_TIER_LIMIT} free invoices used this month`}
      </Text>
      <Pressable
        onPress={() => router.push("/paywall")}
        style={({ pressed }) => [styles.upgradeBtn, { backgroundColor: textColor, borderRadius: colors.radius - 2, opacity: pressed ? 0.8 : 1 }]}
        hitSlop={6}
      >
        <Text style={styles.upgradeBtnText}>Upgrade</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  text: { fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 18 },
  upgradeBtn: { paddingVertical: 5, paddingHorizontal: 10 },
  upgradeBtnText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#fff" },
});
