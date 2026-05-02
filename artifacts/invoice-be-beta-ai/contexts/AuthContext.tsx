import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';
import { BankDetails, User } from '../utils/types';
import { apiSignIn, apiSignUp, apiUpdateLogo } from '../utils/authApi';
import { registerPushToken } from '../utils/pushNotifications';

type AuthContextType = {
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (email: string, password: string, businessName: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateBusinessName: (name: string) => Promise<void>;
  updateCurrency: (currency: string) => Promise<void>;
  updateLogo: (logoUri: string | null) => Promise<void>;
  updateBankDetails: (details: BankDetails | null) => Promise<void>;
  updateStripeAccount: (accountId: string | null) => Promise<void>;
  updateInvoiceColor: (color: string) => Promise<void>;
  updateVatNumber: (vat: string) => Promise<void>;
  updateBusinessAddress: (address: string) => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);
const CURRENT_KEY = 'currentUser';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await storage.get<User>(CURRENT_KEY);
      if (stored) {
        setUser({ currency: 'USD', ...stored });
        if (stored.logoUri) apiUpdateLogo(stored.id, stored.logoUri);
      }
      setLoading(false);
    })();
  }, []);

  const signUp: AuthContextType['signUp'] = async (email, password, businessName) => {
    if (!email || !password || !businessName) return { ok: false, error: 'All fields are required' };
    const result = await apiSignUp(email.trim(), password, businessName.trim());
    if (!result.ok || !result.user) return { ok: false, error: result.error ?? 'Sign up failed' };
    const newUser: User = { ...result.user, currency: 'USD' };
    await storage.set(CURRENT_KEY, newUser);
    setUser(newUser);
    if (Platform.OS !== 'web') registerPushToken(newUser.id).catch(() => {});
    return { ok: true };
  };

  const signIn: AuthContextType['signIn'] = async (email, password) => {
    if (!email || !password) return { ok: false, error: 'Email and password are required' };
    const result = await apiSignIn(email.trim(), password);
    if (!result.ok || !result.user) return { ok: false, error: result.error ?? 'Invalid email or password' };
    const existing = await storage.get<User>(CURRENT_KEY);
    const merged: User = {
      currency: 'USD',
      ...(existing?.id === result.user.id ? existing : {}),
      ...result.user,
    };
    await storage.set(CURRENT_KEY, merged);
    setUser(merged);
    if (merged.logoUri) apiUpdateLogo(merged.id, merged.logoUri);
    if (Platform.OS !== 'web') registerPushToken(merged.id).catch(() => {});
    return { ok: true };
  };

  const signOut = async () => {
    await storage.remove(CURRENT_KEY);
    setUser(null);
  };

  const persistUser = async (updated: User) => {
    setUser(updated);
    await storage.set(CURRENT_KEY, updated);
  };

  const updateBusinessName = async (name: string) => {
    if (!user) return;
    await persistUser({ ...user, businessName: name });
  };

  const updateCurrency = async (currency: string) => {
    if (!user) return;
    await persistUser({ ...user, currency });
  };

  const updateLogo = async (logoUri: string | null) => {
    if (!user) return;
    await persistUser({ ...user, logoUri: logoUri ?? undefined });
    apiUpdateLogo(user.id, logoUri);
  };

  const updateBankDetails = async (details: BankDetails | null) => {
    if (!user) return;
    await persistUser({ ...user, bankDetails: details ?? undefined });
  };

  const updateStripeAccount = async (accountId: string | null) => {
    if (!user) return;
    await persistUser({ ...user, stripeConnectedAccountId: accountId ?? undefined });
  };

  const updateInvoiceColor = async (color: string) => {
    if (!user) return;
    await persistUser({ ...user, invoiceColor: color });
  };

  const updateVatNumber = async (vat: string) => {
    if (!user) return;
    await persistUser({ ...user, vatNumber: vat });
  };

  const updateBusinessAddress = async (address: string) => {
    if (!user) return;
    await persistUser({ ...user, businessAddress: address });
  };

  return (
    <AuthContext.Provider
      value={{
        user, signIn, signUp, signOut,
        updateBusinessName, updateCurrency, updateLogo,
        updateBankDetails, updateStripeAccount, updateInvoiceColor,
        updateVatNumber, updateBusinessAddress,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
