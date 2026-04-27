import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useInvoices } from "@/contexts/InvoicesContext";
import { useReviews } from "@/contexts/ReviewsContext";
import { StarRating } from "@/components/StarRating";
import { TextField } from "@/components/TextField";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function ReviewScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getInvoice } = useInvoices();
  const { addReview } = useReviews();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const invoice = getInvoice(String(id));

  const onSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    const result = await addReview({
      invoiceId: String(id),
      customerName: invoice?.customerName,
      invoiceRef: invoice?.invoiceNumber,
      rating,
      text: text.trim(),
    });
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(false);
    router.back();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: colors.foreground }]}>How was the work?</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        {invoice?.customerName ? `Add a review from ${invoice.customerName}.` : "Add a review from your customer."}
      </Text>

      <View style={styles.starsWrap}>
        <StarRating value={rating} onChange={setRating} size={40} />
      </View>

      <TextField
        label="Review"
        placeholder="Share what made the experience great..."
        value={text}
        onChangeText={setText}
        multiline
        numberOfLines={5}
        style={{ minHeight: 120, textAlignVertical: "top", paddingTop: 12 }}
      />

      <PrimaryButton title="Save review" onPress={onSubmit} loading={submitting} icon="check" disabled={!text.trim()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: "Inter_700Bold", fontSize: 24 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 6, lineHeight: 20 },
  starsWrap: { alignItems: "center", marginVertical: 32 },
});
