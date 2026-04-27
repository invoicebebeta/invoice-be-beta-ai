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

export function getReviewPageUrl(userId: string, customerName?: string, invoiceRef?: string): string {
  const base = getApiBaseUrl();
  const params = new URLSearchParams();
  if (customerName) params.set('customer', customerName);
  if (invoiceRef) params.set('ref', invoiceRef);
  const query = params.toString();
  return `${base}/api/review/${userId}${query ? `?${query}` : ''}`;
}

export type RemoteReview = {
  id: string;
  user_id: string;
  customer_name: string | null;
  invoice_ref: string | null;
  rating: number;
  text: string;
  created_at: string;
};

export async function fetchReviews(userId: string): Promise<RemoteReview[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/review/${userId}/list`);
    const data = await res.json();
    return data.reviews ?? [];
  } catch {
    return [];
  }
}

export async function submitReview(
  userId: string,
  customerName: string | null,
  invoiceRef: string | null,
  rating: number,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/review/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName, invoiceRef, rating, text }),
    });
    return await res.json();
  } catch {
    return { ok: false, error: 'Could not submit review. Please check your connection.' };
  }
}

export async function sendReviewRequestEmail(
  toEmail: string,
  toName: string,
  businessName: string,
  reviewUrl: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/email/send-review-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toEmail, toName, businessName, reviewUrl }),
    });
    return await res.json();
  } catch {
    return { ok: false, error: 'Could not send email. Please check your connection.' };
  }
}
