import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zkafxqqwjeuiaypfntss.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprYWZ4cXF3amV1aWF5cGZudHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNzM1MDEsImV4cCI6MjA4Mzc0OTUwMX0.pu25yTlaU0y9TKEP-axSs5_FdqhMSHyUAb48pgeuUTc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
