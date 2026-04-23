import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  variant?: 'primary' | 'success' | 'warning' | 'destructive';
  style?: ViewStyle;
  testID?: string;
};

export function PrimaryButton({ title, onPress, loading, disabled, icon, variant = 'primary', style, testID }: Props) {
  const colors = useColors();
  const bg = colors[variant] ?? colors.primary;
  const fg =
    variant === 'success' ? colors.successForeground :
    variant === 'warning' ? colors.warningForeground :
    variant === 'destructive' ? colors.destructiveForeground :
    colors.primaryForeground;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderRadius: colors.radius, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {icon && <Feather name={icon} size={18} color={fg} style={{ marginRight: 8 }} />}
            <Text style={[styles.text, { color: fg }]}>{title}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
});
