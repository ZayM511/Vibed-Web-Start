// Database types for Supabase

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          tier: 'free' | 'pro';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          tier?: 'free' | 'pro';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          tier?: 'free' | 'pro';
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          settings: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          settings?: Record<string, unknown>;
          updated_at?: string;
        };
      };
      user_blocklist: {
        Row: {
          id: string;
          user_id: string;
          companies: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          companies: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          companies?: string[];
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          status: 'active' | 'canceled' | 'expired' | 'trialing';
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status: 'active' | 'canceled' | 'expired' | 'trialing';
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'active' | 'canceled' | 'expired' | 'trialing';
          current_period_start?: string;
          current_period_end?: string;
          cancel_at_period_end?: boolean;
          updated_at?: string;
        };
      };
    };
  };
}
