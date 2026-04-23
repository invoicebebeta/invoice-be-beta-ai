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
};

export function SecondaryButton({ title, onPress, disabled, icon, style }: Props) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        {
          borderColor: colors.border,
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {icon && <Feather name={icon} size={16} color={colors.foreground} style={{ marginRight: 6 }} />}
        <Text style={[styles.text, { color: colors.foreground }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: 'Inter_500Medium', fontSize: 14 },
});
