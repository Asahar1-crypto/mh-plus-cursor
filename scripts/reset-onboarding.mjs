#!/usr/bin/env node
/**
 * איפוס אונבורדינג למשתמש – מאפשר לבדוק שוב את תהליך האונבורדינג
 * 
 * שימוש:
 *   node scripts/reset-onboarding.mjs <user_email>
 *   node scripts/reset-onboarding.mjs <user_id>
 * 
 * דרוש: SUPABASE_SERVICE_KEY או SUPABASE_SERVICE_ROLE_KEY ב-.env.local
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load env
for (const f of ['.env.local', '.env']) {
  if (existsSync(join(process.cwd(), f))) {
    const c = readFileSync(join(process.cwd(), f), 'utf8');
    c.split('\n').forEach((l) => {
      const m = l.match(/^([^=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    });
    break;
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://hchmfsilgfrzhenafbzi.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!KEY) {
  console.error('❌ חסר SUPABASE_SERVICE_KEY או SUPABASE_SERVICE_ROLE_KEY ב-.env.local');
  process.exit(1);
}

const identifier = process.argv[2];
if (!identifier) {
  console.error('שימוש: node scripts/reset-onboarding.mjs <email או user_id>');
  process.exit(1);
}

async function main() {
  const url = `${SUPABASE_URL}/rest/v1`;
  const headers = {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
  };

  // Find user by email or id
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
  
  let userId;
  if (isUuid) {
    userId = identifier;
  } else {
    // Search by email in auth.users (Supabase REST doesn't expose auth.users directly)
    // We need to use profiles - search by email via a view or auth
    // profiles table has id = auth.uid, we can search profiles... but profiles don't have email
    // auth.users has email - we need service role to query it
    // Alternative: use supabase admin API
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
    
    const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const user = data?.users?.find(u => 
      u.email?.toLowerCase() === identifier.toLowerCase() || u.id === identifier
    );
    if (!user) {
      console.error('❌ משתמש לא נמצא:', identifier);
      process.exit(1);
    }
    userId = user.id;
    console.log('📧 נמצא משתמש:', user.email || user.id);
  }

  const res = await fetch(`${url}/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({ onboarding_completed: false }),
  });

  if (!res.ok) {
    console.error('❌ שגיאה:', await res.text());
    process.exit(1);
  }

  const data = await res.json();
  if (data && data.length > 0) {
    console.log('✅ אונבורדינג אופס בהצלחה עבור:', data[0].name || userId);
    console.log('\n📋 כעת התחבר למערכת – חלון האונבורדינג יופיע שוב.');
  } else {
    console.log('✅ הבקשה בוצעה. ייתכן שהפרופיל לא קיים – נסה להתחבר ולראות.');
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
