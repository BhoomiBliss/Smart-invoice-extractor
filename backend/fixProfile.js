require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function fixProfile() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("Missing Supabase credentials in .env");
    return;
  }
  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: '95f463d9-68fa-45bb-8394-c5021727d70b', email: 'test@example.com' }, { onConflict: 'id' });
  
  if (error) {
    console.error("Failed to insert profile:", error.message);
  } else {
    console.log("Successfully inserted test profile");
  }
}
fixProfile();
