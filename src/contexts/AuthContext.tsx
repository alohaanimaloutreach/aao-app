import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import type { AppUser } from '../types/user';

const isTestEnv = import.meta.env.VITE_SUPABASE_URL?.includes('ybswvwbqweywhfjgdwro');
const TEST_EMAIL = 'shauna@alohaanimaloutreach.org';
const TEST_PASSWORD = 'AaoField2026!';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  sendMagicLink: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setProfile(data as AppUser);
    }
  }

  useEffect(() => {
    // getSession() is the source of truth for initial load.
    // onAuthStateChange fires INITIAL_SESSION with a cached (possibly expired)
    // token before getSession resolves, so we gate initial loading on getSession.
    (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[AuthContext] getSession error:', error);
        }

        // Auto-login on test environment
        if (!session && isTestEnv) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
          });
          if (!signInErr && signInData?.session) {
            setSession(signInData.session);
            await fetchProfile(signInData.session.user.id);
            return;
          }
          if (signInErr) console.error('[AuthContext] test auto-login failed:', signInErr);
        }

        setSession(session);
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (e) {
        console.error('[AuthContext] init failed:', e);
      } finally {
        initialLoadDone.current = true;
        setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip the INITIAL_SESSION event — getSession handles initial load
      if (!initialLoadDone.current) return;

      setSession(session);
      try {
        if (session?.user) {
          await fetchProfile(session.user.id);
          if (event === 'SIGNED_IN') {
            supabase.from('login_history').insert({ user_id: session.user.id }).then(() => {});
          }
        } else {
          setProfile(null);
        }
      } catch (e) {
        console.error('[AuthContext] auth state change failed:', e);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  }

  async function sendMagicLink(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signIn,
        sendMagicLink,
        signOut,
        isAdmin: profile?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
