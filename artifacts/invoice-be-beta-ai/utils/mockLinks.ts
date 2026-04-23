export function generateShareLink(invoiceId: string, type: 'deposit' | 'final'): string {
  return `https://invoicebeta.app/pay/${invoiceId}/${type}`;
}
