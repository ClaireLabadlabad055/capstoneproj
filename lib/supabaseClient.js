import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import storage from './storage';

const supabaseUrl = 'https://qjunanilifxlhiumayjs.supabase.co';
const supabaseKey = 'sb_publishable_YEGpw3G3RRvlj2_O-3BpIA_NMktgyhV';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage,
    detectSessionInUrl: false,
  },
});