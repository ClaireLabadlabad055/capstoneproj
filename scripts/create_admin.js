const { createClient } = require('@supabase/supabase-js');

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin User';

  if (!SUPABASE_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Missing env vars. Set SUPABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD (and SUPABASE_SERVICE_ROLE_KEY if available).');
    process.exit(1);
  }

  const key = SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!key) {
    console.error('No SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY available in env.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, key);

  try {
    let user = null;

    if (SUPABASE_SERVICE_ROLE_KEY) {
      // Use admin API to create a user without requiring email confirmation
      const res = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
      });
      console.log('createUser response:', res);
      if (res.error) {
        console.error('createUser error details:', res.error);
        throw res.error;
      }
      user = res.user;
    } else {
      // Fallback: regular sign up (may require email confirmation)
      const { data, error } = await supabase.auth.signUp({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      console.log('signUp response:', { data, error });
      if (error) {
        console.error('signUp error details:', error);
        throw error;
      }
      user = data?.user || null;
    }

    if (!user || !user.id) {
      console.error('No user returned from auth call. Full response objects logged above.');
      throw new Error('Failed to create auth user');
    }

    // Upsert profile with role = 'admin'
    const { error: profileError } = await supabase.from('profiles').upsert([
      { id: user.id, full_name: ADMIN_NAME, role: 'admin', created_at: new Date().toISOString() }
    ]);
    if (profileError) throw profileError;

    // Also ensure customers table has a record for convenience
    const { error: custError } = await supabase.from('customers').upsert([
      { id: user.id, full_name: ADMIN_NAME, email: ADMIN_EMAIL, role: 'admin', created_at: new Date().toISOString() }
    ]);
    if (custError) throw custError;

    console.log('Admin user created/updated successfully:', ADMIN_EMAIL);
  } catch (e) {
    console.error('Error creating admin:', e.message || e);
    process.exit(1);
  }
}

main();
