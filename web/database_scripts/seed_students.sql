-- ====================================================================
-- KAMPÜSRADAR ÖĞRENCİ SEED SCRIPT (GERÇEK İSİMLİ & DÜZELTİLMİŞ)
-- ====================================================================

-- 1. EĞER BULUNMUYORSA CRYPTO UZANTISINI EKLE
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. ESKİ BOZUK KAYITLARI SİL
DO $$
DECLARE
    student_emails text[] := ARRAY[
        'ahmet.yilmaz@firat.edu.tr', 'ayse.kaya@firat.edu.tr',
        'can.demirel@odtu.edu.tr', 'zeynep.celik@odtu.edu.tr',
        'burak.sahin@itu.edu.tr', 'elif.koc@itu.edu.tr',
        'emre.ozturk@boun.edu.tr', 'ceren.arslan@boun.edu.tr',
        'murat.dogan@ankara.edu.tr', 'sena.yildirim@ankara.edu.tr',
        'onur.kilic@gazi.edu.tr', 'meryem.polat@gazi.edu.tr',
        'hakan.tekin@ege.edu.tr', 'beyza.aydin@ege.edu.tr',
        'ozan.bulut@deu.edu.tr', 'gizem.karaman@deu.edu.tr',
        'tolga.aksoy@yildiz.edu.tr', 'defne.ozcan@yildiz.edu.tr',
        'kerem.turkmen@hacettepe.edu.tr', 'irmak.sezer@hacettepe.edu.tr',
        'yusuf.gunay@atauni.edu.tr', 'esra.bilgin@atauni.edu.tr',
        'volkan.ergun@ktu.edu.tr', 'meltem.yasar@ktu.edu.tr'
    ];
    e text;
    uid uuid;
BEGIN
    FOREACH e IN ARRAY student_emails LOOP
        SELECT id INTO uid FROM auth.users WHERE email = e;
        IF uid IS NOT NULL THEN
            DELETE FROM public.profiles WHERE id = uid;
            DELETE FROM auth.identities WHERE user_id = uid;
            DELETE FROM auth.sessions WHERE user_id = uid;
            DELETE FROM auth.refresh_tokens WHERE user_id::text = uid::text;
            DELETE FROM auth.mfa_factors WHERE user_id = uid;
            DELETE FROM auth.users WHERE id = uid;
        END IF;
    END LOOP;
END $$;

-- 3. KULLANICI EKLEME YARDIMCI FONKSİYONU (KİMLİK/IDENTITY DAHİL!)
CREATE OR REPLACE FUNCTION public.create_student_user(
    p_email text,
    p_full_name text,
    p_university_id uuid
) RETURNS uuid AS $$
DECLARE
    v_user_id uuid := gen_random_uuid();
    v_encrypted_pw text;
    v_now timestamptz := now();
BEGIN
    v_encrypted_pw := extensions.crypt('123456', extensions.gen_salt('bf'));

    -- auth.users tablosuna ekle
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
        last_sign_in_at, phone, phone_confirmed_at, phone_change, phone_change_token,
        confirmation_sent_at, is_sso_user, deleted_at, is_anonymous
    ) VALUES (
        v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        p_email, v_encrypted_pw, v_now, '', '', '', '',
        jsonb_build_object('provider', 'email', 'providers', array['email']),
        jsonb_build_object('full_name', p_full_name, 'role', 'student', 'university_id', p_university_id::text),
        false, v_now, v_now, v_now, null, null, '', '', null, false, null, false
    );

    -- ÇOK ÖNEMLİ: auth.identities tablosuna ekle (BUNSUZ GİRİŞ YAPILAMAZ)
    INSERT INTO auth.identities (
        id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_user_id, v_user_id::text, 'email',
        jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true, 'phone_verified', false),
        v_now, v_now, v_now
    );

    -- public.profiles tablosuna ekle
    INSERT INTO public.profiles (id, full_name, role, university_id)
    VALUES (v_user_id, p_full_name, 'student', p_university_id)
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, university_id = EXCLUDED.university_id;

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. ÖĞRENCİLERİ EKLEME
DO $$
DECLARE
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

    PERFORM public.create_student_user('ahmet.yilmaz@firat.edu.tr', 'Ahmet Yılmaz', firat_id);
    PERFORM public.create_student_user('ayse.kaya@firat.edu.tr', 'Ayşe Kaya', firat_id);
    PERFORM public.create_student_user('can.demirel@odtu.edu.tr', 'Can Demirel', odtu_id);
    PERFORM public.create_student_user('zeynep.celik@odtu.edu.tr', 'Zeynep Çelik', odtu_id);
    PERFORM public.create_student_user('burak.sahin@itu.edu.tr', 'Burak Şahin', itu_id);
    PERFORM public.create_student_user('elif.koc@itu.edu.tr', 'Elif Koç', itu_id);
    PERFORM public.create_student_user('emre.ozturk@boun.edu.tr', 'Emre Öztürk', bogazici_id);
    PERFORM public.create_student_user('ceren.arslan@boun.edu.tr', 'Ceren Arslan', bogazici_id);
    PERFORM public.create_student_user('murat.dogan@ankara.edu.tr', 'Murat Doğan', ankara_id);
    PERFORM public.create_student_user('sena.yildirim@ankara.edu.tr', 'Sena Yıldırım', ankara_id);
    PERFORM public.create_student_user('onur.kilic@gazi.edu.tr', 'Onur Kılıç', gazi_id);
    PERFORM public.create_student_user('meryem.polat@gazi.edu.tr', 'Meryem Polat', gazi_id);
    PERFORM public.create_student_user('hakan.tekin@ege.edu.tr', 'Hakan Tekin', ege_id);
    PERFORM public.create_student_user('beyza.aydin@ege.edu.tr', 'Beyza Aydın', ege_id);
    PERFORM public.create_student_user('ozan.bulut@deu.edu.tr', 'Ozan Bulut', dokuz_eylul_id);
    PERFORM public.create_student_user('gizem.karaman@deu.edu.tr', 'Gizem Karaman', dokuz_eylul_id);
    PERFORM public.create_student_user('tolga.aksoy@yildiz.edu.tr', 'Tolga Aksoy', ytu_id);
    PERFORM public.create_student_user('defne.ozcan@yildiz.edu.tr', 'Defne Özcan', ytu_id);
    PERFORM public.create_student_user('kerem.turkmen@hacettepe.edu.tr', 'Kerem Türkmen', hacettepe_id);
    PERFORM public.create_student_user('irmak.sezer@hacettepe.edu.tr', 'Irmak Sezer', hacettepe_id);
    PERFORM public.create_student_user('yusuf.gunay@atauni.edu.tr', 'Yusuf Günay', ataturk_id);
    PERFORM public.create_student_user('esra.bilgin@atauni.edu.tr', 'Esra Bilgin', ataturk_id);
    PERFORM public.create_student_user('volkan.ergun@ktu.edu.tr', 'Volkan Ergün', ktu_id);
    PERFORM public.create_student_user('meltem.yasar@ktu.edu.tr', 'Meltem Yaşar', ktu_id);

END $$;

-- 5. FONKSİYONU TEMİZLE
DROP FUNCTION IF EXISTS public.create_student_user;
