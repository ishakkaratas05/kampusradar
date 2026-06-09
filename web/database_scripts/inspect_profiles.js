import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vwtzkppabmkncbsthgdw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dHprcHBhYm1rbmNic3RoZ2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NDg0NDksImV4cCI6MjA5MzQyNDQ0OX0.QKNxxw8jW6hsdGpq-XjrlBZ-Mf6cSr5oCjOBVLUZByg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  const { data, error } = await supabase.from('profiles').select('email, role, is_approved').order('created_at', { ascending: false }).limit(5);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Latest profiles:", data);
  }
}

inspect();
