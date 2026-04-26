import React, { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useReviews } from "@/contexts/ReviewsContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TextField } from "@/components/TextField";
import { SecondaryButton } from "@/components/SecondaryButton";
import { StarRating } from "@/components/StarRating";
import { EmptyState } from "@/components/EmptyState";
import { CurrencyPicker } from "@/components/CurrencyPicker";
import { LogoPicker } from "@/components/LogoPicker";
import { BankDetailsForm } from "@/components/BankDetailsForm";
import { useInvoices } from "@/contexts/InvoicesContext";
import { exportInvoicesCsv } from "@/utils/exportCsv";
import {
  disconnectStripe,
  getStripeConnectStatus,
  getStripeConnectUrl,
} from "@/utils/stripeApi";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut, updateBusinessName, updateCurrency, updateLogo, updateBankDetails, updateStripeAccount } = useAuth();
  const { reviews, averageRating } = useReviews();
  const { invoices } = useInvoices();
  const [csvLoading, setCsvLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.businessName ?? "");

  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBar = 84;

  const onSave = async () => {
    if (!name.trim()) return;
    await updateBusinessName(name.trim());
    setEditing(false);
  };

  const refreshStripeStatus = useCallback(async () => {
    if (!user) return;
    const status = await getStripeConnectStatus(user.id);
    setStripeConnected(status.connected);
    setStripeAccountId(status.accountId);
    if (status.connected && status.accountId && user.stripeConnectedAccountId !== status.accountId) {
      await updateStripeAccount(status.accountId);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      refreshStripeStatus();
    }, [refreshStripeStatus])
  );

  const handleConnectStripe = async () => {
    if (!user) return;
    setStripeLoading(true);
    const result = await getStripeConnectUrl(user.id);
    setStripeLoading(false);
    if ('error' in result) {
      const msg = (result as any).error as string;
      if (msg.includes('client_id not configured')) {
        showAlert(
          'Stripe Connect not configured',
          'To enable Stripe Connect, add your STRIPE_CONNECT_CLIENT_ID to the environment. You can get this from the Stripe Dashboard under Connect > Settings.'
        );
      } else {
        showAlert('Could not connect', msg);
      }
      return;
    }
    if (Platform.OS === 'web') {
      window.open(result.url, '_blank');
    } else {
      Linking.openURL(result.url);
    }
  };

  const handleDisconnectStripe = () => {
    if (!user) return;
    const doDisconnect = async () => {
      setStripeLoading(true);
      await disconnectStripe(user.id);
      await updateStripeAccount(null);
      setStripeConnected(false);
      setStripeAccountId(null);
      setStripeLoading(false);
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Disconnect your Stripe account? Customers will no longer be able to pay invoices via Stripe.')) {
        doDisconnect();
      }
    } else {
      Alert.alert(
        'Disconnect Stripe?',
        'Customers will no longer be able to pay invoices via Stripe.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disconnect', style: 'destructive', onPress: doDisconnect },
        ]
      );
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topInset, paddingBottom: tabBar + 24 }}
    >
      <ScreenHeader title="Profile" subtitle="Your business and reviews" />

      <View style={{ paddingHorizontal: 20 }}>
        <View style={[styles.businessCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Feather name="briefcase" size={20} color={colors.primaryForeground} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              {editing ? (
                <TextField placeholder="Business name" value={name} onChangeText={setName} autoFocus />
              ) : (
                <>
                  <Text style={[styles.businessName, { color: colors.foreground }]}>{user?.businessName ?? "Your studio"}</Text>
                  <Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.email}</Text>
                </>
              )}
            </View>
            <Pressable onPress={() => (editing ? onSave() : setEditing(true))} hitSlop={10} style={{ padding: 6 }}>
              <Feather name={editing ? "check" : "edit-2"} size={18} color={colors.primary} />
            </Pressable>
          </View>

          <View style={[styles.ratingRow, { borderTopColor: colors.border }]}>
            <View>
              <Text style={[styles.ratingNumber, { color: colors.foreground }]}>{averageRating.toFixed(1)}</Text>
              <Text style={[styles.ratingSub, { color: colors.mutedForeground }]}>
                {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
              </Text>
            </View>
            <StarRating value={averageRating} size={22} readOnly />
          </View>
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground }]}>Branding</Text>
        <View style={{ marginBottom: 24 }}>
          <LogoPicker
            logoUri={user?.logoUri}
            businessName={user?.businessName ?? ""}
            onChange={updateLogo}
          />
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground }]}>Stripe payments</Text>
        <View style={[styles.stripeCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.stripeTop}>
            <View style={[styles.stripeIconWrap, { backgroundColor: stripeConnected ? '#e8f4ed' : colors.muted }]}>
              <Feather name="credit-card" size={20} color={stripeConnected ? '#4a7c59' : colors.mutedForeground} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.stripeTitle, { color: colors.foreground }]}>
                {stripeConnected ? 'Stripe connected' : 'Connect Stripe'}
              </Text>
              <Text style={[styles.stripeSub, { color: colors.mutedForeground }]}>
                {stripeConnected
                  ? `Account: ${stripeAccountId ?? ''}`
                  : 'Accept card payments directly in your invoices'}
              </Text>
            </View>
            <View style={[styles.stripeDot, { backgroundColor: stripeConnected ? '#4a7c59' : colors.border }]} />
          </View>
          <View style={[styles.stripeDivider, { borderTopColor: colors.border }]}>
            {stripeConnected ? (
              <Pressable
                onPress={handleDisconnectStripe}
                disabled={stripeLoading}
                style={({ pressed }) => [styles.stripeBtn, { opacity: pressed || stripeLoading ? 0.6 : 1 }]}
              >
                <Text style={[styles.stripeBtnText, { color: colors.destructive }]}>Disconnect Stripe</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleConnectStripe}
                disabled={stripeLoading}
                style={({ pressed }) => [styles.stripeBtn, { opacity: pressed || stripeLoading ? 0.6 : 1 }]}
              >
                <Feather name="external-link" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.stripeBtnText, { color: colors.primary }]}>
                  {stripeLoading ? 'Opening Stripe…' : 'Connect your Stripe account'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
        <Text style={[styles.helper, { color: colors.mutedForeground, marginTop: -12, marginBottom: 24 }]}>
          Once connected, customers can pay your invoices by card through Stripe. Money goes directly to your account.
        </Text>

        <Text style={[styles.section, { color: colors.mutedForeground }]}>Payment details</Text>
        <View style={{ marginBottom: 24 }}>
          <BankDetailsForm value={user?.bankDetails} onChange={updateBankDetails} />
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground }]}>Currency</Text>
        <View style={{ marginBottom: 24 }}>
          <CurrencyPicker value={user?.currency ?? "USD"} onChange={updateCurrency} />
          <Text style={[styles.helper, { color: colors.mutedForeground }]}>
            New invoices will use this currency. Existing invoices keep their original currency.
          </Text>
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground }]}>Reviews</Text>
        {reviews.length === 0 ? (
          <EmptyState icon="message-square" title="No reviews yet" description="Reviews appear here after your customers leave feedback." />
        ) : (
          reviews.map((r) => (
            <View key={r.id} style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <View style={styles.reviewHeader}>
                <StarRating value={r.rating} size={16} readOnly />
                <Text style={[styles.reviewDate, { color: colors.mutedForeground }]}>
                  {new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </Text>
              </View>
              <Text style={[styles.reviewText, { color: colors.foreground }]}>{r.text}</Text>
            </View>
          ))
        )}

        <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 8 }]}>Data</Text>
        <View style={{ marginBottom: 24, gap: 10 }}>
          <SecondaryButton
            title={csvLoading ? "Exporting…" : `Export invoices (${invoices.length})`}
            icon="download"
            onPress={async () => {
              if (!invoices.length) {
                Alert.alert("Nothing to export", "You don't have any invoices yet.");
                return;
              }
              setCsvLoading(true);
              try {
                await exportInvoicesCsv(invoices);
              } finally {
                setCsvLoading(false);
              }
            }}
          />
        </View>

        <View style={{ marginTop: 8 }}>
          <SecondaryButton title="Sign out" onPress={signOut} icon="log-out" />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  businessCard: { padding: 18, borderWidth: 1, marginBottom: 24 },
  row: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  businessName: { fontFamily: "Inter_700Bold", fontSize: 18 },
  email: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  ratingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 14 },
  ratingNumber: { fontFamily: "Inter_700Bold", fontSize: 26, fontVariant: ["tabular-nums"] },
  ratingSub: { fontFamily: "Inter_400Regular", fontSize: 12 },
  section: { fontFamily: "Inter_600SemiBold", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  helper: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 8, lineHeight: 17 },
  stripeCard: { borderWidth: 1, marginBottom: 8, overflow: "hidden" },
  stripeTop: { flexDirection: "row", alignItems: "center", padding: 16 },
  stripeIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stripeTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  stripeSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  stripeDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  stripeDivider: { borderTopWidth: StyleSheet.hairlineWidth },
  stripeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 13, paddingHorizontal: 16 },
  stripeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  reviewCard: { padding: 14, borderWidth: 1, marginBottom: 10 },
  reviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  reviewDate: { fontFamily: "Inter_500Medium", fontSize: 12 },
  reviewText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
});
