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
import { debugError, debugLog } from './debugLog';
import { useActiveFarmStore } from '../stores/activeFarmStore';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ONBOARDING_CACHE_KEY = 'ag-onboarding-status';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check if an RPC error indicates an invalid/expired session.
 * Auth errors should trigger session expiry, not fall back to cache.
 */
const isAuthRpcError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const errObj = error as { code?: string; message?: string };
  // PGRST301: JWT expired (PostgREST)
  if (errObj.code === 'PGRST301') return true;
  // HTTP 401 returned as error code string
  if (errObj.code === '401') return true;
  // JWT-related error messages from Supabase/PostgREST (specific patterns only)
  const msg = errObj.message?.toLowerCase() ?? '';
  if (msg.includes('jwt expired') || msg.includes('invalid jwt') || msg.includes('invalid claim')) return true;
  return false;
};

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
  isFetchingOnboarding: boolean;
  sessionExpired: boolean;

  // Methods
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshOnboardingStatus: () => Promise<OnboardingStatus | null>;
  clearSessionExpired: () => void;
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
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isFetchingOnboarding, setIsFetchingOnboarding] = useState(false);

  // Track if we're in the middle of OTP verification to prevent race conditions
  const isVerifyingRef = useRef(false);

  // Track user-initiated sign-out to distinguish from forced sign-out (revoked account)
  const userInitiatedSignOut = useRef(false);

  // ---------------------------------------------------------------------------
  // Onboarding Status
  // ---------------------------------------------------------------------------

  const fetchOnboardingStatus =
    useCallback(async (): Promise<OnboardingStatus | null> => {
      try {
        const { data, error } = await supabase.rpc('get_onboarding_status');

        if (error) {
          debugError('Auth', 'Failed to fetch onboarding status:', error);

          // Auth errors mean the session itself is invalid -- don't mask with cache
          if (isAuthRpcError(error)) {
            debugLog('Auth', 'RPC failed due to invalid session, triggering session expiry');
            setSessionExpired(true);
            setSession(null);
            setUser(null);
            setOnboardingStatus(null);
            // Clear the stale onboarding cache too
            try { localStorage.removeItem(ONBOARDING_CACHE_KEY); } catch { /* non-critical */ }
            return null;
          }

          // Non-auth errors: attempt to serve from cache (existing behavior)
          try {
            const cached = localStorage.getItem(ONBOARDING_CACHE_KEY);
            if (cached) {
              debugLog('Auth', 'Serving onboarding status from cache (RPC error)');
              return JSON.parse(cached) as OnboardingStatus;
            }
          } catch {
            // Cache read failed (invalid JSON, etc.) -- fall through
          }
          return null;
        }

        // RPC returns a single object with has_profile, has_farm_membership, farm_id, farm_name
        const status: OnboardingStatus = {
          hasProfile: data?.has_profile ?? false,
          hasFarmMembership: data?.has_farm_membership ?? false,
          farmId: data?.farm_id ?? null,
          farmName: data?.farm_name ?? null,
        };

        // Cache successful result for offline fallback
        try {
          localStorage.setItem(ONBOARDING_CACHE_KEY, JSON.stringify(status));
        } catch {
          // localStorage may be full -- non-critical failure
          debugError('Auth', 'Failed to cache onboarding status');
        }

        return status;
      } catch (err) {
        debugError('Auth', 'Error fetching onboarding status:', err);

        // Check if the thrown error is auth-related
        if (isAuthRpcError(err)) {
          debugLog('Auth', 'RPC threw auth error, triggering session expiry');
          setSessionExpired(true);
          setSession(null);
          setUser(null);
          setOnboardingStatus(null);
          try { localStorage.removeItem(ONBOARDING_CACHE_KEY); } catch { /* non-critical */ }
          return null;
        }

        // Non-auth errors: attempt to serve from cache (existing behavior)
        try {
          const cached = localStorage.getItem(ONBOARDING_CACHE_KEY);
          if (cached) {
            debugLog('Auth', 'Serving onboarding status from cache (network error)');
            return JSON.parse(cached) as OnboardingStatus;
          }
        } catch {
          // Cache read failed -- fall through
        }
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
            // Fetch onboarding status with 5-second timeout to prevent infinite hang
            setIsFetchingOnboarding(true);
            try {
              const status = await Promise.race([
                fetchOnboardingStatus(),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
              ]);
              setOnboardingStatus(status);
            } finally {
              setIsFetchingOnboarding(false);
            }
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
            setIsFetchingOnboarding(true);
            try {
              const status = await Promise.race([
                fetchOnboardingStatus(),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
              ]);
              setOnboardingStatus(status);
            } finally {
              setIsFetchingOnboarding(false);
            }
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
          // Detect forced sign-out (revoked account, expired refresh token)
          if (!userInitiatedSignOut.current) {
            setSessionExpired(true);
          }
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
            setIsFetchingOnboarding(true);
            try {
              const status = await Promise.race([
                fetchOnboardingStatus(),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
              ]);
              setOnboardingStatus(status);
            } finally {
              setIsFetchingOnboarding(false);
            }
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
        debugError('Auth', 'Failed to get initial session:', error);
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
        setIsFetchingOnboarding(true);
        try {
          const status = await fetchOnboardingStatus();
          setOnboardingStatus(status);
        } finally {
          setIsFetchingOnboarding(false);
        }
      } finally {
        isVerifyingRef.current = false;
      }
    },
    [fetchOnboardingStatus]
  );

  const signOut = useCallback(async (): Promise<void> => {
    userInitiatedSignOut.current = true;

    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (error) {
      // Log but continue with local cleanup even if server call fails
      debugError('Auth', 'Sign out error:', error);
    }

    // Clear PowerSync local database
    try {
      await disconnectAndClear();
    } catch (error) {
      debugError('Auth', 'Failed to clear PowerSync:', error);
    }

    // Clear active farm override (super admin cross-farm state)
    useActiveFarmStore.getState().clearOverride();

    // Clear onboarding status cache BEFORE state setters
    try {
      localStorage.removeItem(ONBOARDING_CACHE_KEY);
    } catch {
      // Non-critical -- localStorage may be unavailable
    }

    // Clear local state
    setSession(null);
    setUser(null);
    setOnboardingStatus(null);

    userInitiatedSignOut.current = false;
  }, []);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Context Value
  // ---------------------------------------------------------------------------

  const value: AuthContextType = {
    user,
    session,
    isAuthReady,
    onboardingStatus,
    isFetchingOnboarding,
    sessionExpired,
    sendOtp,
    verifyOtp,
    signOut,
    refreshOnboardingStatus,
    clearSessionExpired,
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
