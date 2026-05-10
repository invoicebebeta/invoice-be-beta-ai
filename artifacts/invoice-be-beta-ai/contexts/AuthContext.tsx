import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';
import { BankDetails, User } from '../utils/types';
import { apiSignIn, apiSignUp, apiUpdateLogo, apiUpdateProfile, getApiBaseUrl } from '../utils/authApi';
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
    const serverUser = result.user;
    const merged: User = {
      id: serverUser.id,
      email: serverUser.email,
      businessName: serverUser.businessName,
      vatNumber: serverUser.vatNumber,
      businessAddress: serverUser.businessAddress,
      currency: serverUser.currency ?? 'USD',
      bankDetails: serverUser.bankDetails,
      invoiceColor: serverUser.invoiceColor,
      logoUri: serverUser.hasLogo ? `${getApiBaseUrl()}/api/logo/${serverUser.id}` : undefined,
    };
    await storage.set(CURRENT_KEY, merged);
    setUser(merged);
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

  const syncProfile = (updated: User) => {
    apiUpdateProfile(updated.id, {
      businessName: updated.businessName,
      vatNumber: updated.vatNumber ?? null,
      businessAddress: updated.businessAddress ?? null,
      currency: updated.currency ?? null,
      bankDetails: updated.bankDetails ?? null,
      invoiceColor: updated.invoiceColor ?? null,
    }).catch(() => {});
  };

  const updateBusinessName = async (name: string) => {
    if (!user) return;
    const updated = { ...user, businessName: name };
    await persistUser(updated);
    syncProfile(updated);
  };

  const updateCurrency = async (currency: string) => {
    if (!user) return;
    const updated = { ...user, currency };
    await persistUser(updated);
    syncProfile(updated);
  };

  const updateLogo = async (logoUri: string | null) => {
    if (!user) return;
    await persistUser({ ...user, logoUri: logoUri ?? undefined });
    apiUpdateLogo(user.id, logoUri);
  };

  const updateBankDetails = async (details: BankDetails | null) => {
    if (!user) return;
    const updated = { ...user, bankDetails: details ?? undefined };
    await persistUser(updated);
    syncProfile(updated);
  };

  const updateStripeAccount = async (accountId: string | null) => {
    if (!user) return;
    await persistUser({ ...user, stripeConnectedAccountId: accountId ?? undefined });
  };

  const updateInvoiceColor = async (color: string) => {
    if (!user) return;
    const updated = { ...user, invoiceColor: color };
    await persistUser(updated);
    syncProfile(updated);
  };

  const updateVatNumber = async (vat: string) => {
    if (!user) return;
    const updated = { ...user, vatNumber: vat };
    await persistUser(updated);
    syncProfile(updated);
  };

  const updateBusinessAddress = async (address: string) => {
    if (!user) return;
    const updated = { ...user, businessAddress: address };
    await persistUser(updated);
    syncProfile(updated);
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
