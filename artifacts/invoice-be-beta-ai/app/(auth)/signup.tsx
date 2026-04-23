import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { TextField } from "@/components/TextField";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function SignupScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }
    setSubmitting(true);
    const r = await signUp(email.trim(), password, businessName.trim());
    setSubmitting(false);
    if (!r.ok) setError(r.error ?? "Sign up failed");
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: topInset + 24, paddingBottom: bottomInset + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.logo, { backgroundColor: colors.primary }]}>
        <Feather name="feather" size={22} color={colors.primaryForeground} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>Create your studio</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>Start sending polished invoices in minutes</Text>

      <View style={{ marginTop: 28 }}>
        <TextField label="Business name" placeholder="Maple Studio" value={businessName} onChangeText={setBusinessName} />
        <TextField label="Email" placeholder="you@studio.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextField label="Password" placeholder="At least 4 characters" value={password} onChangeText={setPassword} secureTextEntry />
        {error ? <Text style={[styles.err, { color: colors.destructive }]}>{error}</Text> : null}
        <PrimaryButton title="Create account" onPress={onSubmit} loading={submitting} />
      </View>

      <Pressable onPress={() => router.replace("/(auth)/login")} style={{ marginTop: 20, alignSelf: "center" }} hitSlop={8}>
        <Text style={[styles.link, { color: colors.mutedForeground }]}>
          Already have an account? <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Sign in</Text>
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24 },
  logo: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 4 },
  link: { fontFamily: "Inter_500Medium", fontSize: 14 },
  err: { fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 12 },
});
