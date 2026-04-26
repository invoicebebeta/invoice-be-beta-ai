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

export async function getStripeConnectUrl(userId: string): Promise<{ url: string } | { error: string }> {
  try {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/api/stripe/connect/url?userId=${encodeURIComponent(userId)}`);
    return await res.json();
  } catch {
    return { error: 'Could not reach the server. Please try again.' };
  }
}

export async function getStripeConnectStatus(userId: string): Promise<{ connected: boolean; accountId: string | null }> {
  try {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/api/stripe/connect/status?userId=${encodeURIComponent(userId)}`);
    return await res.json();
  } catch {
    return { connected: false, accountId: null };
  }
}

export async function disconnectStripe(userId: string): Promise<void> {
  const base = getApiBaseUrl();
  await fetch(`${base}/api/stripe/connect?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

export async function createStripeCheckout(params: {
  userId: string;
  amount: number;
  currency: string;
  description: string;
  invoiceRef?: string;
}): Promise<{ url: string; sessionId: string } | { error: string }> {
  try {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/api/stripe/invoice/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch {
    return { error: 'Could not create payment link. Please check your connection.' };
  }
}
