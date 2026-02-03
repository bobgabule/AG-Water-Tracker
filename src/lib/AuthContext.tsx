import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
  profileError: string | null;
  profileFetchFailed: boolean; // true = fetch threw error, false = fetch succeeded (profile may be null for new users)
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<{ isNewUser: boolean }>;
  createProfile: (data: { firstName: string; lastName: string; email: string }) => Promise<void>;
  setFarmOnProfile: (farmId: string, role: string) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Profile Caching (localStorage)
// ---------------------------------------------------------------------------
const PROFILE_CACHE_KEY = 'ag_user_profile';
const PROFILE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedProfile {
  profile: UserProfile;
  cachedAt: number;
  userId: string;
}

function getCachedProfile(userId: string): UserProfile | null {
  try {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!cached) return null;

    const { profile, cachedAt, userId: cachedUserId } = JSON.parse(cached) as CachedProfile;

    // Verify it matches current user - clear stale cache if different user
    if (cachedUserId !== userId) {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }

    // Check if cache is expired
    if (Date.now() - cachedAt > PROFILE_CACHE_TTL_MS) {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }

    return profile;
  } catch {
    // If cache is corrupted, clear it
    try {
      localStorage.removeItem(PROFILE_CACHE_KEY);
    } catch {
      // Ignore
    }
    return null;
  }
}

function setCachedProfile(profile: UserProfile, userId: string): void {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
      profile,
      cachedAt: Date.now(),
      userId,
    }));
  } catch {
    // Ignore storage errors
  }
}

function clearCachedProfile(): void {
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // Ignore
  }
}

// ---------------------------------------------------------------------------
// Profile Fetching
// ---------------------------------------------------------------------------
type ProfileFetchReason = 'found' | 'not_found' | 'rls_blocked' | 'error';

interface ProfileFetchResult {
  profile: UserProfile | null;
  reason: ProfileFetchReason;
  error?: Error;
}

