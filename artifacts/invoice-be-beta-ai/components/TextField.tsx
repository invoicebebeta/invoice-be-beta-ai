import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

type Props = TextInputProps & {
  label?: string;
  error?: string;
};

export function TextField({ label, error, style, ...rest }: Props) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          {
            color: colors.foreground,
            backgroundColor: colors.card,
            borderColor: error ? colors.destructive : colors.border,
            borderRadius: colors.radius,
          },
          style,
        ]}
        {...rest}
      />
      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: 'Inter_500Medium', fontSize: 12, letterSpacing: 0.3, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, fontFamily: 'Inter_500Medium', fontSize: 15,
  },
  error: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 4 },
});
