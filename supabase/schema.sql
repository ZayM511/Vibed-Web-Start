-- =====================================================
-- JobFiltr Supabase Schema
-- Execute this in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- User Tiers Table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_tiers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  stripe_customer_id TEXT,
  subscription_status TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Community Blocklist Table (Staffing firms, scams, ghost posters)
-- =====================================================
CREATE TABLE IF NOT EXISTS community_blocklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  company_name_normalized TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('staffing', 'scam', 'ghost_poster')),
  verified BOOLEAN DEFAULT false,
  submitted_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocklist_normalized ON community_blocklist(company_name_normalized);
CREATE INDEX IF NOT EXISTS idx_blocklist_category ON community_blocklist(category);
CREATE INDEX IF NOT EXISTS idx_blocklist_verified ON community_blocklist(verified);

-- =====================================================
-- User Settings Table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hide_ghost_jobs BOOLEAN DEFAULT true,
  hide_staffing_firms BOOLEAN DEFAULT true,
  require_true_remote BOOLEAN DEFAULT false,
  ghost_job_days_threshold INTEGER DEFAULT 30,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- User Include Keywords (Pro only)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_include_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  match_mode TEXT DEFAULT 'any',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_include_keywords_user ON user_include_keywords(user_id);

-- =====================================================
-- User Exclude Keywords
-- =====================================================
CREATE TABLE IF NOT EXISTS user_exclude_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_exclude_keywords_user ON user_exclude_keywords(user_id);

-- =====================================================
-- User Exclude Companies
-- =====================================================
CREATE TABLE IF NOT EXISTS user_exclude_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_name_normalized TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exclude_companies_user ON user_exclude_companies(user_id);

-- =====================================================
-- Saved Templates (Pro only)
-- =====================================================
CREATE TABLE IF NOT EXISTS saved_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filter_config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_templates_user ON saved_templates(user_id);

