import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'tester' | 'user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  isAdmin: boolean;
  isTester: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_STORAGE_KEY = 'armarinho-erp-auth';

const clearStoredSession = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
};

const normalizeRole = (role: unknown): AppRole => {
  if (role === 'admin' || role === 'tester') return role;
  return 'user';
};

const getUserRole = async (userId: string): Promise<AppRole> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Não foi possível carregar o papel do usuário. Usando papel padrão user.', error);
    return 'user';
  }

  return normalizeRole(data?.role);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>('user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const hydrateSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user }, error } = session
        ? await supabase.auth.getUser()
        : { data: { user: null }, error: null };
      const nextUser = error ? null : user;
      const nextRole = nextUser ? await getUserRole(nextUser.id) : 'user';

      if (!mounted) return;
      setSession(error ? null : session);
      setUser(nextUser);
      setRole(nextRole);
      setLoading(false);
    };

    hydrateSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setSession(session);
      setUser(nextUser);

      if (!nextUser) {
        setRole('user');
        setLoading(false);
        return;
      }

      setLoading(true);
      void getUserRole(nextUser.id).then((nextRole) => {
        if (!mounted) return;
        setRole(nextRole);
        setLoading(false);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } finally {
      clearStoredSession();
      setSession(null);
      setUser(null);
      setRole('user');
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, role, isAdmin: role === 'admin', isTester: role === 'tester', loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
