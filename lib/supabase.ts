import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabase client for the Next.js web application
 * Uses environment variables for configuration
 */
export const supabase: SupabaseClient<Database> | null =
  supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

/**
 * Check if Supabase is properly configured
 */
export const isSupabaseConfigured = !!supabase;

/**
 * Get the Supabase client with type assertion (throws if not configured)
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
    );
  }
  return supabase;
}

/**
 * Helper to get the community blocklist
 */
export async function getCommunityBlocklist() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("community_blocklist")
    .select("*")
    .eq("verified", true);

  if (error) {
    console.error("Error fetching community blocklist:", error);
    return [];
  }
  return data ?? [];
}

/**
 * Helper to get user settings
 */
export async function getUserSettings(userId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching user settings:", error);
    return null;
  }
  return data;
}

/**
 * Helper to check if user has pro access
 */
export async function checkProAccess(userId: string): Promise<boolean> {
  if (!supabase) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("check_pro_access", {
    p_user_id: userId,
  });

  if (error) {
    console.error("Error checking pro access:", error);
    return false;
  }
  return data ?? false;
}
