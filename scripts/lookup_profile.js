const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = 'https://qjunanilifxlhiumayjs.supabase.co';
const SUPA_KEY = 'sb_publishable_YEGpw3G3RRvlj2_O-3BpIA_NMktgyhV';

const supabase = createClient(SUPA_URL, SUPA_KEY);

const id = process.argv[2];
if (!id) {
  console.error('Usage: node lookup_profile.js <id>');
  process.exit(1);
}

(async () => {
  try {
    const [{ data: profiles, error: pErr }, { data: customers, error: cErr }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id),
      supabase.from('customers').select('*').eq('id', id),
    ]);

    if (pErr) console.error('profiles error', pErr);
    if (cErr) console.error('customers error', cErr);

    console.log('profiles:', JSON.stringify(profiles, null, 2));
    console.log('customers:', JSON.stringify(customers, null, 2));
  } catch (e) {
    console.error('Exception:', e);
  }
})();
