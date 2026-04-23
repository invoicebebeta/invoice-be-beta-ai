import { LineItem } from './types';

export function calculateTotal(lineItems: LineItem[]): number {
  return lineItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
}

export function calculateDeposit(total: number, percent: number): number {
  return (total * percent) / 100;
}

export function calculateRemaining(total: number, depositAmount: number): number {
  return total - depositAmount;
}

export function formatMoney(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
