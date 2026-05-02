import React, { useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useInvoices } from "@/contexts/InvoicesContext";
import { storage } from "@/utils/storage";

const ALL_STEPS: {
  key: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  description: string;
}[] = [
  {
    key: "logo",
    icon: "image",
    title: "Add your logo",
    description: "Make invoices look professional with your brand.",
  },
  {
    key: "stripe",
    icon: "credit-card",
    title: "Connect Stripe",
    description: "Let customers pay invoices by card — money goes straight to you.",
  },
  {
    key: "bank",
    icon: "dollar-sign",
    title: "Add bank details",
    description: "Share your sort code and account number for bank transfers.",
  },
  {
    key: "invoice",
    icon: "file-text",
    title: "Create your first invoice",
    description: "Send it in seconds and get paid faster.",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { invoices } = useInvoices();

  const remainingSteps = useMemo(() => {
    if (!user) return ALL_STEPS;
    const hasRealInvoice = invoices.some((inv) => !inv.isQuote);
    return ALL_STEPS.filter((step) => {
      switch (step.key) {
        case "logo":    return !user.logoUri;
        case "stripe":  return !user.stripeConnectedAccountId;
        case "bank":    return !user.bankDetails?.accountNumber;
        case "invoice": return !hasRealInvoice;
        default:        return true;
      }
    });
  }, [user, invoices]);

  const dismissAllDone = async () => {
    if (user) await storage.set(`onboarding_seen_${user.id}`, true);
    router.replace("/(tabs)");
  };

  const dismissForNow = () => {
    router.replace("/(tabs)");
  };

  useEffect(() => {
    if (remainingSteps.length === 0) {
      dismissAllDone();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSteps.length]);

  if (remainingSteps.length === 0) return null;

  const totalDone = ALL_STEPS.length - remainingSteps.length;

  const subtitle =
    totalDone === 0
      ? `${user?.businessName ? `Hi ${user.businessName}, you're` : "You're"} all set up. Here's what to do first to get the most out of the app.`
      : `${totalDone} of ${ALL_STEPS.length} done — keep going, you're nearly there.`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
          flexGrow: 1,
        }}
      >
        <View style={[styles.headerBadge, { backgroundColor: colors.primary }]}>
          <Feather name="zap" size={18} color={colors.primaryForeground} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {totalDone === 0 ? "Welcome to Invoice Be Beta" : "Almost set up"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {subtitle}
        </Text>

        {totalDone > 0 && (
          <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${(totalDone / ALL_STEPS.length) * 100}%` as `${number}%`,
                },
              ]}
            />
          </View>
        )}

        <View style={styles.steps}>
          {remainingSteps.map((step, i) => (
            <View
              key={step.key}
              style={[
                styles.stepCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                <Text style={[styles.stepNumText, { color: colors.primaryForeground }]}>
                  {i + 1}
                </Text>
              </View>
              <View style={[styles.stepIcon, { backgroundColor: colors.muted }]}>
                <Feather name={step.icon} size={18} color={colors.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, { color: colors.foreground }]}>{step.title}</Text>
                <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
                  {step.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          You can do all of this from the Profile tab. Take your time — you can always come back.
        </Text>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: 24,
            paddingTop: 16,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          onPress={dismissForNow}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: colors.primary,
              borderRadius: colors.radius,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>
            {totalDone === 0 ? "Let's go" : "Continue"}
          </Text>
          <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 10, lineHeight: 34 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22, marginBottom: 16 },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 24,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  steps: { gap: 10, marginBottom: 24 },
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: -6,
    left: -6,
    zIndex: 1,
  },
  stepNumText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: 2 },
  stepDesc: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  hint: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18, textAlign: "center" },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  ctaText: { fontFamily: "Inter_700Bold", fontSize: 16 },
});
