// Supabase sync for Pro users
import { supabase } from '../lib/supabase';
import type { FilterSettings } from '../types';

export async function syncToCloud(userId: string, settings: FilterSettings): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      settings,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[JobFiltr] Failed to sync settings:', error);
    throw error;
  }
}

export async function fetchFromCloud(userId: string): Promise<FilterSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('settings')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('[JobFiltr] Failed to fetch settings:', error);
    return null;
  }

  return data?.settings || null;
}

export async function syncBlocklist(userId: string, companies: string[]): Promise<void> {
  const { error } = await supabase
    .from('user_blocklist')
    .upsert({
      user_id: userId,
      companies,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[JobFiltr] Failed to sync blocklist:', error);
    throw error;
  }
}
