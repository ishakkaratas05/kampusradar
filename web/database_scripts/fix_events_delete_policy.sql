-- ====================================================================
-- KAMPÜSRADAR - ETKİNLİKLER TABLOSU İÇİN SİLME (DELETE) POLİTİKASI
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın.
-- ====================================================================

-- 1. Events tablosu için DELETE politikasını temizle (çakışma olmasın diye)
DROP POLICY IF EXISTS "allow_organizer_delete_events" ON public.events;

-- 2. Yeni DELETE politikasını oluştur:
-- Sadece giriş yapmış kullanıcılar (authenticated) silebilir.
-- Kullanıcının ID'si, etkinliğin organizer_id'sine eşit olmalıdır.
CREATE POLICY "allow_organizer_delete_events"
ON public.events 
FOR DELETE
TO authenticated
USING (auth.uid() = organizer_id);

-- Kontrol: Oluşan politikayı listele
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'events' AND schemaname = 'public';
