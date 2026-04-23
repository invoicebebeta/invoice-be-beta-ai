import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { LineItem } from '@/utils/types';
import { generateDescription } from '@/utils/mockAi';

type Props = {
  item: LineItem;
  onChange: (item: LineItem) => void;
  onRemove: () => void;
  canRemove: boolean;
};

export function LineItemEditor({ item, onChange, onRemove, canRemove }: Props) {
  const colors = useColors();
  const [generating, setGenerating] = useState(false);
  const hasAdjustments = (item.taxRate ?? 0) > 0 || (item.discountPercent ?? 0) > 0;
  const [showAdjustments, setShowAdjustments] = useState(hasAdjustments);

  const handleGenerate = async () => {
    if (!item.name.trim()) return;
    setGenerating(true);
    try {
      const description = await generateDescription(item.name);
      onChange({ ...item, description });
    } finally {
      setGenerating(false);
    }
  };

  const inputStyle = {
    color: colors.foreground,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: colors.radius,
  };

  const setNumeric = (key: 'taxRate' | 'discountPercent', t: string) => {
    const n = parseFloat(t.replace(/[^0-9.]/g, '')) || 0;
    onChange({ ...item, [key]: Math.max(0, Math.min(100, n)) });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.tag, { color: colors.mutedForeground }]}>Line item</Text>
        {canRemove && (
          <Pressable onPress={onRemove} hitSlop={10}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <TextInput
        placeholder="Service or product name"
        placeholderTextColor={colors.mutedForeground}
        value={item.name}
        onChangeText={(t) => onChange({ ...item, name: t })}
        style={[styles.input, inputStyle]}
      />

      <View style={styles.descRow}>
        <TextInput
          placeholder="Description"
          placeholderTextColor={colors.mutedForeground}
          value={item.description}
          onChangeText={(t) => onChange({ ...item, description: t })}
          multiline
          style={[styles.input, styles.desc, inputStyle]}
        />
        <Pressable
          onPress={handleGenerate}
          disabled={!item.name.trim() || generating}
          style={({ pressed }) => [
            styles.aiBtn,
            {
              backgroundColor: colors.accent,
              borderRadius: colors.radius,
              opacity: !item.name.trim() ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {generating ? (
            <ActivityIndicator color={colors.accentForeground} size="small" />
          ) : (
            <>
              <Feather name="zap" size={14} color={colors.accentForeground} />
              <Text style={[styles.aiText, { color: colors.accentForeground }]}>AI</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Price</Text>
          <TextInput
            placeholder="0.00"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
            value={item.price ? String(item.price) : ''}
            onChangeText={(t) => onChange({ ...item, price: parseFloat(t.replace(/[^0-9.]/g, '')) || 0 })}
            style={[styles.input, inputStyle]}
          />
        </View>
        <View style={{ width: 90 }}>
          <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Qty</Text>
          <TextInput
            placeholder="1"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            value={item.quantity ? String(item.quantity) : ''}
            onChangeText={(t) => onChange({ ...item, quantity: parseInt(t.replace(/[^0-9]/g, ''), 10) || 0 })}
            style={[styles.input, inputStyle]}
          />
        </View>
      </View>

      <Pressable
        onPress={() => setShowAdjustments((v) => !v)}
        style={({ pressed }) => [styles.toggle, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Feather name={showAdjustments ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
        <Text style={[styles.toggleText, { color: colors.primary }]}>
          {showAdjustments ? 'Hide tax & discount' : 'Add tax or discount'}
        </Text>
        {!showAdjustments && hasAdjustments && (
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        )}
      </Pressable>

      {showAdjustments && (
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Discount %</Text>
            <TextInput
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              value={item.discountPercent ? String(item.discountPercent) : ''}
              onChangeText={(t) => setNumeric('discountPercent', t)}
              style={[styles.input, inputStyle]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Tax %</Text>
            <TextInput
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              value={item.taxRate ? String(item.taxRate) : ''}
              onChangeText={(t) => setNumeric('taxRate', t)}
              style={[styles.input, inputStyle]}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderWidth: 1, marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tag: { fontFamily: 'Inter_600SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, fontFamily: 'Inter_500Medium', fontSize: 14, marginBottom: 8 },
  desc: { flex: 1, minHeight: 56, textAlignVertical: 'top' },
  descRow: { flexDirection: 'row', alignItems: 'flex-start' },
  aiBtn: { marginLeft: 8, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', minWidth: 56, marginBottom: 8 },
  aiText: { fontFamily: 'Inter_700Bold', fontSize: 12, marginLeft: 4 },
  row: { flexDirection: 'row' },
  miniLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  toggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, marginBottom: 4 },
  toggleText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginLeft: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, marginLeft: 6 },
});
