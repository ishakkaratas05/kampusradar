-- ====================================================================
-- KAMPÜSRADAR SUPABASE SEED SQL SCRIPT
-- Şifre: Bütün kullanıcılar için şifre "123456" olarak ayarlanmıştır.
-- ====================================================================

-- 1. EĞER BULUNMUYORSA CRYPTO UZANTISINI EKLE (Şifre şifreleme için)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. KULLANICI EKLEME YARDIMCI FONKSİYONU
-- Hem auth.users hem de public.profiles tablolarına güvenli bir şekilde ekleme yapar.
CREATE OR REPLACE FUNCTION public.seed_user_helper(
    p_email text,
    p_full_name text,
    p_role text,
    p_university_id uuid
) RETURNS uuid AS $$
DECLARE
    v_user_id uuid;
    v_encrypted_pw text;
BEGIN
    -- Şifre "123456" için hash oluştur
    v_encrypted_pw := crypt('123456', gen_salt('bf', 10));
    v_user_id := gen_random_uuid();

    -- auth.users tablosuna ekle
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        p_email,
        v_encrypted_pw,
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        json_build_object('full_name', p_full_name, 'role', p_role, 'university_id', p_university_id)::jsonb,
        'authenticated',
        'authenticated',
        now(),
        now()
    ) ON CONFLICT (email) DO NOTHING;

    -- Eklenen kullanıcının id'sini bul (conflict olduysa mevcut id'yi al)
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

    -- public.profiles tablosuna ekle (Trigger yoksa veya tetiklenmediyse garanti olsun)
    INSERT INTO public.profiles (
        id,
        full_name,
        role,
        university_id
    ) VALUES (
        v_user_id,
        p_full_name,
        p_role,
        p_university_id
    ) ON CONFLICT (id) DO UPDATE 
    SET full_name = p_full_name, role = p_role, university_id = p_university_id;

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- 3. VERİ EKLEME ADIMLARI
DO $$
DECLARE
    -- Üniversite ID Tanımlamaları (Mevcut UUID'ler)
    firat_id      uuid := 'b12fc31e-ef63-421e-a3f9-ab526cb280e5';
    odtu_id       uuid := '948b00e0-eabb-45c4-9eed-1bc63f9ceeff';
    itu_id        uuid := 'acb24146-dc3d-41a2-bceb-e29143f95b55';
    bogazici_id   uuid := '7f44d55d-f2b0-4cf2-bbf3-b14b686b025e';
    ankara_id     uuid := '9defda54-027c-4513-80b0-fecd4b106684';
    gazi_id       uuid := 'd11c922a-c09f-49f6-aede-cb879895a4d6';
    ege_id        uuid := '6241629d-6164-472e-a2b8-33b506508725';
    dokuz_eylul_id uuid := 'bf3e9f6b-40b1-4b0f-94c1-f31ac31bb151';
    ytu_id        uuid := '780230a1-6164-4322-b3fb-26f53954b8d8';
    hacettepe_id  uuid := '540b8286-0f94-4e14-8090-fe89afefa916';
    ataturk_id    uuid := 'cff1ade6-35b3-4590-86f4-d38eba548eeb';
    ktu_id        uuid := 'f55cdaeb-fddb-4b02-80c1-59d618631121';
BEGIN

    -- ────────────────────────────────────────────────────────────
    -- FIRAT ÜNİVERSİTESİ (FUTURE Topluluğu ile birlikte)
    -- ────────────────────────────────────────────────────────────
    PERFORM public.seed_user_helper('firatsks@gmail.com', 'Fırat SKS Yetkilisi', 'sks', firat_id);
    PERFORM public.seed_user_helper('future@firat.edu.tr', 'FUTURE Öğrenci Topluluğu', 'organizer', firat_id);
    PERFORM public.seed_user_helper('gdg@firat.edu.tr', 'GDG Fırat', 'organizer', firat_id);
    PERFORM public.seed_user_helper('teknofest@firat.edu.tr', 'Fırat Teknofest Takımı', 'organizer', firat_id);

    -- ────────────────────────────────────────────────────────────
    -- GAZİ ÜNİVERSİTESİ
    -- ────────────────────────────────────────────────────────────
    PERFORM public.seed_user_helper('gazisks@gmail.com', 'Gazi SKS Yetkilisi', 'sks', gazi_id);
    PERFORM public.seed_user_helper('ai@gazi.edu.tr', 'Yapay Zeka Öğrenci Topluluğu', 'organizer', gazi_id);
    PERFORM public.seed_user_helper('gdg@gazi.edu.tr', 'GDG Gazi', 'organizer', gazi_id);
    PERFORM public.seed_user_helper('hsd@gazi.edu.tr', 'HSD Gazi', 'organizer', gazi_id);

    -- ────────────────────────────────────────────────────────────
    -- HACETTEPE ÜNİVERSİTESİ
    -- ────────────────────────────────────────────────────────────
    PERFORM public.seed_user_helper('hacettepesks@gmail.com', 'Hacettepe SKS Yetkilisi', 'sks', hacettepe_id);
    PERFORM public.seed_user_helper('acm@hacettepe.edu.tr', 'Hacettepe ACM Topluluğu', 'organizer', hacettepe_id);
    PERFORM public.seed_user_helper('gdg@hacettepe.edu.tr', 'GDG Hacettepe', 'organizer', hacettepe_id);
    PERFORM public.seed_user_helper('hsd@hacettepe.edu.tr', 'HSD Hacettepe', 'organizer', hacettepe_id);

    -- ────────────────────────────────────────────────────────────
    -- EGE ÜNİVERSİTESİ
    -- ────────────────────────────────────────────────────────────
    PERFORM public.seed_user_helper('egesks@gmail.com', 'Ege SKS Yetkilisi', 'sks', ege_id);
    PERFORM public.seed_user_helper('gdg@ege.edu.tr', 'GDG Ege', 'organizer', ege_id);
    PERFORM public.seed_user_helper('teknofest@ege.edu.tr', 'Ege Teknofest Topluluğu', 'organizer', ege_id);
    PERFORM public.seed_user_helper('tiyatro@ege.edu.tr', 'Ege Tiyatro Kulübü', 'organizer', ege_id);

    -- ────────────────────────────────────────────────────────────
    -- YILDIZ TEKNİK ÜNİVERSİTESİ
    -- ────────────────────────────────────────────────────────────
    PERFORM public.seed_user_helper('ytusks@gmail.com', 'YTÜ SKS Yetkilisi', 'sks', ytu_id);
    PERFORM public.seed_user_helper('gdg@ytu.edu.tr', 'GDG YTÜ', 'organizer', ytu_id);
    PERFORM public.seed_user_helper('hsd@ytu.edu.tr', 'HSD YTÜ', 'organizer', ytu_id);
    PERFORM public.seed_user_helper('teknofest@ytu.edu.tr', 'YTÜ Teknofest Kulübü', 'organizer', ytu_id);

    -- ────────────────────────────────────────────────────────────
    -- BOĞAZİÇİ ÜNİVERSİTESİ
    -- ────────────────────────────────────────────────────────────
    PERFORM public.seed_user_helper('bogazicisks@gmail.com', 'Boğaziçi SKS Yetkilisi', 'sks', bogazici_id);
    PERFORM public.seed_user_helper('bounacm@boun.edu.tr', 'Boğaziçi ACM Kulübü', 'organizer', bogazici_id);
    PERFORM public.seed_user_helper('gdg@boun.edu.tr', 'GDG Boğaziçi', 'organizer', bogazici_id);
    PERFORM public.seed_user_helper('hsd@boun.edu.tr', 'HSD Boğaziçi', 'organizer', bogazici_id);

    -- ────────────────────────────────────────────────────────────
    -- ORTA DOĞU TEKNİK ÜNİVERSİTESİ
    -- ────────────────────────────────────────────────────────────
    PERFORM public.seed_user_helper('odtúsks@gmail.com', 'ODTÜ SKS Yetkilisi', 'sks', odtu_id);
    PERFORM public.seed_user_helper('acm@odtu.edu.tr', 'ODTÜ ACM Kulübü', 'organizer', odtu_id);
    PERFORM public.seed_user_helper('gdg@odtu.edu.tr', 'GDG ODTÜ', 'organizer', odtu_id);
    PERFORM public.seed_user_helper('teknofest@odtu.edu.tr', 'ODTÜ Teknofest', 'organizer', odtu_id);

    -- ────────────────────────────────────────────────────────────
    -- ANKARA ÜNİVERSİTESİ
    -- ────────────────────────────────────────────────────────────
    PERFORM public.seed_user_helper('ankarasks@gmail.com', 'Ankara SKS Yetkilisi', 'sks', ankara_id);
    PERFORM public.seed_user_helper('gdg@ankara.edu.tr', 'GDG Ankara', 'organizer', ankara_id);
    PERFORM public.seed_user_helper('hsd@ankara.edu.tr', 'HSD Ankara', 'organizer', ankara_id);
    PERFORM public.seed_user_helper('teknofest@ankara.edu.tr', 'Ankara Teknofest Kulübü', 'organizer', ankara_id);

    -- ────────────────────────────────────────────────────────────
    -- İSTANBUL TEKNİK ÜNİVERSİTESİ
    -- ────────────────────────────────────────────────────────────
    PERFORM public.seed_user_helper('itusks@gmail.com', 'İTÜ SKS Yetkilisi', 'sks', itu_id);
    PERFORM public.seed_user_helper('robotik@itu.edu.tr', 'İTÜ Robotik Kulübü', 'organizer', itu_id);
    PERFORM public.seed_user_helper('gdg@itu.edu.tr', 'GDG İTÜ', 'organizer', itu_id);
    PERFORM public.seed_user_helper('teknofest@itu.edu.tr', 'İTÜ Teknofest Takımları', 'organizer', itu_id);

    -- ────────────────────────────────────────────────────────────
    -- DOKUZ EYLÜL ÜNİVERSİTESİ
    -- ────────────────────────────────────────────────────────────
    PERFORM public.seed_user_helper('deusks@gmail.com', 'DEÜ SKS Yetkilisi', 'sks', dokuz_eylul_id);
    PERFORM public.seed_user_helper('gdg@deu.edu.tr', 'GDG Dokuz Eylül', 'organizer', dokuz_eylul_id);
    PERFORM public.seed_user_helper('hsd@deu.edu.tr', 'HSD Dokuz Eylül', 'organizer', dokuz_eylul_id);
    PERFORM public.seed_user_helper('tiyatro@deu.edu.tr', 'DEÜ Tiyatro Topluluğu', 'organizer', dokuz_eylul_id);

    -- ────────────────────────────────────────────────────────────
    -- ATATÜRK ÜNİVERSİTESİ
    -- ────────────────────────────────────────────────────────────
    PERFORM public.seed_user_helper('ataturksks@gmail.com', 'Atatürk SKS Yetkilisi', 'sks', ataturk_id);
    PERFORM public.seed_user_helper('gdg@atauni.edu.tr', 'GDG Atatürk Üni', 'organizer', ataturk_id);
    PERFORM public.seed_user_helper('hsd@atauni.edu.tr', 'HSD Atatürk Üni', 'organizer', ataturk_id);
    PERFORM public.seed_user_helper('teknofest@atauni.edu.tr', 'Atatürk Üni Teknofest', 'organizer', ataturk_id);

    -- ────────────────────────────────────────────────────────────
    -- KARADENİZ TEKNİK ÜNİVERSİTESİ
    -- ────────────────────────────────────────────────────────────
    PERFORM public.seed_user_helper('ktusks@gmail.com', 'KTÜ SKS Yetkilisi', 'sks', ktu_id);
    PERFORM public.seed_user_helper('gdg@ktu.edu.tr', 'GDG KTÜ', 'organizer', ktu_id);
    PERFORM public.seed_user_helper('hsd@ktu.edu.tr', 'HSD KTÜ', 'organizer', ktu_id);
    PERFORM public.seed_user_helper('teknofest@ktu.edu.tr', 'KTÜ Teknofest Topluluğu', 'organizer', ktu_id);

END $$;

-- 4. KULLANILAN YARDIMCI FONKSİYONU TEMİZLE
DROP FUNCTION IF EXISTS public.seed_user_helper;
