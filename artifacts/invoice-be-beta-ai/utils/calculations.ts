import { LineItem } from './types';

export function lineSubtotal(item: LineItem): number {
  return Number(item.price) * Number(item.quantity);
}

export function lineDiscountAmount(item: LineItem): number {
  return lineSubtotal(item) * ((item.discountPercent ?? 0) / 100);
}

export function lineTaxAmount(item: LineItem): number {
  return (lineSubtotal(item) - lineDiscountAmount(item)) * ((item.taxRate ?? 0) / 100);
}

export function lineTotal(item: LineItem): number {
  return lineSubtotal(item) - lineDiscountAmount(item) + lineTaxAmount(item);
}

export function calculateSubtotal(lineItems: LineItem[]): number {
  return lineItems.reduce((sum, item) => sum + lineSubtotal(item), 0);
}

export function calculateDiscountTotal(lineItems: LineItem[]): number {
  return lineItems.reduce((sum, item) => sum + lineDiscountAmount(item), 0);
}

export function calculateTaxTotal(lineItems: LineItem[]): number {
  return lineItems.reduce((sum, item) => sum + lineTaxAmount(item), 0);
}

export function calculateTotal(lineItems: LineItem[]): number {
  return lineItems.reduce((sum, item) => sum + lineTotal(item), 0);
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
