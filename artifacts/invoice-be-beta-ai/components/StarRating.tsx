import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

type Props = {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
};

export function StarRating({ value, onChange, size = 32, readOnly }: Props) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        const Inner = (
          <Feather
            name={filled ? 'star' : 'star'}
            size={size}
            color={filled ? colors.accent : colors.muted}
            style={{ marginHorizontal: 4 }}
          />
        );
        if (readOnly || !onChange) return <View key={n}>{Inner}</View>;
        return (
          <Pressable
            key={n}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync();
              onChange(n);
            }}
            hitSlop={8}
          >
            {Inner}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center' } });
