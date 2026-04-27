import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  style?: ViewStyle;
  variant?: 'default' | 'destructive';
};

export function SecondaryButton({ title, onPress, disabled, icon, style, variant = 'default' }: Props) {
  const colors = useColors();
  const isDestructive = variant === 'destructive';
  const fg = isDestructive ? colors.destructive : colors.foreground;
  const border = isDestructive ? colors.destructive : colors.border;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        {
          borderColor: border,
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {icon && <Feather name={icon} size={16} color={fg} style={{ marginRight: 6 }} />}
        <Text style={[styles.text, { color: fg }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: 'Inter_500Medium', fontSize: 14, textAlign: 'center' },
});
