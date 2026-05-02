import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const STAR_COLOR = '#F5A623';
const EMPTY_COLOR = '#D1D5DB';

type Props = {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
};

export function StarRating({ value, onChange, size = 32, readOnly }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fillFraction = Math.min(1, Math.max(0, value - (n - 1)));
        const filledWidth = Math.round(fillFraction * size);

        const StarDisplay = (
          <View style={{ width: size, height: size, marginHorizontal: 2 }}>
            <FontAwesome
              name="star-o"
              size={size}
              color={EMPTY_COLOR}
              style={{ position: 'absolute' }}
            />
            {filledWidth > 0 && (
              <View style={{ overflow: 'hidden', width: filledWidth, height: size }}>
                <FontAwesome name="star" size={size} color={STAR_COLOR} />
              </View>
            )}
          </View>
        );

        if (readOnly || !onChange) return <View key={n}>{StarDisplay}</View>;

        return (
          <Pressable
            key={n}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync();
              onChange(n);
            }}
            hitSlop={8}
          >
            {StarDisplay}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center' } });
