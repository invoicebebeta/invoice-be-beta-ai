import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../utils/storage';
import { Invoice, LineItem } from '../utils/types';
import { seedIfEmpty } from '../utils/seed';
import { generateShareLink } from '../utils/mockLinks';

type InvoicesContextType = {
  invoices: Invoice[];
  loading: boolean;
  addInvoice: (invoice: Invoice) => Promise<void>;
  updateInvoice: (id: string, patch: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  duplicateInvoice: (id: string) => Promise<Invoice | null>;
  getInvoice: (id: string) => Invoice | undefined;
  totalRevenue: number;
};

const InvoicesContext = createContext<InvoicesContextType | null>(null);
const KEY = 'invoices';

const newId = (p: string) => p + '_' + Date.now().toString() + Math.random().toString(36).slice(2, 8);

export function InvoicesProvider({ children }: { children: React.ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await seedIfEmpty();
      const list = (await storage.get<Invoice[]>(KEY)) ?? [];
      setInvoices(list);
      setLoading(false);
    })();
  }, []);

  const persist = async (list: Invoice[]) => {
    setInvoices(list);
    await storage.set(KEY, list);
  };

  const addInvoice = async (invoice: Invoice) => {
    await persist([invoice, ...invoices]);
  };

  const updateInvoice = async (id: string, patch: Partial<Invoice>) => {
    const next = invoices.map((inv) => (inv.id === id ? { ...inv, ...patch } : inv));
    await persist(next);
  };

  const deleteInvoice = async (id: string) => {
    await persist(invoices.filter((inv) => inv.id !== id));
  };

  const duplicateInvoice = async (id: string) => {
    const source = invoices.find((i) => i.id === id);
    if (!source) return null;
    const clonedItems: LineItem[] = source.lineItems.map((li) => ({ ...li, id: newId('li') }));
    const newInvoiceId = newId('inv');
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const copy: Invoice = {
      ...source,
      id: newInvoiceId,
      lineItems: clonedItems,
      dueDate,
      status: 'draft',
      depositLink: source.requireDeposit ? generateShareLink(newInvoiceId, 'deposit') : undefined,
      finalLink: generateShareLink(newInvoiceId, 'final'),
      createdAt: new Date().toISOString(),
    };
    await persist([copy, ...invoices]);
    return copy;
  };

  const getInvoice = (id: string) => invoices.find((i) => i.id === id);

  const totalRevenue = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      if (inv.status === 'fully_paid') return sum + inv.total;
      if (inv.status === 'deposit_paid') return sum + inv.depositAmount;
      return sum;
    }, 0);
  }, [invoices]);

  return (
    <InvoicesContext.Provider
      value={{ invoices, loading, addInvoice, updateInvoice, deleteInvoice, duplicateInvoice, getInvoice, totalRevenue }}
    >
      {children}
    </InvoicesContext.Provider>
  );
}

export function useInvoices() {
  const ctx = useContext(InvoicesContext);
  if (!ctx) throw new Error('useInvoices must be used within InvoicesProvider');
  return ctx;
}
