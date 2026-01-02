// Saved filter templates (Pro)
import type { FilterSettings } from '../types';

export interface FilterTemplate {
  id: string;
  name: string;
  description?: string;
  settings: Partial<FilterSettings>;
  createdAt: string;
  updatedAt: string;
}

const TEMPLATES_KEY = 'jobfiltr_templates';

export function getTemplates(): FilterTemplate[] {
  const raw = localStorage.getItem(TEMPLATES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveTemplate(template: Omit<FilterTemplate, 'id' | 'createdAt' | 'updatedAt'>): FilterTemplate {
  const templates = getTemplates();
  const now = new Date().toISOString();

  const newTemplate: FilterTemplate = {
    ...template,
    id: `template_${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };

  templates.push(newTemplate);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));

  return newTemplate;
}

export function updateTemplate(id: string, updates: Partial<FilterTemplate>): FilterTemplate | null {
  const templates = getTemplates();
  const index = templates.findIndex((t) => t.id === id);

  if (index === -1) return null;

  templates[index] = {
    ...templates[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  return templates[index];
}

export function deleteTemplate(id: string): boolean {
  const templates = getTemplates();
  const filtered = templates.filter((t) => t.id !== id);

  if (filtered.length === templates.length) return false;

  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
  return true;
}

export function applyTemplate(template: FilterTemplate): Partial<FilterSettings> {
  return template.settings;
}
