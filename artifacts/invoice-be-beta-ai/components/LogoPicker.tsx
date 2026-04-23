import React, { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";

import { useColors } from "@/hooks/useColors";

type Props = {
  logoUri?: string;
  businessName: string;
  onChange: (uri: string | null) => void;
};

export function LogoPicker({ logoUri, businessName, onChange }: Props) {
  const colors = useColors();
  const [working, setWorking] = useState(false);

  const pick = async () => {
    setWorking(true);
    try {
      if (Platform.OS !== "web") {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission needed", "Allow photo access to set your logo.");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const uri = asset.base64
        ? `data:image/${asset.uri.split(".").pop() || "png"};base64,${asset.base64}`
        : asset.uri;
      onChange(uri);
    } finally {
      setWorking(false);
    }
  };

  const remove = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Remove logo?")) onChange(null);
    } else {
      Alert.alert("Remove logo?", "Your invoices will fall back to your initials.", [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => onChange(null) },
      ]);
    }
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
      ]}
    >
      <View style={[styles.preview, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.image} contentFit="cover" />
        ) : (
          <Text style={[styles.placeholder, { color: colors.mutedForeground }]}>
            {(businessName || "B").charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={[styles.title, { color: colors.foreground }]}>Business logo</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Shown at the top of every invoice you send.
        </Text>
        <View style={styles.actions}>
          <Pressable
            onPress={pick}
            disabled={working}
            style={({ pressed }) => [
              styles.btn,
              {
                backgroundColor: colors.primary,
                borderRadius: colors.radius,
                opacity: working ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather name="upload" size={14} color={colors.primaryForeground} />
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
              {logoUri ? "Replace" : "Upload"}
            </Text>
          </Pressable>
          {logoUri && (
            <Pressable
              onPress={remove}
              style={({ pressed }) => [
                styles.btnGhost,
                { borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.btnText, { color: colors.destructive }]}>Remove</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", padding: 14, borderWidth: 1, marginBottom: 8 },
  preview: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: "100%" },
  placeholder: { fontFamily: "Inter_700Bold", fontSize: 28 },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2, lineHeight: 17 },
  actions: { flexDirection: "row", marginTop: 10, gap: 8 },
  btn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  btnGhost: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  btnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginLeft: 6 },
});
