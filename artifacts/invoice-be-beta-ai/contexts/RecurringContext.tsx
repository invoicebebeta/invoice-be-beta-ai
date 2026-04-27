import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '../utils/storage';
import { Invoice, LineItem, RecurringFrequency, RecurringTemplate } from '../utils/types';
import { calculateDeposit, calculateRemaining, calculateTotal } from '../utils/calculations';
import { useAuth } from './AuthContext';

const newId = (p: string) => p + '_' + Date.now().toString() + Math.random().toString(36).slice(2, 8);

export function advanceDueDate(current: string, frequency: RecurringFrequency): string {
  const d = new Date(current);
  switch (frequency) {
    case 'weekly':    d.setDate(d.getDate() + 7);   break;
    case 'biweekly':  d.setDate(d.getDate() + 14);  break;
    case 'monthly':   d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
  }
  return d.toISOString();
}

type RecurringContextType = {
  templates: RecurringTemplate[];
  loading: boolean;
  addTemplate: (t: RecurringTemplate) => Promise<void>;
  updateTemplate: (id: string, patch: Partial<RecurringTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  getTemplate: (id: string) => RecurringTemplate | undefined;
  buildInvoice: (templateId: string, userId: string) => Invoice | null;
  markGenerated: (templateId: string) => Promise<void>;
};

const RecurringContext = createContext<RecurringContextType | null>(null);

export function RecurringProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      const list = (await storage.get<RecurringTemplate[]>(`recurring_templates_${userId}`)) ?? [];
      setTemplates(list);
      setLoading(false);
    })();
  }, [userId]);

  const persist = async (list: RecurringTemplate[]) => {
    if (!userId) return;
    setTemplates(list);
    await storage.set(`recurring_templates_${userId}`, list);
  };

  const addTemplate = async (t: RecurringTemplate) => {
    await persist([t, ...templates]);
  };

  const updateTemplate = async (id: string, patch: Partial<RecurringTemplate>) => {
    await persist(templates.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const deleteTemplate = async (id: string) => {
    await persist(templates.filter((t) => t.id !== id));
  };

  const getTemplate = (id: string) => templates.find((t) => t.id === id);

  const buildInvoice = (templateId: string, uid: string): Invoice | null => {
    const tmpl = templates.find((t) => t.id === templateId);
    if (!tmpl) return null;
    const clonedItems: LineItem[] = tmpl.lineItems.map((li) => ({ ...li, id: newId('li') }));
    const total = calculateTotal(clonedItems);
    const depositAmount = tmpl.requireDeposit ? calculateDeposit(total, tmpl.depositPercent) : 0;
    const remaining = calculateRemaining(total, depositAmount);
    const id = newId('inv');
    return {
      id,
      userId: uid,
      customerName: tmpl.customerName,
      customerEmail: tmpl.customerEmail,
      lineItems: clonedItems,
      dueDate: tmpl.nextDueDate,
      requireDeposit: tmpl.requireDeposit,
      depositPercent: tmpl.requireDeposit ? tmpl.depositPercent : 0,
      total,
      depositAmount,
      remainingBalance: remaining,
      status: tmpl.requireDeposit ? 'awaiting_deposit' : 'draft',
      currency: tmpl.currency,
      notes: tmpl.notes,
      depositLink: undefined,
      finalLink: undefined,
      createdAt: new Date().toISOString(),
    };
  };

  const markGenerated = async (templateId: string) => {
    const tmpl = templates.find((t) => t.id === templateId);
    if (!tmpl) return;
    await updateTemplate(templateId, {
      lastGeneratedAt: new Date().toISOString(),
      nextDueDate: advanceDueDate(tmpl.nextDueDate, tmpl.frequency),
    });
  };

  return (
    <RecurringContext.Provider value={{ templates, loading, addTemplate, updateTemplate, deleteTemplate, getTemplate, buildInvoice, markGenerated }}>
      {children}
    </RecurringContext.Provider>
  );
}

export function useRecurring() {
  const ctx = useContext(RecurringContext);
  if (!ctx) throw new Error('useRecurring must be used within RecurringProvider');
  return ctx;
}
