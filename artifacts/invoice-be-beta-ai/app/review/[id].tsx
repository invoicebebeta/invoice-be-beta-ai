import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useInvoices } from "@/contexts/InvoicesContext";
import { useReviews } from "@/contexts/ReviewsContext";
import { useAuth } from "@/contexts/AuthContext";
import { StarRating } from "@/components/StarRating";
import { TextField } from "@/components/TextField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Review } from "@/utils/types";

export default function ReviewScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getInvoice } = useInvoices();
  const { addReview } = useReviews();
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const invoice = getInvoice(String(id));

  const onSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    const review: Review = {
      id: "rv_" + Date.now().toString() + Math.random().toString(36).slice(2, 8),
      invoiceId: String(id),
      userId: user?.id ?? invoice?.userId ?? "anonymous",
      rating,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    await addReview(review);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(false);
    router.back();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: colors.foreground }]}>How was the work?</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        Your review helps {invoice?.customerName ? `${invoice.customerName} and others` : "future customers"} learn about your business.
      </Text>

      <View style={styles.starsWrap}>
        <StarRating value={rating} onChange={setRating} size={40} />
      </View>

      <TextField
        label="Your review"
        placeholder="Share what made the experience great..."
        value={text}
        onChangeText={setText}
        multiline
        numberOfLines={5}
        style={{ minHeight: 120, textAlignVertical: "top", paddingTop: 12 }}
      />

      <PrimaryButton title="Submit review" onPress={onSubmit} loading={submitting} icon="check" disabled={!text.trim()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: "Inter_700Bold", fontSize: 24 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 6, lineHeight: 20 },
  starsWrap: { alignItems: "center", marginVertical: 32 },
});
