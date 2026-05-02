import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, View } from "react-native";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { InvoicesProvider } from "@/contexts/InvoicesContext";
import { ReviewsProvider } from "@/contexts/ReviewsContext";
import { RecurringProvider } from "@/contexts/RecurringContext";
import { CustomersProvider } from "@/contexts/CustomersContext";
import { useColors } from "@/hooks/useColors";
import { storage } from "@/utils/storage";
import { initializeRevenueCat, SubscriptionProvider } from "@/lib/revenuecat";

SplashScreen.preventAutoHideAsync();

try {
  initializeRevenueCat();
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : "Unknown error";
  console.error("[RevenueCat] Initialization failed:", message);
}

const queryClient = new QueryClient();

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colors = useColors();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "(onboarding)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      (async () => {
        const seen = await storage.get<boolean>(`onboarding_seen_${user.id}`);
        if (!seen) {
          router.replace("/(onboarding)");
        } else {
          router.replace("/(tabs)");
        }
      })();
    } else if (user && inOnboarding) {
    } else if (!user && inOnboarding) {
      router.replace("/(auth)/login");
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerBackTitle: "Back", headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground, headerTitleStyle: { fontFamily: "Inter_600SemiBold" } }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="paywall" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="invoice/[id]" options={{ title: "Invoice" }} />
      <Stack.Screen name="customer/[email]" options={{ title: "Customer" }} />
      <Stack.Screen name="customers/index" options={{ title: "Customers" }} />
      <Stack.Screen name="recurring/[id]" options={{ title: "Recurring template" }} />
      <Stack.Screen name="review/[id]" options={{ title: "Leave a review", presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <SubscriptionProvider>
                <AuthProvider>
                  <InvoicesProvider>
                    <RecurringProvider>
                      <ReviewsProvider>
                        <CustomersProvider>
                          <AuthGate />
                        </CustomersProvider>
                      </ReviewsProvider>
                    </RecurringProvider>
                  </InvoicesProvider>
                </AuthProvider>
              </SubscriptionProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
