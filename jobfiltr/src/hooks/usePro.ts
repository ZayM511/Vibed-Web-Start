// Pro tier hook
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import type { UserTier } from '../types';

export function usePro() {
  const { user } = useAuth();
  const [tier, setTier] = useState<UserTier>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTier('free');
      setLoading(false);
      return;
    }

    // Check subscription status
    checkSubscription(user.id).then((isPro) => {
      setTier(isPro ? 'pro' : 'free');
      setLoading(false);
    });
  }, [user]);

  const isPro = tier === 'pro';

  const requirePro = (feature: string) => {
    if (!isPro) {
      throw new Error(`Pro required: ${feature}`);
    }
  };

  return { tier, isPro, loading, requirePro };
}

async function checkSubscription(_userId: string): Promise<boolean> {
  // TODO: Implement subscription check via Supabase
  return false;
}
