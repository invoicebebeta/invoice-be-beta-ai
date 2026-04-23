import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

type Props = { title: string; subtitle?: string; right?: React.ReactNode };

export function ScreenHeader({ title, subtitle, right }: Props) {
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 26 },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
});
