import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthHook extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export function useAuth(): AuthHook {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setState({ user: null, loading: false, error: null });
      return;
    }

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setState({ user, loading: false, error: null });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setState(prev => ({ ...prev, user: session?.user || null, loading: false }));

      // Create user_tiers record on signup
      if (event === 'SIGNED_IN' && session?.user) {
        supabase.from('user_tiers').upsert(
          { user_id: session.user.id, tier: 'free' },
          { onConflict: 'user_id' }
        );
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Auth not configured');
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Auth not configured');
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      throw error;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error('Auth not configured');
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: chrome.runtime.getURL('index.html') }
    });
    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    // Clear local caches
    await chrome.storage.local.remove(['proStatus', 'analysisCount']);
    setState({ user: null, loading: false, error: null });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Auth not configured');
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }, []);

  return { ...state, signIn, signUp, signInWithGoogle, signOut, resetPassword };
}
