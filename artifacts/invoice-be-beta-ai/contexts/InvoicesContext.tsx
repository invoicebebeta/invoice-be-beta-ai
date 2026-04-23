import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../utils/storage';
import { Invoice } from '../utils/types';
import { seedIfEmpty } from '../utils/seed';

type InvoicesContextType = {
  invoices: Invoice[];
  loading: boolean;
  addInvoice: (invoice: Invoice) => Promise<void>;
  updateInvoice: (id: string, patch: Partial<Invoice>) => Promise<void>;
  getInvoice: (id: string) => Invoice | undefined;
  totalRevenue: number;
};

const InvoicesContext = createContext<InvoicesContextType | null>(null);
const KEY = 'invoices';

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

  const getInvoice = (id: string) => invoices.find((i) => i.id === id);

  const totalRevenue = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      if (inv.status === 'fully_paid') return sum + inv.total;
      if (inv.status === 'deposit_paid') return sum + inv.depositAmount;
      return sum;
    }, 0);
  }, [invoices]);

  return (
    <InvoicesContext.Provider value={{ invoices, loading, addInvoice, updateInvoice, getInvoice, totalRevenue }}>
      {children}
    </InvoicesContext.Provider>
  );
}

export function useInvoices() {
  const ctx = useContext(InvoicesContext);
  if (!ctx) throw new Error('useInvoices must be used within InvoicesProvider');
  return ctx;
}
