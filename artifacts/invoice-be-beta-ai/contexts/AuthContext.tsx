import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '../utils/storage';
import { User } from '../utils/types';

type AuthContextType = {
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (email: string, password: string, businessName: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateBusinessName: (name: string) => Promise<void>;
  updateCurrency: (currency: string) => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);
const USERS_KEY = 'users';
const CURRENT_KEY = 'currentUser';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await storage.get<User>(CURRENT_KEY);
      if (stored) setUser({ currency: 'USD', ...stored });
      setLoading(false);
    })();
  }, []);

  const signUp: AuthContextType['signUp'] = async (email, password, businessName) => {
    if (!email || !password || !businessName) return { ok: false, error: 'All fields are required' };
    const users = (await storage.get<User[]>(USERS_KEY)) ?? [];
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: 'An account with that email already exists' };
    }
    const newUser: User = {
      id: 'user_' + Date.now().toString() + Math.random().toString(36).slice(2, 8),
      email,
      password,
      businessName,
      currency: 'USD',
    };
    await storage.set(USERS_KEY, [...users, newUser]);
    await storage.set(CURRENT_KEY, newUser);
    setUser(newUser);
    return { ok: true };
  };

  const signIn: AuthContextType['signIn'] = async (email, password) => {
    if (!email || !password) return { ok: false, error: 'Email and password are required' };
    const users = (await storage.get<User[]>(USERS_KEY)) ?? [];
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!found) return { ok: false, error: 'Invalid email or password' };
    const withDefaults = { currency: 'USD', ...found };
    await storage.set(CURRENT_KEY, withDefaults);
    setUser(withDefaults);
    return { ok: true };
  };

  const signOut = async () => {
    await storage.remove(CURRENT_KEY);
    setUser(null);
  };

  const persistUser = async (updated: User) => {
    setUser(updated);
    await storage.set(CURRENT_KEY, updated);
    const users = (await storage.get<User[]>(USERS_KEY)) ?? [];
    await storage.set(USERS_KEY, users.map((u) => (u.id === updated.id ? updated : u)));
  };

  const updateBusinessName = async (name: string) => {
    if (!user) return;
    await persistUser({ ...user, businessName: name });
  };

  const updateCurrency = async (currency: string) => {
    if (!user) return;
    await persistUser({ ...user, currency });
  };

  return (
    <AuthContext.Provider
      value={{ user, signIn, signUp, signOut, updateBusinessName, updateCurrency, loading }}
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
