import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://vwtzkppabmkncbsthgdw.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dHprcHBhYm1rbmNic3RoZ2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NDg0NDksImV4cCI6MjA5MzQyNDQ0OX0.QKNxxw8jW6hsdGpq-XjrlBZ-Mf6cSr5oCjOBVLUZByg";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUniversities() {
  const { data, error } = await supabase
    .from('universities')
    .select('*');

  if (error) {
    console.error("HATA ALINDI:", error.message);
  } else {
    console.log("GELEN VERİ SAYISI:", data ? data.length : 0);
    console.log("GELEN VERİ:", data);
  }
}

checkUniversities();
