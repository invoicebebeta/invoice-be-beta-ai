import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { storage } from "@/utils/storage";

const STEPS = [
  {
    icon: "image" as const,
    title: "Add your logo",
    description: "Make invoices look professional with your brand.",
  },
  {
    icon: "credit-card" as const,
    title: "Connect Stripe",
    description: "Let customers pay invoices by card — money goes straight to you.",
  },
  {
    icon: "dollar-sign" as const,
    title: "Add bank details",
    description: "Share your sort code and account number for bank transfers.",
  },
  {
    icon: "file-text" as const,
    title: "Create your first invoice",
    description: "Send it in seconds and get paid faster.",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const dismiss = async () => {
    if (user) {
      await storage.set(`onboarding_seen_${user.id}`, true);
    }
    router.replace("/(tabs)");
  };

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
          Welcome to Invoice Be Beta
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {user?.businessName ? `Hi ${user.businessName}, you're` : "You're"} all set up. Here's what to do first to get the most out of the app.
        </Text>

        <View style={styles.steps}>
          {STEPS.map((step, i) => (
            <View
              key={step.title}
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
                <Text style={[styles.stepNumText, { color: colors.primaryForeground }]}>{i + 1}</Text>
              </View>
              <View style={[styles.stepIcon, { backgroundColor: colors.muted }]}>
                <Feather name={step.icon} size={18} color={colors.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, { color: colors.foreground }]}>{step.title}</Text>
                <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>{step.description}</Text>
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
          onPress={dismiss}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: colors.primary,
              borderRadius: colors.radius,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Let's go</Text>
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
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22, marginBottom: 32 },
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
