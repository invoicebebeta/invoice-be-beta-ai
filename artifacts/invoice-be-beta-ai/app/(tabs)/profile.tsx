import React, { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useReviews } from "@/contexts/ReviewsContext";
import { useCustomers } from "@/contexts/CustomersContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TextField } from "@/components/TextField";
import { SecondaryButton } from "@/components/SecondaryButton";
import { StarRating } from "@/components/StarRating";
import { EmptyState } from "@/components/EmptyState";
import { CurrencyPicker } from "@/components/CurrencyPicker";
import { LogoPicker } from "@/components/LogoPicker";
import { BankDetailsForm } from "@/components/BankDetailsForm";
import { InvoiceColorPicker } from "@/components/InvoiceColorPicker";
import { useInvoices, FREE_TIER_LIMIT } from "@/contexts/InvoicesContext";
import { useSubscription } from "@/lib/revenuecat";
import { exportInvoicesCsv } from "@/utils/exportCsv";
import {
  disconnectStripe,
  getStripeConnectStatus,
  getStripeConnectUrl,
} from "@/utils/stripeApi";
import { getReviewPageUrl } from "@/utils/reviewApi";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    user, signOut,
    updateBusinessName, updateCurrency, updateLogo,
    updateBankDetails, updateStripeAccount, updateInvoiceColor,
    updateVatNumber, updateBusinessAddress,
  } = useAuth();
  const { reviews, averageRating, refreshReviews } = useReviews();
  const { invoices, monthlyInvoiceCount } = useInvoices();
  const { customers } = useCustomers();
  const { isSubscribed, customerInfo } = useSubscription();
  const [csvLoading, setCsvLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.businessName ?? "");

  const [vatNumber, setVatNumber] = useState(user?.vatNumber ?? "");
  const [vatEditing, setVatEditing] = useState(false);

  const [businessAddress, setBusinessAddress] = useState(user?.businessAddress ?? "");
  const [addressEditing, setAddressEditing] = useState(false);

  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBar = 84;

  useEffect(() => {
    setVatNumber(user?.vatNumber ?? "");
    setBusinessAddress(user?.businessAddress ?? "");
  }, [user?.vatNumber, user?.businessAddress]);

  const onSave = async () => {
    if (!name.trim()) return;
    await updateBusinessName(name.trim());
    setEditing(false);
  };

  const onSaveVat = async () => {
    await updateVatNumber(vatNumber.trim());
    setVatEditing(false);
  };

  const onSaveAddress = async () => {
    await updateBusinessAddress(businessAddress.trim());
    setAddressEditing(false);
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
      refreshReviews();
    }, [refreshStripeStatus, refreshReviews])
  );

  const handleShareReviewPage = async () => {
    if (!user) return;
    const url = getReviewPageUrl(user.id);
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(url).catch(() => {});
      window.alert(`Review page link copied!\n\n${url}`);
      return;
    }
    try {
      await Share.share({ message: `Leave ${user.businessName} a review: ${url}`, url });
    } catch {
      await Clipboard.setStringAsync(url);
      Alert.alert("Review page link copied", "Share this with your customers to collect reviews.");
    }
  };

  const handleConnectStripe = async () => {
    if (!user) return;
    setStripeLoading(true);

    let win: Window | null = null;
    if (Platform.OS === 'web') {
      win = window.open('', '_blank');
    }

    const result = await getStripeConnectUrl(user.id);
    setStripeLoading(false);

    if ('error' in result) {
      if (win) win.close();
      const msg = (result as { error: string }).error;
      if (msg.includes('client_id not configured')) {
        showAlert(
          'Stripe Connect not configured',
          'To enable Stripe Connect, add your STRIPE_CONNECT_CLIENT_ID to the environment.'
        );
      } else {
        showAlert('Could not connect', msg);
      }
      return;
    }

    if (Platform.OS === 'web') {
      if (win) {
        win.location.href = result.url;
      } else {
        window.open(result.url, '_blank');
      }
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

  const handleManageSubscription = async () => {
    let url: string | null = customerInfo?.managementURL ?? null;

    if (!url) {
      if (Platform.OS === 'ios') {
        url = 'itms-apps://apps.apple.com/account/subscriptions';
      } else if (Platform.OS === 'android') {
        url = 'https://play.google.com/store/account/subscriptions?package=com.invoicebebeta';
      } else {
        url = 'https://play.google.com/store/account/subscriptions';
      }
    }

    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          showAlert('Cannot open link', 'Please manage your subscription through your device\'s subscription settings.');
        }
      }
    } catch {
      showAlert('Cannot open link', 'Please manage your subscription through your device\'s subscription settings.');
    }
  };

  const proEntitlement = customerInfo?.entitlements.active?.['pro'];
  const renewalDateStr = proEntitlement?.expirationDate
    ? new Date(proEntitlement.expirationDate).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

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

        {/* Plan section */}
        <Text style={[styles.section, { color: colors.mutedForeground }]}>Plan</Text>
        <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {isSubscribed ? (
            <>
              <View style={styles.planRow}>
                <View style={[styles.planIconWrap, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name="zap" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.planTitleRow}>
                    <Text style={[styles.planTitle, { color: colors.foreground }]}>Pro</Text>
                    <View style={[styles.proBadge, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.proBadgeText, { color: colors.primaryForeground }]}>Active</Text>
                    </View>
                  </View>
                  <Text style={[styles.planSub, { color: colors.mutedForeground }]}>
                    {renewalDateStr ? `Renews ${renewalDateStr}` : "Unlimited invoices & all features"}
                  </Text>
                </View>
              </View>
              <View style={[styles.planDivider, { borderTopColor: colors.border }]}>
                <Pressable
                  onPress={handleManageSubscription}
                  style={({ pressed }) => [styles.manageSubBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Feather name="external-link" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.manageSubBtnText, { color: colors.primary }]}>Manage subscription</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.planRow}>
                <View style={[styles.planIconWrap, { backgroundColor: colors.muted }]}>
                  <Feather name="file-text" size={18} color={colors.mutedForeground} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.planTitle, { color: colors.foreground }]}>Free</Text>
                  <Text style={[styles.planSub, { color: colors.mutedForeground }]}>
                    {monthlyInvoiceCount} of {FREE_TIER_LIMIT} invoices used this month
                  </Text>
                </View>
              </View>
              <View style={[styles.planDivider, { borderTopColor: colors.border }]}>
                <Pressable
                  onPress={() => router.push("/paywall")}
                  style={({ pressed }) => [
                    styles.upgradeBtn,
                    { backgroundColor: colors.primary, borderRadius: colors.radius - 2, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Feather name="zap" size={14} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  <Text style={[styles.upgradeBtnText, { color: colors.primaryForeground }]}>Upgrade to Pro</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
        <Text style={[styles.helper, { color: colors.mutedForeground, marginBottom: 24 }]}>
          {isSubscribed
            ? "Thank you for being a Pro subscriber."
            : "Upgrade for unlimited invoices, quotes, and all Pro features."}
        </Text>

        <Text style={[styles.section, { color: colors.mutedForeground }]}>Branding</Text>
        <View style={{ marginBottom: 16 }}>
          <LogoPicker
            logoUri={user?.logoUri}
            businessName={user?.businessName ?? ""}
            onChange={updateLogo}
          />
        </View>
        <Text style={[styles.subsection, { color: colors.mutedForeground }]}>Invoice colour</Text>
        <View style={{ marginBottom: 24 }}>
          <InvoiceColorPicker value={user?.invoiceColor} onChange={updateInvoiceColor} />
          <Text style={[styles.helper, { color: colors.mutedForeground }]}>
            Applied to the header of emails and PDFs sent to customers.
          </Text>
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground }]}>Business details</Text>
        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.detailRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>VAT number</Text>
              {vatEditing ? (
                <TextInput
                  value={vatNumber}
                  onChangeText={setVatNumber}
                  placeholder="e.g. GB123456789"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="characters"
                  autoFocus
                  style={[styles.detailInput, { color: colors.foreground }]}
                  onSubmitEditing={onSaveVat}
                  returnKeyType="done"
                />
              ) : (
                <Text style={[styles.detailValue, { color: vatNumber ? colors.foreground : colors.mutedForeground }]}>
                  {vatNumber || "Not set"}
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => vatEditing ? onSaveVat() : setVatEditing(true)}
              hitSlop={10}
              style={vatEditing
                ? { padding: 8, marginLeft: 8, backgroundColor: colors.primary, borderRadius: 8 }
                : { padding: 6, marginLeft: 8 }
              }
            >
              <Feather name={vatEditing ? "check" : "edit-2"} size={16} color={vatEditing ? colors.primaryForeground : colors.primary} />
            </Pressable>
          </View>

          <View style={[styles.detailDivider, { borderTopColor: colors.border }]} />

          <View style={styles.detailRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Business address</Text>
              {addressEditing ? (
                <TextInput
                  value={businessAddress}
                  onChangeText={setBusinessAddress}
                  placeholder="Your registered business address"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={3}
                  autoFocus
                  style={[styles.detailInput, { color: colors.foreground, minHeight: 60 }]}
                />
              ) : (
                <Text style={[styles.detailValue, { color: businessAddress ? colors.foreground : colors.mutedForeground }]}>
                  {businessAddress || "Not set"}
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => addressEditing ? onSaveAddress() : setAddressEditing(true)}
              hitSlop={10}
              style={addressEditing
                ? { padding: 8, marginLeft: 8, backgroundColor: colors.primary, borderRadius: 8, alignSelf: "flex-start" }
                : { padding: 6, marginLeft: 8, alignSelf: "flex-start" }
              }
            >
              <Feather name={addressEditing ? "check" : "edit-2"} size={16} color={addressEditing ? colors.primaryForeground : colors.primary} />
            </Pressable>
          </View>
        </View>
        <Text style={[styles.helper, { color: colors.mutedForeground, marginBottom: 24 }]}>
          Shown in the footer of all invoices and quotes sent to customers.
        </Text>

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

        <View style={[styles.reviewsHeader]}>
          <Text style={[styles.section, { color: colors.mutedForeground, marginBottom: 0, flex: 1 }]}>Reviews</Text>
          <Pressable
            onPress={handleShareReviewPage}
            style={({ pressed }) => [styles.shareBtn, { borderColor: colors.primary, opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="share-2" size={13} color={colors.primary} />
            <Text style={[styles.shareBtnText, { color: colors.primary }]}>Share your review page</Text>
          </Pressable>
        </View>
        {reviews.length === 0 ? (
          <EmptyState icon="message-square" title="No reviews yet" description="Share your review page link with customers to collect feedback." />
        ) : (
          reviews.map((r) => (
            <View key={r.id} style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <View style={styles.reviewHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <StarRating value={r.rating} size={16} readOnly />
                  {r.customerName ? (
                    <Text style={[styles.reviewCustomer, { color: colors.foreground }]}>{r.customerName}</Text>
                  ) : null}
                </View>
                <Text style={[styles.reviewDate, { color: colors.mutedForeground }]}>
                  {new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </Text>
              </View>
              <Text style={[styles.reviewText, { color: colors.foreground }]}>{r.text}</Text>
            </View>
          ))
        )}

        <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 8 }]}>Customers</Text>
        <Pressable
          onPress={() => router.push("/customers/index")}
          style={({ pressed }) => [
            styles.navRow,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <View style={[styles.navIcon, { backgroundColor: colors.muted }]}>
            <Feather name="users" size={16} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.navLabel, { color: colors.foreground }]}>
            Address book · {customers.length} {customers.length === 1 ? "customer" : "customers"}
          </Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>

        <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 24 }]}>Data</Text>
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

        <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 8 }]}>Help</Text>
        <View style={{ marginBottom: 24, gap: 10 }}>
          <SecondaryButton
            title="Contact support"
            icon="mail"
            onPress={() => {
              const url = "mailto:support@invoicebebeta.com?subject=Invoice%20Be%20Beta%20Support";
              if (Platform.OS === "web") {
                window.open(url, "_blank");
              } else {
                Linking.openURL(url);
              }
            }}
          />
          <SecondaryButton
            title="Privacy policy"
            icon="shield"
            onPress={() => {
              const url = "https://www.invoicebebeta.com/privacy-policy";
              if (Platform.OS === "web") {
                window.open(url, "_blank");
              } else {
                Linking.openURL(url);
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
  subsection: { fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 8 },
  helper: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 8, lineHeight: 17 },
  planCard: { borderWidth: 1, marginBottom: 8, overflow: "hidden" },
  planRow: { flexDirection: "row", alignItems: "center", padding: 16 },
  planIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  planTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  planTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  planSub: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  proBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  proBadgeText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  planDivider: { borderTopWidth: StyleSheet.hairlineWidth, padding: 12 },
  upgradeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 11 },
  upgradeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  manageSubBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 11 },
  manageSubBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  detailCard: { borderWidth: 1, marginBottom: 8, overflow: "hidden" },
  detailRow: { flexDirection: "row", alignItems: "flex-start", padding: 14 },
  detailDivider: { borderTopWidth: StyleSheet.hairlineWidth },
  detailLabel: { fontFamily: "Inter_500Medium", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 },
  detailValue: { fontFamily: "Inter_500Medium", fontSize: 14 },
  detailInput: { fontFamily: "Inter_500Medium", fontSize: 14, padding: 0, margin: 0 },
  stripeCard: { borderWidth: 1, marginBottom: 8, overflow: "hidden" },
  stripeTop: { flexDirection: "row", alignItems: "center", padding: 16 },
  stripeIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stripeTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  stripeSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  stripeDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  stripeDivider: { borderTopWidth: StyleSheet.hairlineWidth },
  stripeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 13, paddingHorizontal: 16 },
  stripeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  reviewsHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1 },
  shareBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  reviewCard: { padding: 14, borderWidth: 1, marginBottom: 10 },
  reviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  reviewCustomer: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  reviewDate: { fontFamily: "Inter_500Medium", fontSize: 12 },
  reviewText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  navRow: { flexDirection: "row", alignItems: "center", padding: 14, borderWidth: 1, marginBottom: 8, gap: 12 },
  navIcon: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  navLabel: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14 },
});
