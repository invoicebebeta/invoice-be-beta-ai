import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { formatMoney } from '@/utils/calculations';

type MonthBar = {
  label: string;
  revenue: number;
};

type Props = {
  total: number;
  monthRevenue: number;
  outstanding: number;
  overdueCount: number;
  currency?: string;
  avgInvoiceValue?: number;
  paidThisMonth?: number;
  monthlyBars?: MonthBar[];
};

export function RevenueCard({
  total,
  monthRevenue,
  outstanding,
  overdueCount,
  currency,
  avgInvoiceValue = 0,
  paidThisMonth = 0,
  monthlyBars = [],
}: Props) {
  const colors = useColors();
  const maxBar = Math.max(...monthlyBars.map((b) => b.revenue), 1);
  const hasBarData = monthlyBars.some((b) => b.revenue > 0);

  return (
    <View style={styles.wrap}>
      <View style={[styles.mainCard, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
        <View style={styles.mainTop}>
          <View style={styles.mainLeft}>
            <View style={styles.row}>
              <View style={styles.iconCircle}>
                <Feather name="trending-up" size={15} color={colors.primary} />
              </View>
              <Text style={[styles.label, { color: colors.primaryForeground }]}>Total revenue</Text>
            </View>
            <Text style={[styles.amount, { color: colors.primaryForeground }]}>
              {formatMoney(total, currency)}
            </Text>
            <Text style={[styles.sub, { color: colors.primaryForeground }]}>All time · paid invoices</Text>
          </View>

          {hasBarData && (
            <View style={styles.sparkline}>
              {monthlyBars.map((bar, i) => {
                const heightPct = bar.revenue / maxBar;
                const isLast = i === monthlyBars.length - 1;
                return (
                  <View key={bar.label} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${Math.max(heightPct * 100, 5)}%` as any,
                            backgroundColor: isLast
                              ? 'rgba(255,255,255,0.95)'
                              : 'rgba(255,255,255,0.35)',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{bar.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          <View style={styles.statIcon}>
            <Feather name="calendar" size={13} color={colors.mutedForeground} />
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>This month</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]} numberOfLines={1}>
            {formatMoney(monthRevenue, currency)}
          </Text>
          {paidThisMonth > 0 && (
            <Text style={[styles.statSub, { color: colors.mutedForeground }]}>
              {paidThisMonth} paid
            </Text>
          )}
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          <View style={styles.statIcon}>
            <Feather name="clock" size={13} color={colors.mutedForeground} />
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Outstanding</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]} numberOfLines={1}>
            {formatMoney(outstanding, currency)}
          </Text>
          {avgInvoiceValue > 0 && (
            <Text style={[styles.statSub, { color: colors.mutedForeground }]}>
              avg {formatMoney(avgInvoiceValue, currency)}
            </Text>
          )}
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
            <Feather
              name="alert-circle"
              size={13}
              color={overdueCount > 0 ? '#92400e' : colors.mutedForeground}
            />
            <Text
              style={[
                styles.statLabel,
                { color: overdueCount > 0 ? '#92400e' : colors.mutedForeground },
              ]}
            >
              Overdue
            </Text>
          </View>
          <Text
            style={[styles.statValue, { color: overdueCount > 0 ? '#92400e' : colors.foreground }]}
          >
            {overdueCount}
          </Text>
          {overdueCount > 0 && (
            <Text style={[styles.statSub, { color: '#b45309' }]}>
              {overdueCount === 1 ? 'invoice' : 'invoices'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  mainCard: { padding: 20, marginBottom: 10, overflow: 'hidden' },
  mainTop: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  mainLeft: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  label: { fontFamily: 'Inter_500Medium', fontSize: 13, opacity: 0.9 },
  amount: { fontFamily: 'Inter_700Bold', fontSize: 30, fontVariant: ['tabular-nums'] },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4, opacity: 0.85 },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 60,
    paddingBottom: 14,
    width: 96,
  },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 2, minHeight: 3 },
  barLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 8,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 3,
  },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, padding: 12, borderWidth: 1 },
  statIcon: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 15, fontVariant: ['tabular-nums'] },
  statSub: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 2 },
});