-- =====================================================
-- Job Analysis Usage (for rate limiting free tier)
-- =====================================================
CREATE TABLE IF NOT EXISTS job_analysis_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year VARCHAR(7) NOT NULL,
  analysis_count INTEGER DEFAULT 0,
  UNIQUE(user_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_analysis_usage_user_month ON job_analysis_usage(user_id, month_year);

-- =====================================================
-- Functions
-- =====================================================

-- Check if user has pro access
CREATE OR REPLACE FUNCTION check_pro_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tiers
    WHERE user_id = p_user_id
    AND tier = 'pro'
    AND (subscription_status = 'active' OR current_period_end > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get analysis count for current month
CREATE OR REPLACE FUNCTION get_analysis_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_month VARCHAR(7);
  count_val INTEGER;
BEGIN
  current_month := TO_CHAR(NOW(), 'YYYY-MM');
  SELECT analysis_count INTO count_val
  FROM job_analysis_usage
  WHERE user_id = p_user_id AND month_year = current_month;
  RETURN COALESCE(count_val, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment analysis count
CREATE OR REPLACE FUNCTION increment_analysis_count(p_user_id UUID, p_month_year VARCHAR(7))
RETURNS VOID AS $$
BEGIN
  INSERT INTO job_analysis_usage (user_id, month_year, analysis_count)
  VALUES (p_user_id, p_month_year, 1)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET analysis_count = job_analysis_usage.analysis_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all user tables
ALTER TABLE user_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_include_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_exclude_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_exclude_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_analysis_usage ENABLE ROW LEVEL SECURITY;

-- User tiers policies
CREATE POLICY "Users can view own tier" ON user_tiers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own tier" ON user_tiers
  FOR UPDATE USING (auth.uid() = user_id);

-- User settings policies
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Include keywords policies
CREATE POLICY "Users can manage own include keywords" ON user_include_keywords
  FOR ALL USING (auth.uid() = user_id);

-- Exclude keywords policies
CREATE POLICY "Users can manage own exclude keywords" ON user_exclude_keywords
  FOR ALL USING (auth.uid() = user_id);

-- Exclude companies policies
CREATE POLICY "Users can manage own exclude companies" ON user_exclude_companies
  FOR ALL USING (auth.uid() = user_id);

-- Saved templates policies
CREATE POLICY "Users can manage own templates" ON saved_templates
  FOR ALL USING (auth.uid() = user_id);

-- Job analysis usage policies
CREATE POLICY "Users can view own usage" ON job_analysis_usage
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage" ON job_analysis_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own usage" ON job_analysis_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- Community blocklist - public read access
CREATE POLICY "Anyone can read verified blocklist" ON community_blocklist
  FOR SELECT USING (true);

-- =====================================================
-- Seed Data: 50+ Staffing Firms
-- =====================================================
INSERT INTO community_blocklist (company_name, company_name_normalized, category, verified) VALUES
  ('Robert Half', 'robert half', 'staffing', true),
  ('Randstad', 'randstad', 'staffing', true),
  ('Kelly Services', 'kelly services', 'staffing', true),
  ('Manpower', 'manpower', 'staffing', true),
  ('Adecco', 'adecco', 'staffing', true),
  ('Aerotek', 'aerotek', 'staffing', true),
  ('Insight Global', 'insight global', 'staffing', true),
  ('TEKsystems', 'teksystems', 'staffing', true),
  ('Apex Systems', 'apex systems', 'staffing', true),
  ('Kforce', 'kforce', 'staffing', true),
  ('CyberCoders', 'cybercoders', 'staffing', true),
  ('Jobot', 'jobot', 'staffing', true),
  ('Hays', 'hays', 'staffing', true),
  ('Actalent', 'actalent', 'staffing', true),
  ('Collabera', 'collabera', 'staffing', true),
  ('Modis', 'modis', 'staffing', true),
  ('Aquent', 'aquent', 'staffing', true),
  ('Creative Circle', 'creative circle', 'staffing', true),
  ('Mondo', 'mondo', 'staffing', true),
  ('Motion Recruitment', 'motion recruitment', 'staffing', true),
  ('Vaco', 'vaco', 'staffing', true),
  ('Addison Group', 'addison group', 'staffing', true),
  ('Judge Group', 'judge group', 'staffing', true),
  ('Beacon Hill', 'beacon hill', 'staffing', true),
  ('Experis', 'experis', 'staffing', true),
  ('Harvey Nash', 'harvey nash', 'staffing', true),
  ('Nigel Frank', 'nigel frank', 'staffing', true),
  ('Frank Recruitment', 'frank recruitment', 'staffing', true),
  ('Jefferson Frank', 'jefferson frank', 'staffing', true),
  ('Mason Frank', 'mason frank', 'staffing', true),
  ('Washington Frank', 'washington frank', 'staffing', true),
  ('Oxford Global', 'oxford global', 'staffing', true),
  ('Procom', 'procom', 'staffing', true),
  ('SThree', 'sthree', 'staffing', true),
  ('Huxley', 'huxley', 'staffing', true),
  ('Real Staffing', 'real staffing', 'staffing', true),
  ('Progressive', 'progressive', 'staffing', true),
  ('Akkodis', 'akkodis', 'staffing', true),
  ('Genesis10', 'genesis10', 'staffing', true),
  ('Brooksource', 'brooksource', 'staffing', true),
  ('Mastech Digital', 'mastech digital', 'staffing', true),
  ('TechSystems', 'techsystems', 'staffing', true),
  ('Robert Walters', 'robert walters', 'staffing', true),
  ('Spencer Ogden', 'spencer ogden', 'staffing', true),
  ('Michael Page', 'michael page', 'staffing', true),
  ('Page Personnel', 'page personnel', 'staffing', true),
  ('PageGroup', 'pagegroup', 'staffing', true),
  ('Talascend', 'talascend', 'staffing', true),
  ('LanceSoft', 'lancesoft', 'staffing', true),
  ('Diverse Lynx', 'diverse lynx', 'staffing', true)
ON CONFLICT (company_name_normalized) DO NOTHING;
