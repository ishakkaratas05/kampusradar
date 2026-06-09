-- 1. profiles tablosuna akademik sütunları ekle
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS faculty VARCHAR(150);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department VARCHAR(150);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_level VARCHAR(50);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_number VARCHAR(15);

-- 2. Yeni kaydolan öğrencilerin akademik bilgilerini public.profiles tablosuna aktaran trigger fonksiyonunu güncelle
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email,
    full_name, 
    role, 
    university_id, 
    logo_url,
    faculty,
    department,
    class_level,
    student_number
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    (new.raw_user_meta_data->>'university_id')::uuid,
    new.raw_user_meta_data->>'logo_url',
    new.raw_user_meta_data->>'faculty',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'class_level',
    new.raw_user_meta_data->>'student_number'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Mevcut seed/test öğrencilerine örnek akademik veriler ekle
UPDATE public.profiles
SET 
  faculty = 'Mühendislik Fakültesi',
  department = 'Yazılım Mühendisliği',
  class_level = '3. Sınıf',
  student_number = '230102045' -- 23: 2023 Girişli, 0102: Bölüm Kodu, 045: Giriş Sırası
WHERE email = 'ahmet.yilmaz@firat.edu.tr';

UPDATE public.profiles
SET 
  faculty = 'Mühendislik Fakültesi',
  department = 'Bilgisayar Mühendisliği',
  class_level = '2. Sınıf',
  student_number = '240101012' -- 24: 2024 Girişli
WHERE email = 'ayse.kaya@firat.edu.tr';

UPDATE public.profiles
SET 
  faculty = 'Mühendislik Fakültesi',
  department = 'Bilgisayar Mühendisliği',
  class_level = '4. Sınıf',
  student_number = '220101001'
WHERE email = 'can.demirel@odtu.edu.tr';

UPDATE public.profiles
SET 
  faculty = 'İktisadi ve İdari Bilimler Fakültesi',
  department = 'İşletme',
  class_level = '1. Sınıf',
  student_number = '250201089'
WHERE email = 'zeynep.celik@odtu.edu.tr';

