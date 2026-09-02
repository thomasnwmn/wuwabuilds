import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log("Starting database migration for build_echoes substats...");

  // 1. Add the new JSONB column
  console.log("Adding substats JSONB column...");
  // Using postgres function or direct query isn't directly available via supabase-js without an RPC, 
  // so we will have to use the REST API to fetch data, and then we might need to manually run the SQL via Supabase dashboard.
  // Wait, I can execute arbitrary SQL if I have postgres connection, but I only have supabase REST API.
  // We can't ALTER TABLE via supabase-js REST client.
  console.log("WARNING: Cannot run ALTER TABLE via supabase-js. We will add a temporary workaround or you need to run this SQL in Supabase SQL Editor:");
  console.log(`
    ALTER TABLE build_echoes ADD COLUMN substats JSONB DEFAULT '[]'::jsonb;
    
    -- Migrate existing data (this assumes existing substat is just a string we map to a 'value' with an unknown label)
    UPDATE build_echoes SET substats = jsonb_build_array(
      jsonb_build_object('label', 'Unknown', 'value', substat)
    ) WHERE substat IS NOT NULL AND substat != '';

    -- Drop old column
    ALTER TABLE build_echoes DROP COLUMN substat;
  `);
}

migrate();
