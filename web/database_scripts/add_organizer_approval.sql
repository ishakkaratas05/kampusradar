-- 1. profiles tablosuna is_approved kolonunu ekle (varsayılan true yapıyoruz ki mevcut kullanıcılar etkilenmesin)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;

-- 2. Yeni kaydolan organizatörlerin (organizer) varsayılan olarak onaysız (is_approved = false) olmasını sağlayacak trigger fonksiyonu
CREATE OR REPLACE FUNCTION public.set_organizer_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'organizer' THEN
    NEW.is_approved := FALSE;
  ELSE
    NEW.is_approved := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger'ı profiles tablosuna tanımla
DROP TRIGGER IF EXISTS before_profile_insert ON public.profiles;
CREATE TRIGGER before_profile_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_organizer_approval();

-- 4. Mevcut seed/test organizatörlerini onaylanmış olarak güncelle
UPDATE public.profiles SET is_approved = TRUE WHERE role = 'organizer';

-- 5. Profiles tablosuna rejection_reason kolonu ekle
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
