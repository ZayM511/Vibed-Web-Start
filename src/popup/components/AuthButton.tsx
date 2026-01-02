import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (e) {
        console.error('Auth check failed:', e);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setUser(session?.user || null);
        }
      );

      return () => subscription.unsubscribe();
    }
  }, []);

  const handleSignIn = () => {
    chrome.tabs.create({ url: 'https://jobfiltr.com/login' });
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
      setUser(null);
      setShowMenu(false);

      // Clear cached pro status
      chrome.storage.local.remove('jobfiltr_pro_status');
    }
  };

  const handleOpenAccount = () => {
    chrome.tabs.create({ url: 'https://jobfiltr.com/account' });
    setShowMenu(false);
  };

  if (loading) {
    return (
      <div className="w-6 h-6 bg-blue-500/50 rounded-full animate-pulse" />
    );
  }

  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        className="text-xs text-white bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
      >
        Sign in
      </button>
    );
  }

  const initials = user.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() || '?';

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors',
          user.user_metadata?.avatar_url
            ? ''
            : 'bg-white text-blue-600'
        )}
      >
        {user.user_metadata?.avatar_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={user.user_metadata.avatar_url}
            alt="Avatar"
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border z-20 py-1">
            <div className="px-3 py-2 border-b">
              <div className="text-xs font-medium text-gray-900 truncate">
                {user.user_metadata?.full_name || 'User'}
              </div>
              <div className="text-[10px] text-gray-500 truncate">
                {user.email}
              </div>
            </div>
            <button
              onClick={handleOpenAccount}
              className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
            >
              Account Settings
            </button>
            <button
              onClick={handleSignOut}
              className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
