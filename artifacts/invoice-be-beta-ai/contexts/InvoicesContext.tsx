import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../utils/storage';
import { Invoice, LineItem } from '../utils/types';
import { useAuth } from './AuthContext';
import { useSubscription } from '@/lib/revenuecat';

export const FREE_TIER_LIMIT = 3;

type InvoicesContextType = {
  invoices: Invoice[];
  loading: boolean;
  monthlyInvoiceCount: number;
  canCreateInvoice: boolean;
  addInvoice: (invoice: Invoice) => Promise<void>;
  updateInvoice: (id: string, patch: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  duplicateInvoice: (id: string) => Promise<Invoice | null>;
  convertQuoteToInvoice: (id: string) => Promise<Invoice | null>;
  getInvoice: (id: string) => Invoice | undefined;
  totalRevenue: number;
  monthRevenue: number;
  outstanding: number;
};

const InvoicesContext = createContext<InvoicesContextType | null>(null);

const newId = (p: string) => p + '_' + Date.now().toString() + Math.random().toString(36).slice(2, 8);

function padNum(n: number): string {
  return String(n).padStart(4, '0');
}

function currentMonthKey(userId: string): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `monthlyInvoiceCount_${userId}_${now.getFullYear()}-${mm}`;
}

export function InvoicesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { isSubscribed } = useSubscription();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [counter, setCounter] = useState(0);
  const [quoteCounter, setQuoteCounter] = useState(0);
  const [monthlyInvoiceCount, setMonthlyInvoiceCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setInvoices([]);
      setCounter(0);
      setQuoteCounter(0);
      setMonthlyInvoiceCount(0);
      setLoading(false);
      return;
    }

    const KEY = `invoices_${userId}`;
    const COUNTER_KEY = `invoices_counter_${userId}`;
    const QUOTE_COUNTER_KEY = `quotes_counter_${userId}`;
    const MONTHLY_KEY = currentMonthKey(userId);

    setLoading(true);
    (async () => {
      const list = (await storage.get<Invoice[]>(KEY)) ?? [];
      setInvoices(list);

      const stored = await storage.get<number>(COUNTER_KEY);
      if (stored != null) {
        setCounter(stored);
      } else {
        const maxFromExisting = list.reduce((max, inv) => {
          if (!inv.invoiceNumber || inv.isQuote) return max;
          const n = parseInt(inv.invoiceNumber.replace(/\D/g, ''), 10);
          return isNaN(n) ? max : Math.max(max, n);
        }, 0);
        const derived = Math.max(maxFromExisting, list.filter((i) => !i.isQuote).length);
        setCounter(derived);
        await storage.set(COUNTER_KEY, derived);
      }

      const storedQ = await storage.get<number>(QUOTE_COUNTER_KEY);
      if (storedQ != null) {
        setQuoteCounter(storedQ);
      } else {
        const maxFromExisting = list.reduce((max, inv) => {
          if (!inv.invoiceNumber || !inv.isQuote) return max;
          const n = parseInt(inv.invoiceNumber.replace(/\D/g, ''), 10);
          return isNaN(n) ? max : Math.max(max, n);
        }, 0);
        setQuoteCounter(maxFromExisting);
        await storage.set(QUOTE_COUNTER_KEY, maxFromExisting);
      }

      const storedMonthly = (await storage.get<number>(MONTHLY_KEY)) ?? 0;
      setMonthlyInvoiceCount(storedMonthly);

      setLoading(false);
    })();
  }, [userId]);

  const canCreateInvoice = isSubscribed || monthlyInvoiceCount < FREE_TIER_LIMIT;

  const persist = async (list: Invoice[]) => {
    if (!userId) return;
    setInvoices(list);
    await storage.set(`invoices_${userId}`, list);
  };

  const nextInvoiceNumber = async (current: number): Promise<[string, number]> => {
    const next = current + 1;
    if (userId) await storage.set(`invoices_counter_${userId}`, next);
    setCounter(next);
    return [`INV-${padNum(next)}`, next];
  };

  const nextQuoteNumber = async (current: number): Promise<[string, number]> => {
    const next = current + 1;
    if (userId) await storage.set(`quotes_counter_${userId}`, next);
    setQuoteCounter(next);
    return [`QUO-${padNum(next)}`, next];
  };

  const incrementMonthlyCount = async () => {
    if (!userId) return;
    const key = currentMonthKey(userId);
    const next = monthlyInvoiceCount + 1;
    await storage.set(key, next);
    setMonthlyInvoiceCount(next);
  };

  const addInvoice = async (invoice: Invoice) => {
    let number: string;
    if (invoice.isQuote) {
      [number] = await nextQuoteNumber(quoteCounter);
    } else {
      [number] = await nextInvoiceNumber(counter);
      await incrementMonthlyCount();
    }
    await persist([{ ...invoice, invoiceNumber: number }, ...invoices]);
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
    let number: string;
    if (source.isQuote) {
      [number] = await nextQuoteNumber(quoteCounter);
    } else {
      [number] = await nextInvoiceNumber(counter);
      await incrementMonthlyCount();
    }
    const copy: Invoice = {
      ...source,
      id: newInvoiceId,
      invoiceNumber: number,
      lineItems: clonedItems,
      dueDate,
      status: 'draft',
      depositLink: undefined,
      finalLink: undefined,
      remindedAt: undefined,
      createdAt: new Date().toISOString(),
    };
    await persist([copy, ...invoices]);
    return copy;
  };

  const convertQuoteToInvoice = async (id: string) => {
    const source = invoices.find((i) => i.id === id);
    if (!source || !source.isQuote) return null;
    const [number] = await nextInvoiceNumber(counter);
    await incrementMonthlyCount();
    const updated: Invoice = {
      ...source,
      isQuote: false,
      invoiceNumber: number,
      status: 'draft',
    };
    await persist(invoices.map((inv) => (inv.id === id ? updated : inv)));
    return updated;
  };

  const getInvoice = (id: string) => invoices.find((i) => i.id === id);

  const totalRevenue = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      if (inv.isQuote) return sum;
      if (inv.status === 'fully_paid') return sum + inv.total;
      if (inv.status === 'deposit_paid') return sum + inv.depositAmount;
      return sum;
    }, 0);
  }, [invoices]);

  const monthRevenue = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return invoices.reduce((sum, inv) => {
      if (inv.isQuote) return sum;
      const paidAt = new Date(inv.createdAt).getTime();
      if (paidAt < startOfMonth) return sum;
      if (inv.status === 'fully_paid') return sum + inv.total;
      if (inv.status === 'deposit_paid') return sum + inv.depositAmount;
      return sum;
    }, 0);
  }, [invoices]);

  const outstanding = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      if (inv.isQuote) return sum;
      if (inv.status === 'fully_paid') return sum;
      if (inv.status === 'deposit_paid') return sum + inv.remainingBalance;
      return sum + inv.total;
    }, 0);
  }, [invoices]);

  return (
    <InvoicesContext.Provider
      value={{
        invoices, loading, monthlyInvoiceCount, canCreateInvoice,
        addInvoice, updateInvoice, deleteInvoice,
        duplicateInvoice, convertQuoteToInvoice, getInvoice,
        totalRevenue, monthRevenue, outstanding,
      }}
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
