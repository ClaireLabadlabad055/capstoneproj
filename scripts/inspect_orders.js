// Run: node scripts/inspect_orders.js <id|vendorName|--vendorId=UUID>
// Requires: npm install @supabase/supabase-js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qjunanilifxlhiumayjs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YEGpw3G3RRvlj2_O-3BpIA_NMktgyhV';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const arg = process.argv[2];
  if (!arg) {
    console.log('Usage: node scripts/inspect_orders.js <orderId|vendorName|--vendorId=UUID>');
    process.exit(1);
  }

  try {
    if (arg.startsWith('--vendorId=')) {
      const vendorId = arg.split('=')[1];
      console.log('Querying orders whose items JSON contains vendorId:', vendorId);
      // This is a best-effort text search on items JSON
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .ilike('items', `%${vendorId}%`)
        .order('created_at', { ascending: false });
      if (error) console.error('Error:', error);
      console.log('Found:', (data || []).length);
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    if (arg.startsWith('CH-')) {
      const orderId = arg;
      console.log('Querying order by id:', orderId);
      const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
      if (error) console.error('Error:', error);
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    // otherwise treat as vendor name
    const vendorName = arg;
    console.log('Querying orders by vendor_name:', vendorName);
    const { data, error } = await supabase.from('orders').select('*').eq('vendor_name', vendorName).order('created_at', { ascending: false });
    if (error) console.error('Error:', error);
    console.log('Found:', (data || []).length);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Exception:', e);
  }
}

run();
