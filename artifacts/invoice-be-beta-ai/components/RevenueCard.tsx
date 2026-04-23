import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { formatMoney } from '@/utils/calculations';

type Props = { total: number; count: number };

export function RevenueCard({ total, count }: Props) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
      <View style={styles.row}>
        <View style={styles.iconCircle}>
          <Feather name="trending-up" size={16} color={colors.primary} />
        </View>
        <Text style={[styles.label, { color: colors.primaryForeground }]}>Total revenue</Text>
      </View>
      <Text style={[styles.amount, { color: colors.primaryForeground }]}>{formatMoney(total)}</Text>
      <Text style={[styles.sub, { color: colors.primaryForeground }]} numberOfLines={1}>
        Across {count} {count === 1 ? 'invoice' : 'invoices'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconCircle: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  label: { fontFamily: 'Inter_500Medium', fontSize: 13, opacity: 0.9 },
  amount: { fontFamily: 'Inter_700Bold', fontSize: 32, fontVariant: ['tabular-nums'] },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4, opacity: 0.85 },
});
