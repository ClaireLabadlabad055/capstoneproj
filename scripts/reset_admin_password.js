const { createClient } = require('@supabase/supabase-js');

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const NEW_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ADMIN_EMAIL || !NEW_PASSWORD) {
    console.error('Missing env vars. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // List users and find by email
    const listRes = await supabase.auth.admin.listUsers({ limit: 1000 });
    console.log('listUsers response status:', listRes?.error ? 'error' : 'ok');
    if (listRes.error) throw listRes.error;

    const users = (listRes.data && listRes.data.users) || [];
    const user = users.find(u => u.email === ADMIN_EMAIL);
    if (!user) {
      console.error('Admin user not found for email:', ADMIN_EMAIL);
      process.exit(1);
    }

    console.log('Found user id:', user.id);

    // Update password
    const updateRes = await supabase.auth.admin.updateUserById(user.id, { password: NEW_PASSWORD });
    // Log full response for debugging
    try {
      console.log('updateUserById full response:', JSON.stringify(updateRes, null, 2));
    } catch (e) {
      console.log('updateUserById response (raw):', updateRes);
    }
    if (updateRes.error) {
      console.error('updateUserById error details:', updateRes.error);
      throw updateRes.error;
    }

    console.log('Password updated successfully for', ADMIN_EMAIL);
  } catch (e) {
    console.error('Error resetting admin password:', e.message || e);
    process.exit(1);
  }
}

main();
