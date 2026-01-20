/**
 * Tests to verify the comprehensive app fixes
 * These tests ensure the critical issues identified and fixed are working correctly
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Get the actual project root directory
const ROOT_DIR = path.resolve(__dirname, '../..');

describe('Comprehensive App Fixes Verification', () => {

  describe('React Hooks Fix - Conditional useQuery', () => {
    it('should use "skip" argument instead of conditional hook call in extension-errors page', () => {
      const filePath = path.join(ROOT_DIR, 'app/(protected)/extension-errors/page.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Should NOT have conditional hook call pattern
      expect(content).not.toContain('selectedError\n    ? useQuery');
      expect(content).not.toMatch(/selectedError\s*\?\s*useQuery/);

      // Should have the correct "skip" pattern
      expect(content).toContain('selectedError ? { id: selectedError } : "skip"');
    });

    it('should use "skip" argument instead of conditional hook call in ExtensionErrorsTab', () => {
      const filePath = path.join(ROOT_DIR, 'components/admin/ExtensionErrorsTab.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Should NOT have conditional hook call pattern
      expect(content).not.toContain('selectedError\n    ? useQuery');
      expect(content).not.toMatch(/selectedError\s*\?\s*useQuery/);

      // Should have the correct "skip" pattern
      expect(content).toContain('selectedError ? { id: selectedError } : "skip"');
    });
  });

  describe('Middleware Route Protection', () => {
    it('should protect all critical routes', () => {
      const filePath = path.join(ROOT_DIR, 'middleware.ts');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check all required protected routes are included
      const requiredRoutes = [
        '/server',
        '/dashboard',
        '/admin',
        '/billing',
        '/scan',
        '/scanner',
        '/extension-errors',
      ];

      requiredRoutes.forEach(route => {
        expect(content).toContain(`"${route}"`);
      });
    });

    it('should use createRouteMatcher with an array of protected routes', () => {
      const filePath = path.join(ROOT_DIR, 'middleware.ts');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).toContain('createRouteMatcher([');
      expect(content).toContain('isProtectedRoute(req)');
      expect(content).toContain('auth.protect()');
    });
  });

  describe('Unused Imports/Variables Fixed', () => {
    it('should not have unused lucide-react imports in extension-errors page', () => {
      const filePath = path.join(ROOT_DIR, 'app/(protected)/extension-errors/page.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      // These should be removed
      expect(content).not.toContain('Filter,');
      expect(content).not.toContain('User,');
      expect(content).not.toContain('ChevronDown,');
      expect(content).not.toContain('ChevronRight,');
    });

    it('should not have unused Activity import in ExtensionErrorsTab', () => {
      const filePath = path.join(ROOT_DIR, 'components/admin/ExtensionErrorsTab.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).not.toContain('Activity,');
    });

    it('should not have unused AlertCircle import in error-notifications', () => {
      const filePath = path.join(ROOT_DIR, 'components/error-notifications.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).not.toContain('AlertCircle');
    });

    it('should not have unused useState for expanded in ErrorCard', () => {
      const filePath = path.join(ROOT_DIR, 'app/(protected)/extension-errors/page.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      // The ErrorCard function should not have unused expanded state
      const errorCardMatch = content.match(/function ErrorCard[\s\S]*?return \(/);
      if (errorCardMatch) {
        expect(errorCardMatch[0]).not.toContain('const [expanded, setExpanded]');
      }
    });
  });

  describe('Environment Configuration', () => {
    it('should have required Convex environment variables', () => {
      const envPath = path.join(ROOT_DIR, '.env.local');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');

        expect(content).toContain('NEXT_PUBLIC_CONVEX_URL');
        expect(content).toContain('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
      }
    });
  });

  describe('File Structure Integrity', () => {
    it('should have all required component files', () => {
      const requiredFiles = [
        'app/(protected)/extension-errors/page.tsx',
        'components/admin/ExtensionErrorsTab.tsx',
        'components/error-notifications.tsx',
        'components/dashboard/DocumentManagement.tsx',
        'middleware.ts',
        'app/layout.tsx',
        'components/ConvexClientProvider.tsx',
      ];

      requiredFiles.forEach(file => {
        const filePath = path.join(ROOT_DIR, file);
        expect(fs.existsSync(filePath), `File ${file} should exist`).toBe(true);
      });
    });

    it('should have valid Convex schema', () => {
      const schemaPath = path.join(ROOT_DIR, 'convex/schema.ts');
      const content = fs.readFileSync(schemaPath, 'utf-8');

      expect(content).toContain('defineSchema');
      expect(content).toContain('defineTable');
      expect(content).toContain('extensionErrors');
    });
  });
});
