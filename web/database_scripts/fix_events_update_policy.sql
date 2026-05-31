-- ====================================================================
-- KAMPÜSRADAR - ETKİNLİKLER TABLOSU İÇİN GÜNCELLEME (UPDATE) POLİTİKALARI
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın.
-- ====================================================================

-- 1. Eski UPDATE politikalarını temizle (çakışma olmaması için)
DROP POLICY IF EXISTS "allow_sks_update_events" ON public.events;
DROP POLICY IF EXISTS "allow_organizer_update_events" ON public.events;
DROP POLICY IF EXISTS "allow_update_events" ON public.events;

-- 2. SKS Yetkilileri için UPDATE Politikası oluştur:
-- Sadece 'sks' rolüne sahip olan kullanıcılar kendi üniversitesinin etkinliklerini güncelleyebilir.
CREATE POLICY "allow_sks_update_events"
ON public.events 
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'sks' 
      AND university_id = events.university_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'sks' 
      AND university_id = events.university_id
  )
);

-- 3. Organizatörler için UPDATE Politikası oluştur (örnek: kendi başvurusunu düzenleyebilmesi için):
-- Sadece etkinliği oluşturan organizatör kendi etkinliğini güncelleyebilir.
CREATE POLICY "allow_organizer_update_events"
ON public.events 
FOR UPDATE
TO authenticated
USING (
  auth.uid() = organizer_id
)
WITH CHECK (
  auth.uid() = organizer_id
);

-- Kontrol: Tablo üzerindeki tüm politikaları listele
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'events' AND schemaname = 'public';
