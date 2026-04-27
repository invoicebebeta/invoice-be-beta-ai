import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { TextField } from "@/components/TextField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { apiForgotPassword } from "@/utils/authApi";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const onSubmit = async () => {
    if (!email.trim()) { setError("Please enter your email address"); return; }
    setError(null);
    setSubmitting(true);
    const result = await apiForgotPassword(email.trim());
    setSubmitting(false);
    if (result.error) { setError(result.error); return; }
    setSent(true);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: topInset + 24, paddingBottom: bottomInset + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
        <Feather name="arrow-left" size={20} color={colors.foreground} />
      </Pressable>

      <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
        <Feather name="mail" size={24} color={colors.primary} />
      </View>

      <Text style={[styles.title, { color: colors.foreground }]}>Forgot password?</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        Enter your email and we'll send you a link to reset your password.
      </Text>

      {sent ? (
        <View style={[styles.successBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="check-circle" size={20} color={colors.primary} style={{ marginBottom: 8 }} />
          <Text style={[styles.successTitle, { color: colors.foreground }]}>Check your inbox</Text>
          <Text style={[styles.successText, { color: colors.mutedForeground }]}>
            If an account exists for <Text style={{ fontFamily: "Inter_600SemiBold" }}>{email.trim()}</Text>, you'll receive a reset link shortly. The link expires in 1 hour.
          </Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16 }} hitSlop={8}>
            <Text style={[styles.linkText, { color: colors.primary }]}>Back to sign in</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ marginTop: 28 }}>
          <TextField
            label="Email"
            placeholder="you@studio.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          {error ? <Text style={[styles.err, { color: colors.destructive }]}>{error}</Text> : null}
          <PrimaryButton title="Send reset link" onPress={onSubmit} loading={submitting} />

          <Pressable onPress={() => router.back()} style={{ marginTop: 16, alignSelf: "center" }} hitSlop={8}>
            <Text style={[styles.linkText, { color: colors.mutedForeground }]}>Back to sign in</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24 },
  back: { marginBottom: 28 },
  iconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { fontFamily: "Inter_700Bold", fontSize: 26 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 6, lineHeight: 20 },
  err: { fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 12 },
  linkText: { fontFamily: "Inter_600SemiBold", fontSize: 14, textAlign: "center" },
  successBox: { marginTop: 32, padding: 24, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  successTitle: { fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 8 },
  successText: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
});
