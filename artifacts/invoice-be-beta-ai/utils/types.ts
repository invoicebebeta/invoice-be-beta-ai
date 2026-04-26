export type BankDetails = {
  accountHolderName: string;
  sortCode: string;
  accountNumber: string;
  bankName?: string;
  reference?: string;
};

export type User = {
  id: string;
  email: string;
  password: string;
  businessName: string;
  currency?: string;
  logoUri?: string;
  bankDetails?: BankDetails;
  stripeConnectedAccountId?: string;
};

export type LineItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  taxRate?: number;
  discountPercent?: number;
};

export type InvoiceStatus = 'draft' | 'awaiting_deposit' | 'deposit_paid' | 'fully_paid';

export type Invoice = {
  id: string;
  userId: string;
  invoiceNumber?: string;
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
  notes?: string;
  createdAt: string;
};

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly';

export type RecurringTemplate = {
  id: string;
  name: string;
  customerName: string;
  customerEmail: string;
  lineItems: LineItem[];
  requireDeposit: boolean;
  depositPercent: number;
  currency: string;
  notes?: string;
  frequency: RecurringFrequency;
  nextDueDate: string;
  isActive: boolean;
  createdAt: string;
  lastGeneratedAt?: string;
};

export type Review = {
  id: string;
  invoiceId: string;
  userId: string;
  rating: number;
  text: string;
  createdAt: string;
};
