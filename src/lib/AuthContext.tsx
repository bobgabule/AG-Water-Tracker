import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface UserProfile {
  id: string;
  organization_id: string | null; // Maps to DB column; displayed as "farm" in UI
  role: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<{ isNewUser: boolean }>;
  createProfile: (data: { firstName: string; lastName: string; email: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, organization_id, role, display_name, first_name, last_name, email, phone')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setUserProfile(null);
      return;
    }
    const profile = await fetchUserProfile(authUser.id);
    setUserProfile(profile);
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const authUser = session?.user ?? null;
      setUser(authUser);
      loadProfile(authUser).finally(() => setLoading(false));
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user ?? null;
      setUser(authUser);
      loadProfile(authUser);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const sendOtp = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
  };

  const verifyOtp = async (phone: string, token: string): Promise<{ isNewUser: boolean }> => {
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    if (error) throw error;

    const authUser = data.user;
    if (!authUser) throw new Error('Verification failed');

    setUser(authUser);
    const profile = await fetchUserProfile(authUser.id);
    setUserProfile(profile);

    return { isNewUser: profile === null };
  };

  const createProfile = async (data: { firstName: string; lastName: string; email: string }) => {
    if (!user) throw new Error('Must be authenticated to create profile');

    const { error } = await supabase
      .from('users')
      .insert({
        id: user.id,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: user.phone ?? null,
        role: 'member',
      });

    if (error) throw error;

    // Refresh profile after creation
    const profile = await fetchUserProfile(user.id);
    setUserProfile(profile);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setUserProfile(null);
  };

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profile = await fetchUserProfile(user.id);
      setUserProfile(profile);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, sendOtp, verifyOtp, createProfile, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
