import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://qjunanilifxlhiumayjs.supabase.co';
const supabaseKey = 'sb_publishable_YEGpw3G3RRvlj2_O-3BpIA_NMktgyhV';

export const supabase = createClient(supabaseUrl, supabaseKey);
export const auth = supabase.auth;
export const db = supabase;

export default supabase;