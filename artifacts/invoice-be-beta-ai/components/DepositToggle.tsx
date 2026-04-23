import React from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { formatMoney } from '@/utils/calculations';

type Props = {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  percent: number;
  onPercentChange: (n: number) => void;
  total: number;
  depositAmount: number;
  remaining: number;
};

const PRESETS = [10, 20, 50];

export function DepositToggle({ enabled, onToggle, percent, onPercentChange, total, depositAmount, remaining }: Props) {
  const colors = useColors();
  const isPreset = PRESETS.includes(percent);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Require a deposit</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>Collect upfront before starting the work</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ true: colors.primary, false: colors.muted }}
          thumbColor={'#ffffff'}
        />
      </View>

      {enabled && (
        <View style={{ marginTop: 14 }}>
          <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Deposit percent</Text>
          <View style={styles.chipsRow}>
            {PRESETS.map((p) => {
              const active = percent === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => onPercentChange(p)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      borderRadius: colors.radius,
                      backgroundColor: active ? colors.primary : colors.background,
                      borderColor: active ? colors.primary : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? colors.primaryForeground : colors.foreground }]}>
                    {p}%
                  </Text>
                </Pressable>
              );
            })}
            <View style={[styles.customWrap, { borderRadius: colors.radius, borderColor: !isPreset ? colors.primary : colors.border, backgroundColor: colors.background }]}>
              <TextInput
                placeholder="Custom"
                placeholderTextColor={colors.mutedForeground}
                value={isPreset ? '' : percent ? String(percent) : ''}
                onChangeText={(t) => {
                  const n = parseFloat(t.replace(/[^0-9.]/g, '')) || 0;
                  onPercentChange(Math.max(0, Math.min(100, n)));
                }}
                keyboardType="decimal-pad"
                style={[styles.customInput, { color: colors.foreground }]}
              />
              <Text style={[styles.customPct, { color: colors.mutedForeground }]}>%</Text>
            </View>
          </View>

          <View style={[styles.summary, { borderTopColor: colors.border }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Deposit</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>{formatMoney(depositAmount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Remaining</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>{formatMoney(remaining)}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  miniLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 8 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, marginRight: 8, marginBottom: 8 },
  chipText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  customWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 10, marginBottom: 8 },
  customInput: { fontFamily: 'Inter_500Medium', fontSize: 13, minWidth: 50, paddingVertical: 8 },
  customPct: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  summary: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  summaryValue: { fontFamily: 'Inter_600SemiBold', fontSize: 14, fontVariant: ['tabular-nums'] },
});
