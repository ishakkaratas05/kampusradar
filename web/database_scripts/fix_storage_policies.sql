-- ====================================================================
-- KAMPÜSRADAR - SUPABASE STORAGE POLİTİKALARI (public-assets bucket)
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın.
-- ====================================================================

-- 1. Bucket'ın var olduğundan ve public olduğundan emin ol
UPDATE storage.buckets 
SET public = true 
WHERE id = 'public-assets';

-- Eğer bucket yoksa oluştur (varsa hata vermez)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets', 
  'public-assets', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Mevcut politikaları temizle (çakışma olmasın)
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_read" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_delete" ON storage.objects;

-- 3. HERKES okuyabilir (public bucket)
CREATE POLICY "allow_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'public-assets');

-- 4. GİRİŞ YAPMIŞ kullanıcılar dosya yükleyebilir
CREATE POLICY "allow_authenticated_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public-assets');

-- 5. GİRİŞ YAPMIŞ kullanıcılar kendi dosyalarını güncelleyebilir
CREATE POLICY "allow_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'public-assets');

-- 6. GİRİŞ YAPMIŞ kullanıcılar kendi dosyalarını silebilir
CREATE POLICY "allow_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'public-assets');

-- Kontrol: Oluşan politikaları listele
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
