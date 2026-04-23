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

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
