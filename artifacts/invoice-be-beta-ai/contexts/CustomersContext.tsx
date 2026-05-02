import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { storage } from '../utils/storage';
import { Customer } from '../utils/types';
import { useAuth } from './AuthContext';

const newId = (p: string) => p + '_' + Date.now().toString() + Math.random().toString(36).slice(2, 8);

type CustomersContextType = {
  customers: Customer[];
  loading: boolean;
  addCustomer: (data: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer>;
  updateCustomer: (id: string, patch: Partial<Omit<Customer, 'id' | 'createdAt'>>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  upsertFromInvoice: (name: string, email: string) => Promise<void>;
  findByEmail: (email: string) => Customer | undefined;
};

const CustomersContext = createContext<CustomersContextType | null>(null);

export function CustomersProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setCustomers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const list = (await storage.get<Customer[]>(`customers_${userId}`)) ?? [];
      setCustomers(list);
      setLoading(false);
    })();
  }, [userId]);

  const persist = async (list: Customer[]) => {
    if (!userId) return;
    setCustomers(list);
    await storage.set(`customers_${userId}`, list);
  };

  const addCustomer = async (data: Omit<Customer, 'id' | 'createdAt'>) => {
    const c: Customer = { ...data, id: newId('cust'), createdAt: new Date().toISOString() };
    await persist([c, ...customers]);
    return c;
  };

  const updateCustomer = async (id: string, patch: Partial<Omit<Customer, 'id' | 'createdAt'>>) => {
    await persist(customers.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const deleteCustomer = async (id: string) => {
    await persist(customers.filter((c) => c.id !== id));
  };

  const upsertFromInvoice = useCallback(async (name: string, email: string) => {
    if (!email.trim()) return;
    const key = email.trim().toLowerCase();
    const existing = customers.find((c) => c.email.toLowerCase() === key);
    if (existing) {
      if (existing.name !== name.trim() && name.trim()) {
        await persist(customers.map((c) => (c.id === existing.id ? { ...c, name: name.trim() } : c)));
      }
    } else {
      const c: Customer = {
        id: newId('cust'),
        name: name.trim() || email.trim(),
        email: email.trim(),
        createdAt: new Date().toISOString(),
      };
      await persist([c, ...customers]);
    }
  }, [customers, userId]);

  const findByEmail = useCallback(
    (email: string) => customers.find((c) => c.email.toLowerCase() === email.toLowerCase()),
    [customers]
  );

  return (
    <CustomersContext.Provider
      value={{ customers, loading, addCustomer, updateCustomer, deleteCustomer, upsertFromInvoice, findByEmail }}
    >
      {children}
    </CustomersContext.Provider>
  );
}

export function useCustomers() {
  const ctx = useContext(CustomersContext);
  if (!ctx) throw new Error('useCustomers must be used within CustomersProvider');
  return ctx;
}
