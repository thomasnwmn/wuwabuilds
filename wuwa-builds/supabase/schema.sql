-- ==============================================================================
-- 1. DICTIONARY TABLES (The Master Lists)
-- These tables act as the central "source of truth" for items in the game.
-- ==============================================================================

CREATE TABLE resonators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  element TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE weapons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  rarity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE echoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  cost TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 2. RECORD TABLES (The Actual Builds)
-- These tables store the user-generated builds and point to the dictionaries.
-- ==============================================================================

CREATE TABLE builds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Foreign Keys linking this build to the dictionaries:
  resonator_id UUID REFERENCES resonators(id) ON DELETE RESTRICT,
  weapon_id UUID REFERENCES weapons(id) ON DELETE RESTRICT,
  
  -- We'll store builder details here for now. In a massive scale app, 
  -- this would link to a `profiles` table.
  builder_id UUID, -- We will link this to auth.users later if needed
  builder_name TEXT NOT NULL,
  builder_initials TEXT NOT NULL,
  
  role TEXT NOT NULL,
  level TEXT NOT NULL,
  rank TEXT NOT NULL,
  headline TEXT,
  description TEXT,
  score NUMERIC,
  echo_set TEXT NOT NULL,
  notes TEXT[], -- Array of text strings
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE build_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  build_id UUID REFERENCES builds(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE build_echoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  build_id UUID REFERENCES builds(id) ON DELETE CASCADE,
  echo_id UUID REFERENCES echoes(id) ON DELETE RESTRICT,
  echo_set TEXT NOT NULL,
  main_stat TEXT NOT NULL,
  substats JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- ==============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- The "Bouncer" that protects your data from unauthorized edits.
-- ==============================================================================

-- First, tell Postgres to turn on the security checkpoint for all tables.
ALTER TABLE resonators ENABLE ROW LEVEL SECURITY;
ALTER TABLE weapons ENABLE ROW LEVEL SECURITY;
ALTER TABLE echoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_echoes ENABLE ROW LEVEL SECURITY;

-- Rule 1: "Public Read" - ANYONE visiting the website can view (SELECT) the data.
CREATE POLICY "Allow public read access" ON resonators FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON weapons FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON echoes FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON builds FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON build_stats FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON build_echoes FOR SELECT USING (true);

-- Rule 2: "Admin Write" - ONLY logged in users (authenticated) can add/edit/delete.
CREATE POLICY "Allow authenticated write access" ON resonators FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated write access" ON weapons FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated write access" ON echoes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated write access" ON builds FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated write access" ON build_stats FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated write access" ON build_echoes FOR ALL USING (auth.role() = 'authenticated');
