import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { formatMoney } from '@/utils/calculations';

type Props = {
  total: number;
  monthRevenue: number;
  outstanding: number;
  overdueCount: number;
  currency?: string;
};

export function RevenueCard({ total, monthRevenue, outstanding, overdueCount, currency }: Props) {
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      <View style={[styles.mainCard, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
        <View style={styles.row}>
          <View style={styles.iconCircle}>
            <Feather name="trending-up" size={15} color={colors.primary} />
          </View>
          <Text style={[styles.label, { color: colors.primaryForeground }]}>Total revenue</Text>
        </View>
        <Text style={[styles.amount, { color: colors.primaryForeground }]}>{formatMoney(total, currency)}</Text>
        <Text style={[styles.sub, { color: colors.primaryForeground }]}>All time · paid invoices</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.statIcon}>
            <Feather name="calendar" size={13} color={colors.mutedForeground} />
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>This month</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]} numberOfLines={1}>
            {formatMoney(monthRevenue, currency)}
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.statIcon}>
            <Feather name="clock" size={13} color={colors.mutedForeground} />
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Outstanding</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]} numberOfLines={1}>
            {formatMoney(outstanding, currency)}
          </Text>
        </View>

        <View
          style={[
            styles.statCard,
            {
              backgroundColor: overdueCount > 0 ? '#fef3c7' : colors.card,
              borderColor: overdueCount > 0 ? '#fcd34d' : colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <View style={styles.statIcon}>
            <Feather name="alert-circle" size={13} color={overdueCount > 0 ? '#92400e' : colors.mutedForeground} />
            <Text style={[styles.statLabel, { color: overdueCount > 0 ? '#92400e' : colors.mutedForeground }]}>Overdue</Text>
          </View>
          <Text style={[styles.statValue, { color: overdueCount > 0 ? '#92400e' : colors.foreground }]}>
            {overdueCount}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  mainCard: { padding: 20, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconCircle: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  label: { fontFamily: 'Inter_500Medium', fontSize: 13, opacity: 0.9 },
  amount: { fontFamily: 'Inter_700Bold', fontSize: 32, fontVariant: ['tabular-nums'] },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4, opacity: 0.85 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, padding: 12, borderWidth: 1 },
  statIcon: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 15, fontVariant: ['tabular-nums'] },
});
