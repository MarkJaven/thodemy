const { createClient } = require("@supabase/supabase-js");
const { env } = require("./env");

const supabaseAdmin = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

module.exports = { supabaseAdmin };
