import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../utils/storage';
import { Invoice, LineItem } from '../utils/types';
import { seedIfEmpty } from '../utils/seed';

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
const COUNTER_KEY = 'invoices_counter';

const newId = (p: string) => p + '_' + Date.now().toString() + Math.random().toString(36).slice(2, 8);

function padNum(n: number): string {
  return String(n).padStart(4, '0');
}

export function InvoicesProvider({ children }: { children: React.ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    (async () => {
      await seedIfEmpty();
      const list = (await storage.get<Invoice[]>(KEY)) ?? [];
      setInvoices(list);

      const stored = await storage.get<number>(COUNTER_KEY);
      if (stored != null) {
        setCounter(stored);
      } else {
        const maxFromExisting = list.reduce((max, inv) => {
          if (!inv.invoiceNumber) return max;
          const n = parseInt(inv.invoiceNumber.replace(/\D/g, ''), 10);
          return isNaN(n) ? max : Math.max(max, n);
        }, 0);
        const derived = Math.max(maxFromExisting, list.length);
        setCounter(derived);
        await storage.set(COUNTER_KEY, derived);
      }

      setLoading(false);
    })();
  }, []);

  const persist = async (list: Invoice[]) => {
    setInvoices(list);
    await storage.set(KEY, list);
  };

  const nextInvoiceNumber = async (currentCounter: number): Promise<[string, number]> => {
    const next = currentCounter + 1;
    await storage.set(COUNTER_KEY, next);
    setCounter(next);
    return [`INV-${padNum(next)}`, next];
  };

  const addInvoice = async (invoice: Invoice) => {
    const [invoiceNumber] = await nextInvoiceNumber(counter);
    await persist([{ ...invoice, invoiceNumber }, ...invoices]);
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
    const [invoiceNumber] = await nextInvoiceNumber(counter);
    const copy: Invoice = {
      ...source,
      id: newInvoiceId,
      invoiceNumber,
      lineItems: clonedItems,
      dueDate,
      status: 'draft',
      depositLink: undefined,
      finalLink: undefined,
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
