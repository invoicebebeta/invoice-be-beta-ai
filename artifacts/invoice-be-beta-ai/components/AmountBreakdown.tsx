import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { formatMoney } from '@/utils/calculations';

type Row = { label: string; value: number; emphasis?: boolean };

export function AmountBreakdown({ rows }: { rows: Row[] }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      {rows.map((r, i) => (
        <View
          key={r.label}
          style={[
            styles.row,
            i < rows.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
          ]}
        >
          <Text style={[styles.label, { color: r.emphasis ? colors.foreground : colors.mutedForeground }, r.emphasis && styles.bold]}>
            {r.label}
          </Text>
          <Text style={[styles.value, { color: colors.foreground }, r.emphasis && styles.bold]}>{formatMoney(r.value)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, paddingHorizontal: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  value: { fontFamily: 'Inter_600SemiBold', fontSize: 15, fontVariant: ['tabular-nums'] },
  bold: { fontFamily: 'Inter_700Bold' },
});
