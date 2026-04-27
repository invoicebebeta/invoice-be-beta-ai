import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Invoice, User } from './types';

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

export async function sendInvoiceEmail(
  invoice: Invoice,
  user: User,
  paymentLink?: string,
): Promise<{ ok: boolean } | { error: string }> {
  try {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/api/email/send-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail: invoice.customerEmail,
        toName: invoice.customerName,
        fromBusinessName: user.businessName,
        fromEmail: user.email,
        fromUserId: user.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceId: invoice.id,
        lineItems: invoice.lineItems.map((li) => ({
          name: li.name,
          quantity: li.quantity,
          price: li.price,
        })),
        total: invoice.total,
        depositAmount: invoice.depositAmount,
        remainingBalance: invoice.remainingBalance,
        currency: invoice.currency ?? user.currency ?? 'USD',
        dueDate: invoice.dueDate,
        paymentLink,
        notes: invoice.notes,
        status: invoice.status,
      }),
    });
    return await res.json();
  } catch {
    return { error: 'Could not send email. Please check your connection.' };
  }
}

export async function sendPaymentConfirmationEmail(
  invoice: Invoice,
  user: User,
  amountPaid: number,
  paymentType: 'deposit' | 'full',
): Promise<{ ok: boolean } | { error: string }> {
  try {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/api/email/send-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail: invoice.customerEmail,
        toName: invoice.customerName,
        fromBusinessName: user.businessName,
        fromEmail: user.email,
        invoiceNumber: invoice.invoiceNumber,
        invoiceId: invoice.id,
        amountPaid,
        currency: invoice.currency ?? user.currency ?? 'USD',
        paymentType,
      }),
    });
    return await res.json();
  } catch {
    return { error: 'Could not send confirmation. Please check your connection.' };
  }
}
