import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";

type PurchasePackage = Parameters<ReturnType<typeof useSubscription>["purchase"]>[0];

export default function PaywallScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { offerings, isLoading, purchase, restore, isPurchasing, isRestoring } =
    useSubscription();

  const [selectedPkg, setSelectedPkg] = useState<PurchasePackage | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [restoreResult, setRestoreResult] = useState<"success" | "none" | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const currentOffering = offerings?.current;
  const monthlyPkg = currentOffering?.availablePackages.find(
    (p) => p.identifier === "$rc_monthly"
  );
  const yearlyPkg = currentOffering?.availablePackages.find(
    (p) => p.identifier === "$rc_annual"
  );

  const handlePressBuy = (pkg: PurchasePackage) => {
    setSelectedPkg(pkg);
    setConfirmVisible(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedPkg) return;
    setConfirmVisible(false);
    setPurchaseError(null);
    try {
      await purchase(selectedPkg);
      router.back();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.toLowerCase().includes("cancel")) {
        setPurchaseError("Purchase could not be completed. Please try again.");
      }
    }
  };

  const handleRestore = async () => {
    setRestoreResult(null);
    try {
      const info = await restore();
      const hasActive = Object.keys(info.entitlements.active).length > 0;
      if (hasActive) {
        setRestoreResult("success");
        setTimeout(() => router.back(), 1200);
      } else {
        setRestoreResult("none");
      }
    } catch {
      setRestoreResult("none");
    }
  };

  const features = [
    "Unlimited invoices every month",
    "Unlimited quotes & estimates",
    "PDF generation & email delivery",
    "Stripe payment links",
    "Revenue dashboard & reports",
    "Overdue payment reminders",
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.primary + "15", borderRadius: colors.radius }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primary }]}>
            <Feather name="zap" size={28} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>Upgrade to Pro</Text>
          <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
            Unlock unlimited invoicing and all premium features
          </Text>
        </View>

        {/* Feature list */}
        <View style={[styles.featureList, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {features.map((f, i) => (
            <View key={f} style={[styles.featureRow, i < features.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
              <View style={[styles.checkCircle, { backgroundColor: colors.primary + "20" }]}>
                <Feather name="check" size={13} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, { color: colors.foreground }]}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Package cards */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Choose your plan</Text>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : (
          <>
            {/* Monthly */}
            {monthlyPkg && (
              <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={styles.planCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planName, { color: colors.foreground }]}>Monthly</Text>
                    <Text style={[styles.planPrice, { color: colors.primary }]}>
                      {monthlyPkg.product.priceString}
                      <Text style={[styles.planPeriod, { color: colors.mutedForeground }]}> / month</Text>
                    </Text>
                    <Text style={[styles.planDesc, { color: colors.mutedForeground }]}>
                      Billed monthly, cancel anytime
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => handlePressBuy(monthlyPkg)}
                  disabled={isPurchasing}
                  style={({ pressed }) => [
                    styles.planBtn,
                    { backgroundColor: colors.primary, borderRadius: colors.radius - 2, opacity: pressed || isPurchasing ? 0.7 : 1 },
                  ]}
                >
                  {isPurchasing && selectedPkg?.identifier === monthlyPkg.identifier ? (
                    <ActivityIndicator color={colors.primaryForeground} size="small" />
                  ) : (
                    <Text style={[styles.planBtnText, { color: colors.primaryForeground }]}>Subscribe monthly</Text>
                  )}
                </Pressable>
              </View>
            )}

            {/* Yearly — Most popular */}
            {yearlyPkg && (
              <View style={[styles.planCard, styles.planCardFeatured, { backgroundColor: colors.card, borderColor: colors.primary, borderRadius: colors.radius }]}>
                <View style={[styles.popularBadge, { backgroundColor: colors.primary, borderRadius: colors.radius - 2 }]}>
                  <Feather name="star" size={11} color={colors.primaryForeground} />
                  <Text style={[styles.popularText, { color: colors.primaryForeground }]}>Most popular</Text>
                </View>
                <View style={styles.planCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planName, { color: colors.foreground }]}>Yearly</Text>
                    <Text style={[styles.planPrice, { color: colors.primary }]}>
                      {yearlyPkg.product.priceString}
                      <Text style={[styles.planPeriod, { color: colors.mutedForeground }]}> / year</Text>
                    </Text>
                    <Text style={[styles.planDesc, { color: colors.mutedForeground }]}>
                      Save ~33% vs monthly · Billed annually
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => handlePressBuy(yearlyPkg)}
                  disabled={isPurchasing}
                  style={({ pressed }) => [
                    styles.planBtn,
                    { backgroundColor: colors.primary, borderRadius: colors.radius - 2, opacity: pressed || isPurchasing ? 0.7 : 1 },
                  ]}
                >
                  {isPurchasing && selectedPkg?.identifier === yearlyPkg.identifier ? (
                    <ActivityIndicator color={colors.primaryForeground} size="small" />
                  ) : (
                    <Text style={[styles.planBtnText, { color: colors.primaryForeground }]}>Subscribe yearly</Text>
                  )}
                </Pressable>
              </View>
            )}

            {!monthlyPkg && !yearlyPkg && (
              <Text style={[styles.noPlans, { color: colors.mutedForeground }]}>
                No plans available. Please check your connection and try again.
              </Text>
            )}
          </>
        )}

        {/* Maybe later */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.maybeLaterBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.maybeLaterText, { color: colors.mutedForeground }]}>Maybe later</Text>
        </Pressable>

        {/* Restore */}
        <Pressable
          onPress={handleRestore}
          disabled={isRestoring}
          style={({ pressed }) => [styles.restoreBtn, { opacity: pressed || isRestoring ? 0.6 : 1 }]}
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          ) : (
            <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>Restore purchases</Text>
          )}
        </Pressable>

        {restoreResult === "success" && (
          <View style={[styles.restoreResult, { backgroundColor: "#d1fae5", borderRadius: colors.radius }]}>
            <Feather name="check-circle" size={15} color="#065f46" />
            <Text style={[styles.restoreResultText, { color: "#065f46" }]}>Pro restored! Redirecting…</Text>
          </View>
        )}
        {restoreResult === "none" && (
          <View style={[styles.restoreResult, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
            <Feather name="info" size={15} color={colors.mutedForeground} />
            <Text style={[styles.restoreResultText, { color: colors.mutedForeground }]}>No active subscription found</Text>
          </View>
        )}

        {purchaseError && (
          <View style={[styles.restoreResult, { backgroundColor: "#fee2e2", borderRadius: colors.radius, marginBottom: 8 }]}>
            <Feather name="alert-circle" size={15} color="#dc2626" />
            <Text style={[styles.restoreResultText, { color: "#dc2626" }]}>{purchaseError}</Text>
          </View>
        )}

        {/* Legal links */}
        <View style={styles.legalLinks}>
          <Pressable onPress={() => Linking.openURL("https://www.invoicebebeta.com/privacy-policy")}>
            <Text style={[styles.legalLink, { color: colors.primary }]}>Privacy Policy</Text>
          </Pressable>
          <Text style={[styles.legalSep, { color: colors.mutedForeground }]}>·</Text>
          <Pressable onPress={() => Linking.openURL("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")}>
            <Text style={[styles.legalLink, { color: colors.primary }]}>Terms of Use</Text>
          </Pressable>
        </View>

        {/* Legal */}
        <Text style={[styles.legal, { color: colors.mutedForeground }]}>
          Payment charged to your Apple ID account. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. Manage or cancel in Settings &gt; Apple ID &gt; Subscriptions.
        </Text>
      </ScrollView>

      {/* Custom confirm overlay */}
      {confirmVisible && selectedPkg && (
        <View style={styles.overlay}>
          <View
            style={[
              styles.confirmSheet,
              { backgroundColor: colors.card, borderRadius: colors.radius * 2 },
            ]}
          >
            <View style={[styles.confirmIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="zap" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>
              Confirm subscription
            </Text>
            <Text style={[styles.confirmPrice, { color: colors.primary }]}>
              {selectedPkg.product.priceString}
              {selectedPkg.identifier === "$rc_monthly" ? " / month" : " / year"}
            </Text>
            <Text style={[styles.confirmDesc, { color: colors.mutedForeground }]}>
              You'll be billed through the App Store. Cancel anytime.
            </Text>
            <View style={styles.confirmBtns}>
              <Pressable
                onPress={() => setConfirmVisible(false)}
                style={({ pressed }) => [
                  styles.confirmCancel,
                  { borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.confirmCancelText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmPurchase}
                style={({ pressed }) => [
                  styles.confirmConfirm,
                  { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[styles.confirmConfirmText, { color: colors.primaryForeground }]}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 20 },
  closeBtn: { padding: 8 },
  hero: { alignItems: "center", padding: 28, marginBottom: 20 },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 26, marginBottom: 8 },
  heroSubtitle: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center", lineHeight: 22 },
  featureList: { borderWidth: 1, marginBottom: 24, overflow: "hidden" },
  featureRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  featureText: { fontFamily: "Inter_500Medium", fontSize: 14, flex: 1 },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  planCard: { borderWidth: 1, marginBottom: 12, padding: 16, overflow: "hidden" },
  planCardFeatured: { borderWidth: 2 },
  popularBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
    gap: 5,
  },
  popularText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  planCardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  planName: { fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 4 },
  planPrice: { fontFamily: "Inter_700Bold", fontSize: 22, fontVariant: ["tabular-nums"] },
  planPeriod: { fontFamily: "Inter_400Regular", fontSize: 15 },
  planDesc: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4 },
  planBtn: { paddingVertical: 13, alignItems: "center" },
  planBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  noPlans: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", marginVertical: 24 },
  maybeLaterBtn: { alignItems: "center", paddingVertical: 14 },
  maybeLaterText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  restoreBtn: { alignItems: "center", paddingVertical: 10 },
  restoreText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  restoreResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    marginBottom: 12,
  },
  restoreResultText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  legalLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  legalLink: { fontFamily: "Inter_500Medium", fontSize: 12 },
  legalSep: { fontFamily: "Inter_400Regular", fontSize: 12 },
  legal: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  confirmSheet: {
    width: "100%",
    maxWidth: 360,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  confirmTitle: { fontFamily: "Inter_700Bold", fontSize: 20, marginBottom: 6 },
  confirmPrice: { fontFamily: "Inter_700Bold", fontSize: 26, marginBottom: 10, fontVariant: ["tabular-nums"] },
  confirmDesc: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  confirmBtns: { flexDirection: "row", gap: 12, width: "100%" },
  confirmCancel: { flex: 1, borderWidth: 1, paddingVertical: 13, alignItems: "center" },
  confirmCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  confirmConfirm: { flex: 1, paddingVertical: 13, alignItems: "center" },
  confirmConfirmText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