async function fetchUserProfile(userId: string): Promise<ProfileFetchResult> {
  // Ensure we have a valid session before making the request
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    return { profile: null, reason: 'error', error: new Error('No active session') };
  }

  // Verify the session user matches the requested userId
  if (session.user.id !== userId) {
    console.warn('Session user ID mismatch:', { sessionUserId: session.user.id, requestedUserId: userId });
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, farm_id, role, display_name, first_name, last_name, email, phone')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found - check if cached profile exists to distinguish RLS timing vs new user
      const cached = getCachedProfile(userId);
      if (cached) {
        // User had a profile before - this is likely an RLS timing issue
        return { profile: null, reason: 'rls_blocked' };
      }
      // No cache - genuine new user
      return { profile: null, reason: 'not_found' };
    }
    return { profile: null, reason: 'error', error };
  }

  return { profile: data, reason: 'found' };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileFetchFailed, setProfileFetchFailed] = useState(false);
  const isVerifyingRef = useRef(false);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadProfile = useCallback(async (authUser: User | null): Promise<ProfileFetchResult | null> => {
    if (!authUser) {
      setUserProfile(null);
      setProfileError(null);
      setProfileFetchFailed(false);
      clearCachedProfile();
      return null;
    }

    const result = await fetchUserProfile(authUser.id);

    switch (result.reason) {
      case 'found':
        setUserProfile(result.profile);
        setProfileError(null);
        setProfileFetchFailed(false);
        if (result.profile) {
          setCachedProfile(result.profile, authUser.id);
        }
        break;
      case 'not_found':
        // Genuine new user
        setUserProfile(null);
        setProfileError(null);
        setProfileFetchFailed(false);
        break;
      case 'rls_blocked':
        // RLS timing issue - use cached profile, mark as failed so ProtectedRoute shows retry
        const cached = getCachedProfile(authUser.id);
        setUserProfile(cached);
        setProfileError('Unable to verify profile');
        setProfileFetchFailed(true);
        break;
      case 'error':
        console.error('Profile fetch error:', result.error);
        setUserProfile(getCachedProfile(authUser.id));
        setProfileError('Failed to load profile');
        setProfileFetchFailed(true);
        break;
    }

    return result;
  }, []);

  useEffect(() => {
    // Safety timeout - always stop loading after 10 seconds max
    safetyTimeoutRef.current = setTimeout(() => {
      setLoading(false);
    }, 10000);

    // Subscribe to auth changes — INITIAL_SESSION fires immediately with cached session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const authUser = session?.user ?? null;

        switch (event) {
          case 'INITIAL_SESSION': {
            // Helper to retry profile loading with exponential backoff
            // Only retries for 'rls_blocked' or 'error', not for 'not_found' (genuine new user)
            // Max total delay: 200 + 400 + 800 + 1600 = 3000ms (well under 10s safety timeout)
            const loadProfileWithRetry = async (u: User): Promise<ProfileFetchResult | null> => {
              const maxRetries = 5;
              const baseDelayMs = 200;
              let lastResult: ProfileFetchResult | null = null;

              for (let attempt = 1; attempt <= maxRetries; attempt++) {
                lastResult = await loadProfile(u);

                if (!lastResult) return null;

                // Success or genuine new user - no need to retry
                if (lastResult.reason === 'found' || lastResult.reason === 'not_found') {
                  return lastResult;
                }

                // RLS blocked or error - retry with exponential backoff (except on last attempt)
                if (attempt < maxRetries) {
                  await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
                }
              }

              // All retries exhausted - return last result (error state already set by loadProfile)
              return lastResult;
            };

            try {
              if (authUser && navigator.onLine) {
                // Validate session with a network roundtrip when online (with timeout)
                try {
                  const timeoutMs = 5000;
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
                    clearCachedProfile();
                  } else {
                    setUser(validatedUser);
                    // Delay to ensure the Supabase client has fully synchronized the session
                    // This fixes a race condition where the JWT isn't ready for subsequent API calls
                    await new Promise(r => setTimeout(r, 200));
                    // Load profile with retry logic
                    await loadProfileWithRetry(validatedUser);
                  }
                } catch {
                  // Network error or timeout — use cached profile
                  setUser(authUser);
                  const cached = getCachedProfile(authUser.id);
                  if (cached) {
                    setUserProfile(cached);
                    setProfileError(null);
                    setProfileFetchFailed(false);
                  } else {
                    // No cache available - try to load anyway
                    await new Promise(r => setTimeout(r, 200));
                    await loadProfileWithRetry(authUser);
                  }
                }
              } else {
                // Offline or no user — use cached profile
                setUser(authUser);
                if (authUser) {
                  const cached = getCachedProfile(authUser.id);
                  if (cached) {
                    setUserProfile(cached);
                    setProfileError(null);
                    setProfileFetchFailed(false);
                  } else {
                    // No cache and offline - mark as failed
                    setUserProfile(null);
                    setProfileError('Unable to load profile while offline');
                    setProfileFetchFailed(true);
                  }
                }
              }
            } finally {
              if (safetyTimeoutRef.current) {
                clearTimeout(safetyTimeoutRef.current);
                safetyTimeoutRef.current = null;
              }
              setLoading(false);
            }
            break;
          }

          case 'SIGNED_IN': {
            setSessionExpired(false);
            if (isVerifyingRef.current) break; // verifyOtp handles user + profile
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
            clearCachedProfile();
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

    return () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const sendOtp = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
  };

  const verifyOtp = async (phone: string, token: string): Promise<{ isNewUser: boolean }> => {
    isVerifyingRef.current = true;
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
      if (error) throw error;

      const authUser = data.user;
      if (!authUser) throw new Error('Verification failed');

      const result = await fetchUserProfile(authUser.id);
      const profile = result.profile;

      // Set both together — no intermediate render with user but no profile
      setUser(authUser);
      setUserProfile(profile);
      // Clear any previous error state from failed sessions
      setProfileError(null);
      setProfileFetchFailed(false);

      // Cache the profile if found
      if (profile) {
        setCachedProfile(profile, authUser.id);
      }

      return { isNewUser: result.reason === 'not_found' };
    } finally {
      isVerifyingRef.current = false;
    }
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
    const displayName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim() || null;
    const newProfile: UserProfile = {
      id: user.id,
      farm_id: null,
      role: 'member',
      display_name: displayName,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: user.phone ?? null,
    };
    setUserProfile(newProfile);
    // Cache the new profile
    setCachedProfile(newProfile, user.id);
  };

  const setFarmOnProfile = useCallback((farmId: string, role: string) => {
    setUserProfile((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, farm_id: farmId, role };
      // Update cache with new farm assignment
      setCachedProfile(updated, prev.id);
      return updated;
    });
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Even if the server call fails (e.g. offline), clear local state
    }
    setUser(null);
    setUserProfile(null);
    setProfileError(null);
    setProfileFetchFailed(false);
    clearCachedProfile();
  };

  const refreshProfile = useCallback(async () => {
    if (user) {
      const result = await fetchUserProfile(user.id);

      switch (result.reason) {
        case 'found':
          setUserProfile(result.profile);
          setProfileError(null);
          setProfileFetchFailed(false);
          if (result.profile) {
            setCachedProfile(result.profile, user.id);
          }
          break;
        case 'not_found':
          setUserProfile(null);
          setProfileError(null);
          setProfileFetchFailed(false);
          break;
        case 'rls_blocked':
        case 'error':
          console.error('Profile refresh failed:', result.error);
          setProfileError('Failed to load profile');
          setProfileFetchFailed(true);
          break;
      }
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, sessionExpired, profileError, profileFetchFailed, sendOtp, verifyOtp, createProfile, setFarmOnProfile, signOut, refreshProfile }}>
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
