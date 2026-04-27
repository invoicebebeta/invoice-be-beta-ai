import { storage } from './storage';
import { Invoice } from './types';

const seedInvoices: Invoice[] = [
  {
    id: 'inv_1',
    userId: 'mock_user_1',
    customerName: 'Acme Corp',
    customerEmail: 'billing@acme.com',
    lineItems: [
      { id: 'li_1', name: 'Website Redesign', description: 'Complete overhaul of the corporate website.', price: 5000, quantity: 1 }
    ],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    requireDeposit: true,
    depositPercent: 50,
    total: 5000,
    depositAmount: 2500,
    remainingBalance: 2500,
    status: 'awaiting_deposit',
    createdAt: new Date().toISOString()
  },
  {
    id: 'inv_2',
    userId: 'mock_user_1',
    customerName: 'Globex Inc',
    customerEmail: 'accounts@globex.com',
    lineItems: [
      { id: 'li_2', name: 'Brand Identity', description: 'Logo, color palette, and brand guidelines.', price: 3000, quantity: 1 }
    ],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    requireDeposit: true,
    depositPercent: 30,
    total: 3000,
    depositAmount: 900,
    remainingBalance: 2100,
    status: 'deposit_paid',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'inv_3',
    userId: 'mock_user_1',
    customerName: 'Stark Industries',
    customerEmail: 'finance@stark.com',
    lineItems: [
      { id: 'li_3', name: 'Security Audit', description: 'Comprehensive review of internal systems.', price: 8000, quantity: 1 }
    ],
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    requireDeposit: false,
    depositPercent: 0,
    total: 8000,
    depositAmount: 0,
    remainingBalance: 8000,
    status: 'draft',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'inv_4',
    userId: 'mock_user_1',
    customerName: 'Wayne Enterprises',
    customerEmail: 'pepper@wayne.com',
    lineItems: [
      { id: 'li_4', name: 'R&D Consulting', description: 'Monthly retainer for research consulting.', price: 10000, quantity: 1 }
    ],
    dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    requireDeposit: false,
    depositPercent: 0,
    total: 10000,
    depositAmount: 0,
    remainingBalance: 0,
    status: 'fully_paid',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export async function seedIfEmpty() {
  const existing = await storage.get<Invoice[]>('invoices');
  if (!existing || existing.length === 0) {
    await storage.set('invoices', seedInvoices);
  }
}
