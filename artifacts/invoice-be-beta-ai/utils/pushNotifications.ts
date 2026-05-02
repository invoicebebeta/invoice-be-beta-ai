import { Platform } from 'react-native';
import Constants from 'expo-constants';

function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:8080`;
  }
  const devDomain = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  if (devDomain) return devDomain;
  return 'http://localhost:8080';
}

export async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = await import('expo-notifications');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    const base = getApiBaseUrl();
    await fetch(`${base}/api/push/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, token }),
    });
  } catch {
  }
}
