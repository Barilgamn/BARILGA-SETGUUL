import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

// Supabase stores phone numbers without the leading "+"
export function displayPhone(user: User | null): string {
  return user?.phone ? `+${user.phone.replace(/^\+/, '')}` : '';
}

function profileOf(user: User): UserProfile {
  return {
    uid: user.id,
    phoneNumber: displayPhone(user),
    createdAt: new Date(user.created_at).getTime(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Keep a profiles row for phone sign-ins so admins can see who bought what
  useEffect(() => {
    if (!user?.phone) return;
    supabase
      .from('profiles')
      .upsert({ id: user.id, phone: displayPhone(user) }, { onConflict: 'id', ignoreDuplicates: true })
      .then(({ error }) => error && console.error('Profile upsert failed:', error.message));
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile: user ? profileOf(user) : null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
