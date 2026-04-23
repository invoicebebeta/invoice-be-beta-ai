import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Invoice } from '@/utils/types';
import { formatMoney } from '@/utils/calculations';
import { StatusBadge } from './StatusBadge';

type Props = { invoice: Invoice; onPress: () => void };

export function InvoiceRow({ invoice, onPress }: Props) {
  const colors = useColors();
  const due = new Date(invoice.dueDate);
  const dueLabel = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.topRow}>
          <Text style={[styles.customer, { color: colors.foreground }]} numberOfLines={1}>
            {invoice.customerName}
          </Text>
          <Text style={[styles.amount, { color: colors.foreground }]}>{formatMoney(invoice.total, invoice.currency)}</Text>
        </View>
        <View style={styles.bottomRow}>
          <StatusBadge status={invoice.status} />
          <View style={styles.dueWrap}>
            <Feather name="calendar" size={12} color={colors.mutedForeground} />
            <Text style={[styles.due, { color: colors.mutedForeground }]}>Due {dueLabel}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { padding: 16, borderWidth: 1, marginBottom: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customer: { fontFamily: 'Inter_600SemiBold', fontSize: 15, flex: 1, marginRight: 12 },
  amount: { fontFamily: 'Inter_700Bold', fontSize: 16, fontVariant: ['tabular-nums'] },
  dueWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  due: { fontFamily: 'Inter_500Medium', fontSize: 12, marginLeft: 4 },
});
