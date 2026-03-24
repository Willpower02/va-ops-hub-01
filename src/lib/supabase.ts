import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = 'https://mzmpsolbsbugidugyaje.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16bXBzb2xic2J1Z2lkdWd5YWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2Nzk4MjQsImV4cCI6MjA4OTI1NTgyNH0.2zK-F2GJEGUXwAlCsuPaSeQebFqzYbsHCw9PC090eDU';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
