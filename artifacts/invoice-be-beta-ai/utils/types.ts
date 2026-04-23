export type User = {
  id: string;
  email: string;
  password: string;
  businessName: string;
  currency?: string;
  logoUri?: string;
};

export type LineItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
};

export type InvoiceStatus = 'draft' | 'awaiting_deposit' | 'deposit_paid' | 'fully_paid';

export type Invoice = {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  lineItems: LineItem[];
  dueDate: string;
  requireDeposit: boolean;
  depositPercent: number;
  total: number;
  depositAmount: number;
  remainingBalance: number;
  status: InvoiceStatus;
  currency?: string;
  depositLink?: string;
  finalLink?: string;
  createdAt: string;
};

export type Review = {
  id: string;
  invoiceId: string;
  userId: string;
  rating: number;
  text: string;
  createdAt: string;
};
