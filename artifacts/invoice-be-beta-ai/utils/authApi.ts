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

export type AuthUser = { id: string; email: string; businessName: string; vatNumber?: string; businessAddress?: string };

async function post(path: string, body: Record<string, string>): Promise<{ ok?: boolean; user?: AuthUser; error?: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch {
    return { error: 'Could not connect to server. Please check your connection.' };
  }
}

export async function apiSignUp(email: string, password: string, businessName: string) {
  return post('/auth/signup', { email, password, businessName });
}

export async function apiSignIn(email: string, password: string) {
  return post('/auth/signin', { email, password });
}

export async function apiForgotPassword(email: string) {
  return post('/auth/forgot-password', { email });
}

export async function apiUpdateLogo(userId: string, logoData: string | null): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl()}/api/auth/logo`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, logoData }),
    });
  } catch {
    // non-blocking — local storage is the source of truth for the app
  }
}

export async function apiUpdateProfile(userId: string, vatNumber: string | null, businessAddress: string | null): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl()}/api/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, vatNumber, businessAddress }),
    });
  } catch {
    // non-blocking — local storage is the source of truth for the app
  }
}
