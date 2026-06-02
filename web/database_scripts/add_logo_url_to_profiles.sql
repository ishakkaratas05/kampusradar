-- ====================================================================
-- KAMPÜSRADAR - TOPLULUK (ORGANİZATÖR) LOGOSU EKLEME
-- Bu SQL'i Supabase Dashboard > SQL Editor kısmında çalıştırın.
-- ====================================================================

-- profiles tablosuna logo_url kolonunu ekler (eğer yoksa)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS logo_url TEXT;
