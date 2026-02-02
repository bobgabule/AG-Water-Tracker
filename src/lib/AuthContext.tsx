import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface UserProfile {
  id: string;
  farm_id: string | null;
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
  sessionExpired: boolean;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<{ isNewUser: boolean }>;
  createProfile: (data: { firstName: string; lastName: string; email: string }) => Promise<void>;
  setFarmOnProfile: (farmId: string, role: string) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, farm_id, role, display_name, first_name, last_name, email, phone')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const loadProfile = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setUserProfile(null);
      return;
    }
    const profile = await fetchUserProfile(authUser.id);
    setUserProfile(profile);
  }, []);

  useEffect(() => {
    // Subscribe to auth changes — INITIAL_SESSION fires immediately with cached session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const authUser = session?.user ?? null;

        switch (event) {
          case 'INITIAL_SESSION': {
            if (authUser && navigator.onLine) {
              // Validate session with a network roundtrip when online (with timeout)
              try {
                const timeoutMs = 8000;
                const getUserPromise = supabase.auth.getUser();
                const timeoutPromise = new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error('Session validation timed out')), timeoutMs)
                );

                const { data: { user: validatedUser }, error } = await Promise.race([
                  getUserPromise,
                  timeoutPromise,
                ]);
                if (error || !validatedUser) {
                  // Session is invalid or expired — sign out cleanly
                  setSessionExpired(true);
                  await supabase.auth.signOut().catch(() => {});
                  setUser(null);
                  setUserProfile(null);
                  setLoading(false);
                  return;
                }
                setUser(validatedUser);
                await loadProfile(validatedUser);
              } catch {
                // Network error or timeout — trust local session
                setUser(authUser);
                await loadProfile(authUser);
              }
            } else {
              // Offline or no user — use whatever we have from storage
              setUser(authUser);
              await loadProfile(authUser);
            }
            setLoading(false);
            break;
          }

          case 'SIGNED_IN': {
            setSessionExpired(false);
            setUser(authUser);
            await loadProfile(authUser);
            break;
          }

          case 'TOKEN_REFRESHED': {
            // Update user object; no need to re-fetch profile
            setUser(authUser);
            break;
          }

          case 'SIGNED_OUT': {
            setUser(null);
            setUserProfile(null);
            break;
          }

          case 'USER_UPDATED': {
            setUser(authUser);
            await loadProfile(authUser);
            break;
          }
        }
      }
    );

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
      .upsert({
        id: user.id,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: user.phone ?? null,
        role: 'member',
      });

    if (error) throw error;

    // Set profile from the data we just wrote (avoids RLS SELECT timing issues)
    const newProfile: UserProfile = {
      id: user.id,
      farm_id: null,
      role: 'member',
      display_name: `${data.firstName} ${data.lastName}`,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: user.phone ?? null,
    };
    setUserProfile(newProfile);
  };

  const setFarmOnProfile = useCallback((farmId: string, role: string) => {
    setUserProfile((prev) => prev ? { ...prev, farm_id: farmId, role } : prev);
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Even if the server call fails (e.g. offline), clear local state
    }
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
    <AuthContext.Provider value={{ user, userProfile, loading, sessionExpired, sendOtp, verifyOtp, createProfile, setFarmOnProfile, signOut, refreshProfile }}>
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
