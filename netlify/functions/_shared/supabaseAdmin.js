const { createClient } = require('@supabase/supabase-js');

let client = null;

function getSupabaseAdmin() {
  if (client) return client;

  const url = process.env.SUPABASE_URL || process.env.SUPABASE2_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY2;

  if (!url || !key) {
    throw new Error('Faltan variables de entorno SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en Netlify.');
  }

  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

module.exports = { getSupabaseAdmin };
