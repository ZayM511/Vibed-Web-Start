/**
 * Supabase Database Types
 * Auto-generated types for the JobFiltr Supabase schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_tiers: {
        Row: {
          user_id: string;
          tier: "free" | "pro";
          stripe_customer_id: string | null;
          subscription_status: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          tier?: "free" | "pro";
          stripe_customer_id?: string | null;
          subscription_status?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          tier?: "free" | "pro";
          stripe_customer_id?: string | null;
          subscription_status?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      community_blocklist: {
        Row: {
          id: string;
          company_name: string;
          company_name_normalized: string;
          category: "staffing" | "scam" | "ghost_poster";
          verified: boolean;
          submitted_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_name: string;
          company_name_normalized: string;
          category: "staffing" | "scam" | "ghost_poster";
          verified?: boolean;
          submitted_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_name?: string;
          company_name_normalized?: string;
          category?: "staffing" | "scam" | "ghost_poster";
          verified?: boolean;
          submitted_count?: number;
          created_at?: string;
        };
      };
      user_settings: {
        Row: {
          user_id: string;
          hide_ghost_jobs: boolean;
          hide_staffing_firms: boolean;
          require_true_remote: boolean;
          ghost_job_days_threshold: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          hide_ghost_jobs?: boolean;
          hide_staffing_firms?: boolean;
          require_true_remote?: boolean;
          ghost_job_days_threshold?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          hide_ghost_jobs?: boolean;
          hide_staffing_firms?: boolean;
          require_true_remote?: boolean;
          ghost_job_days_threshold?: number;
          updated_at?: string;
        };
      };
      user_include_keywords: {
        Row: {
          id: string;
          user_id: string;
          keyword: string;
          match_mode: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          keyword: string;
          match_mode?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          keyword?: string;
          match_mode?: string;
          created_at?: string;
        };
      };
      user_exclude_keywords: {
        Row: {
          id: string;
          user_id: string;
          keyword: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          keyword: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          keyword?: string;
          created_at?: string;
        };
      };
      user_exclude_companies: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          company_name_normalized: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          company_name_normalized: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          company_name_normalized?: string;
          created_at?: string;
        };
      };
      saved_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          filter_config: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          filter_config: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          filter_config?: Json;
          created_at?: string;
        };
      };
      job_analysis_usage: {
        Row: {
          id: string;
          user_id: string;
          month_year: string;
          analysis_count: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          month_year: string;
          analysis_count?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          month_year?: string;
          analysis_count?: number;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_pro_access: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      get_analysis_count: {
        Args: { p_user_id: string };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type UserTier = Database["public"]["Tables"]["user_tiers"]["Row"];
export type CommunityBlocklist = Database["public"]["Tables"]["community_blocklist"]["Row"];
export type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];
export type UserIncludeKeyword = Database["public"]["Tables"]["user_include_keywords"]["Row"];
export type UserExcludeKeyword = Database["public"]["Tables"]["user_exclude_keywords"]["Row"];
export type UserExcludeCompany = Database["public"]["Tables"]["user_exclude_companies"]["Row"];
export type SavedTemplate = Database["public"]["Tables"]["saved_templates"]["Row"];
export type JobAnalysisUsage = Database["public"]["Tables"]["job_analysis_usage"]["Row"];
