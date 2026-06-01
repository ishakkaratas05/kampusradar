import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vwtzkppabmkncbsthgdw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dHprcHBhYm1rbmNic3RoZ2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NDg0NDksImV4cCI6MjA5MzQyNDQ0OX0.QKNxxw8jW6hsdGpq-XjrlBZ-Mf6cSr5oCjOBVLUZByg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  console.log("Checking columns of event_participants using RPC or an insert attempt...");
  
  // Try inserting a dummy row to see the exact error
  const { data, error } = await supabase
    .from('event_participants')
    .insert({ event_id: '00000000-0000-0000-0000-000000000000', student_id: '00000000-0000-0000-0000-000000000000', status: 'pending' })
    .select();

  console.log("Insert result:", { data, error });
}

checkSchema();
