import type { FilterSettings, SavedTemplate } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { hybridStorage } from '@/storage/hybridStorage';
import { generateId } from '@/lib/utils';

class SavedTemplatesService {
  /**
   * Get all saved templates for current user
   */
  async getTemplates(): Promise<SavedTemplate[]> {
    // Check Pro status first
    const { isPro } = await hybridStorage.getProStatus();
    if (!isPro) return [];

    // Try Supabase first
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return this.getLocalTemplates();

        const { data, error } = await supabase
          .from('saved_templates')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        return data.map(t => ({
          id: t.id,
          userId: t.user_id,
          name: t.name,
          config: t.filter_config as FilterSettings,
          createdAt: new Date(t.created_at),
          updatedAt: new Date(t.updated_at)
        }));
      } catch (error) {
        console.error('[JobFiltr] Failed to fetch templates:', error);
        return this.getLocalTemplates();
      }
    }

    return this.getLocalTemplates();
  }

  /**
   * Get templates from local storage (fallback)
   */
  private async getLocalTemplates(): Promise<SavedTemplate[]> {
    const stored = await chrome.storage.local.get('savedTemplates');
    return stored.savedTemplates || [];
  }

  /**
   * Save current filter settings as a template
   */
  async saveTemplate(name: string): Promise<SavedTemplate> {
    // Check Pro status
    const { isPro } = await hybridStorage.getProStatus();
    if (!isPro) throw new Error('Pro subscription required to save templates');

    // Get current settings
    const config = await hybridStorage.getSettings();

    const template: SavedTemplate = {
      id: generateId(),
      userId: '',
      name,
      config,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to Supabase if available
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          template.userId = user.id;

          const { data, error } = await supabase
            .from('saved_templates')
            .insert({
              user_id: user.id,
              name,
              filter_config: config
            })
            .select()
            .single();

          if (error) throw error;
          template.id = data.id;
        }
      } catch (error) {
        console.error('[JobFiltr] Failed to save template to Supabase:', error);
      }
    }

    // Also save locally
    const local = await this.getLocalTemplates();
    await chrome.storage.local.set({ savedTemplates: [template, ...local] });

    return template;
  }

  /**
   * Load a template (apply its settings)
   */
  async loadTemplate(id: string): Promise<void> {
    const templates = await this.getTemplates();
    const template = templates.find(t => t.id === id);

    if (!template) throw new Error('Template not found');

    // Apply the template's config
    await hybridStorage.updateSettings(template.config);

    // Notify content script to refresh
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_UPDATED' });
      }
    });
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    // Delete from Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('saved_templates')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);
        }
      } catch (error) {
        console.error('[JobFiltr] Failed to delete template from Supabase:', error);
      }
    }

    // Delete from local storage
    const local = await this.getLocalTemplates();
    await chrome.storage.local.set({
      savedTemplates: local.filter(t => t.id !== id)
    });
  }

  /**
   * Update template name
   */
  async renameTemplate(id: string, newName: string): Promise<void> {
    // Update in Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('saved_templates')
            .update({ name: newName, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', user.id);
        }
      } catch (error) {
        console.error('[JobFiltr] Failed to rename template:', error);
      }
    }

    // Update local
    const local = await this.getLocalTemplates();
    const updated = local.map(t =>
      t.id === id ? { ...t, name: newName, updatedAt: new Date() } : t
    );
    await chrome.storage.local.set({ savedTemplates: updated });
  }

  /**
   * Update template config with current settings
   */
  async updateTemplateConfig(id: string): Promise<void> {
    const { isPro } = await hybridStorage.getProStatus();
    if (!isPro) throw new Error('Pro subscription required');

    const config = await hybridStorage.getSettings();

    // Update in Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('saved_templates')
            .update({
              filter_config: config,
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', user.id);
        }
      } catch (error) {
        console.error('[JobFiltr] Failed to update template config:', error);
      }
    }

    // Update local
    const local = await this.getLocalTemplates();
    const updated = local.map(t =>
      t.id === id ? { ...t, config, updatedAt: new Date() } : t
    );
    await chrome.storage.local.set({ savedTemplates: updated });
  }
}

export const savedTemplates = new SavedTemplatesService();
