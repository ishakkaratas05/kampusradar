import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vwtzkppabmkncbsthgdw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dHprcHBhYm1rbmNic3RoZ2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NDg0NDksImV4cCI6MjA5MzQyNDQ0OX0.QKNxxw8jW6hsdGpq-XjrlBZ-Mf6cSr5oCjOBVLUZByg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log("Checking universities table...");
  const { data: unis, error: uniError } = await supabase
    .from('universities')
    .select('*');
  
  if (uniError) {
    console.error("Error fetching universities:", uniError);
  } else {
    console.log("Universities found:", unis.length);
    unis.forEach(u => console.log(`- ${u.id}: ${u.name} (${u.abbreviation})`));
  }

  console.log("\nChecking events table...");
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('*')
    .limit(1);

  if (eventError) {
    console.error("Error fetching events:", eventError);
    console.log("Maybe schema doesn't have events table or it's different name?");
  } else {
    console.log("Events table exists. First record/columns structure:");
    console.log(events);
  }
}

check();
