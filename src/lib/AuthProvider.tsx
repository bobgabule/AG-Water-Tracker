import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import type { ReactNode } from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { disconnectAndClear } from './powersync';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnboardingStatus {
  hasProfile: boolean;
  hasFarmMembership: boolean;
  farmId: string | null;
  farmName: string | null;
}

export interface AuthContextType {
  // State
  user: User | null;
  session: Session | null;
  isAuthReady: boolean;
  onboardingStatus: OnboardingStatus | null;

  // Methods
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshOnboardingStatus: () => Promise<OnboardingStatus | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider Component
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [onboardingStatus, setOnboardingStatus] =
    useState<OnboardingStatus | null>(null);

  // Track if we're in the middle of OTP verification to prevent race conditions
  const isVerifyingRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Onboarding Status
  // ---------------------------------------------------------------------------

  const fetchOnboardingStatus =
    useCallback(async (): Promise<OnboardingStatus | null> => {
      try {
        const { data, error } = await supabase.rpc('get_onboarding_status');

        if (error) {
          console.error('Failed to fetch onboarding status:', error);
          return null;
        }

        // RPC returns a single object with has_profile, has_farm_membership, farm_id, farm_name
        const status: OnboardingStatus = {
          hasProfile: data?.has_profile ?? false,
          hasFarmMembership: data?.has_farm_membership ?? false,
          farmId: data?.farm_id ?? null,
          farmName: data?.farm_name ?? null,
        };

        return status;
      } catch (err) {
        console.error('Error fetching onboarding status:', err);
        return null;
      }
    }, []);

  const refreshOnboardingStatus =
    useCallback(async (): Promise<OnboardingStatus | null> => {
      const status = await fetchOnboardingStatus();
      setOnboardingStatus(status);
      return status;
    }, [fetchOnboardingStatus]);

  // ---------------------------------------------------------------------------
  // Auth State Change Handler
  // ---------------------------------------------------------------------------

  const handleAuthStateChange = useCallback(
    async (event: AuthChangeEvent, newSession: Session | null) => {
      const authUser = newSession?.user ?? null;

      switch (event) {
        case 'INITIAL_SESSION': {
          setSession(newSession);
          setUser(authUser);

          if (authUser) {
            // Fetch onboarding status for authenticated user
            const status = await fetchOnboardingStatus();
            setOnboardingStatus(status);
          } else {
            setOnboardingStatus(null);
          }

          // Mark auth as ready after initial session check completes
          setIsAuthReady(true);
          break;
        }

        case 'SIGNED_IN': {
          // Skip if verifyOtp is handling this (it will set state directly)
          if (isVerifyingRef.current) break;

          setSession(newSession);
          setUser(authUser);

          if (authUser) {
            const status = await fetchOnboardingStatus();
            setOnboardingStatus(status);
          }
          break;
        }

        case 'TOKEN_REFRESHED': {
          // Update session and user, no need to re-fetch onboarding status
          setSession(newSession);
          setUser(authUser);
          break;
        }

        case 'SIGNED_OUT': {
          setSession(null);
          setUser(null);
          setOnboardingStatus(null);
          break;
        }

        case 'USER_UPDATED': {
          setSession(newSession);
          setUser(authUser);

          // Refresh onboarding status in case user data changed
          if (authUser) {
            const status = await fetchOnboardingStatus();
            setOnboardingStatus(status);
          }
          break;
        }
      }
    },
    [fetchOnboardingStatus]
  );

  // ---------------------------------------------------------------------------
  // Initialization Effect
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        // Manually trigger INITIAL_SESSION handling
        await handleAuthStateChange('INITIAL_SESSION', initialSession);
      } catch (error) {
        console.error('Failed to get initial session:', error);
        // Even on error, mark auth as ready so the app can proceed
        setIsAuthReady(true);
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Skip INITIAL_SESSION here since we handle it manually above
      if (event === 'INITIAL_SESSION') return;

      await handleAuthStateChange(event, newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [handleAuthStateChange]);

  // ---------------------------------------------------------------------------
  // Auth Methods
  // ---------------------------------------------------------------------------

  const sendOtp = useCallback(async (phone: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
  }, []);

  const verifyOtp = useCallback(
    async (phone: string, token: string): Promise<void> => {
      isVerifyingRef.current = true;

      try {
        const { data, error } = await supabase.auth.verifyOtp({
          phone,
          token,
          type: 'sms',
        });

        if (error) throw error;

        const authUser = data.user;
        const authSession = data.session;

        if (!authUser) {
          throw new Error('Verification failed: no user returned');
        }

        // Set session and user immediately
        setSession(authSession);
        setUser(authUser);

        // Fetch onboarding status for the newly verified user
        const status = await fetchOnboardingStatus();
        setOnboardingStatus(status);
      } finally {
        isVerifyingRef.current = false;
      }
    },
    [fetchOnboardingStatus]
  );

  const signOut = useCallback(async (): Promise<void> => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (error) {
      // Log but continue with local cleanup even if server call fails
      console.error('Sign out error:', error);
    }

    // Clear PowerSync local database
    try {
      await disconnectAndClear();
    } catch (error) {
      console.error('Failed to clear PowerSync:', error);
    }

    // Clear local state
    setSession(null);
    setUser(null);
    setOnboardingStatus(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Context Value
  // ---------------------------------------------------------------------------

  const value: AuthContextType = {
    user,
    session,
    isAuthReady,
    onboardingStatus,
    sendOtp,
    verifyOtp,
    signOut,
    refreshOnboardingStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
