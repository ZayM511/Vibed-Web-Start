// User-related types

export interface User {
  id: string;
  email: string;
  createdAt: string;
  tier: 'free' | 'pro';
  subscription?: Subscription;
}

export interface Subscription {
  id: string;
  status: 'active' | 'canceled' | 'expired' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  autoSync: boolean;
}
