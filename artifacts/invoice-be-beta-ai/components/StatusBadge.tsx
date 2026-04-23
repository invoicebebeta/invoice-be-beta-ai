import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { InvoiceStatus } from '@/utils/types';

const LABEL: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  awaiting_deposit: 'Awaiting Deposit',
  deposit_paid: 'Deposit Paid',
  fully_paid: 'Fully Paid',
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const colors = useColors();

  const palette: Record<InvoiceStatus, { bg: string; fg: string }> = {
    draft: { bg: colors.muted, fg: colors.mutedForeground },
    awaiting_deposit: { bg: '#fef3c7', fg: '#92400e' },
    deposit_paid: { bg: '#dbeafe', fg: '#1e40af' },
    fully_paid: { bg: '#dcfce7', fg: '#166534' },
  };

  const { bg, fg } = palette[status];

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: 999 }]}>
      <Text style={[styles.text, { color: fg }]}>{LABEL[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  text: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 0.3 },
});
