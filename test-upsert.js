const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/mobile/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://192.168.0.19:54321';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpsert() {
  console.log("URL:", supabaseUrl);
}
testUpsert();
