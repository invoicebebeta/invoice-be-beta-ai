import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

type Props = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description?: string;
};

export function EmptyState({ icon, title, description }: Props) {
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={26} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {description ? (
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>{description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 16, textAlign: 'center' },
  desc: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
});
