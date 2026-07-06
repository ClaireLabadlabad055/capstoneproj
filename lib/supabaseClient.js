import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://qjunanilifxlhiumayjs.supabase.co';
const supabaseKey = 'sb_publishable_YEGpw3G3RRvlj2_O-3BpIA_NMktgyhV';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true, // This MUST be true
    autoRefreshToken: true,
  },
});