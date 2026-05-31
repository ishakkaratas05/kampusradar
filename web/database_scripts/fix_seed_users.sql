-- ====================================================================
-- KAMPÜSRADAR - BOZUK SEED KULLANICILARI TEMİZLE VE DOĞRU FORMATTA EKLE
-- Bu script auth.users + auth.identities + profiles tablolarını düzgünce doldurur.
-- ====================================================================

-- 1. Bozuk kayıtları tamamen temizle (seed ile eklenen email'ler)
DO $$
DECLARE
    seed_emails text[] := ARRAY[
        'firatsks@gmail.com', 'future@firat.edu.tr', 'gdg@firat.edu.tr', 'teknofest@firat.edu.tr',
        'gazisks@gmail.com', 'ai@gazi.edu.tr', 'gdg@gazi.edu.tr', 'hsd@gazi.edu.tr',
        'hacettepesks@gmail.com', 'acm@hacettepe.edu.tr', 'gdg@hacettepe.edu.tr', 'hsd@hacettepe.edu.tr',
        'egesks@gmail.com', 'gdg@ege.edu.tr', 'teknofest@ege.edu.tr', 'tiyatro@ege.edu.tr',
        'ytusks@gmail.com', 'gdg@ytu.edu.tr', 'hsd@ytu.edu.tr', 'teknofest@ytu.edu.tr',
        'bogazicisks@gmail.com', 'bounacm@boun.edu.tr', 'gdg@boun.edu.tr', 'hsd@boun.edu.tr',
        'odtúsks@gmail.com', 'acm@odtu.edu.tr', 'gdg@odtu.edu.tr', 'teknofest@odtu.edu.tr',
        'ankarasks@gmail.com', 'gdg@ankara.edu.tr', 'hsd@ankara.edu.tr', 'teknofest@ankara.edu.tr',
        'itusks@gmail.com', 'robotik@itu.edu.tr', 'gdg@itu.edu.tr', 'teknofest@itu.edu.tr',
        'deusks@gmail.com', 'gdg@deu.edu.tr', 'hsd@deu.edu.tr', 'tiyatro@deu.edu.tr',
        'ataturksks@gmail.com', 'gdg@atauni.edu.tr', 'hsd@atauni.edu.tr', 'teknofest@atauni.edu.tr',
        'ktusks@gmail.com', 'gdg@ktu.edu.tr', 'hsd@ktu.edu.tr', 'teknofest@ktu.edu.tr'
    ];
    e text;
    uid uuid;
BEGIN
    FOREACH e IN ARRAY seed_emails LOOP
        SELECT id INTO uid FROM auth.users WHERE email = e;
        IF uid IS NOT NULL THEN
            DELETE FROM public.profiles WHERE id = uid;
            DELETE FROM auth.identities WHERE user_id = uid;
            DELETE FROM auth.sessions WHERE user_id = uid;
            DELETE FROM auth.refresh_tokens WHERE user_id::text = uid::text;
            DELETE FROM auth.mfa_factors WHERE user_id = uid;
            DELETE FROM auth.users WHERE id = uid;
            RAISE NOTICE 'Silindi: %', e;
        END IF;
    END LOOP;
END $$;


-- 2. Doğru formatta kullanıcı ekleme fonksiyonu (auth.identities dahil!)
CREATE OR REPLACE FUNCTION public.create_seed_user(
    p_email text,
    p_full_name text,
    p_role text,
    p_university_id uuid
) RETURNS uuid AS $$
DECLARE
    v_user_id uuid := gen_random_uuid();
    v_encrypted_pw text;
    v_now timestamptz := now();
BEGIN
    -- Şifreyi Supabase'in beklediği formatta hash'le
    v_encrypted_pw := extensions.crypt('123456', extensions.gen_salt('bf'));

    -- auth.users tablosuna ekle (TÜM zorunlu alanlar dahil)
    INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        last_sign_in_at,
        phone,
        phone_confirmed_at,
        phone_change,
        phone_change_token,
        confirmation_sent_at,
        is_sso_user,
        deleted_at,
        is_anonymous
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        p_email,
        v_encrypted_pw,
        v_now,          -- email onaylandı
        '',             -- confirmation_token
        '',             -- recovery_token
        '',             -- email_change_token_new
        '',             -- email_change
        jsonb_build_object(
            'provider', 'email',
            'providers', array['email']
        ),
        jsonb_build_object(
            'full_name', p_full_name,
            'role', p_role,
            'university_id', p_university_id::text
        ),
        false,          -- is_super_admin
        v_now,
        v_now,
        v_now,          -- last_sign_in_at
        null,           -- phone
        null,           -- phone_confirmed_at
        '',             -- phone_change
        '',             -- phone_change_token
        null,           -- confirmation_sent_at
        false,          -- is_sso_user
        null,           -- deleted_at
        false           -- is_anonymous
    );

    -- ÇOK ÖNEMLİ: auth.identities tablosuna email identity ekle
    -- GoTrue bu kayıt olmadan kullanıcıyı doğrulayamaz!
    INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        provider,
        identity_data,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_user_id,
        v_user_id::text,
        'email',
        jsonb_build_object(
            'sub', v_user_id::text,
            'email', p_email,
            'email_verified', true,
            'phone_verified', false
        ),
        v_now,
        v_now,
        v_now
    );

    -- public.profiles tablosuna ekle
    INSERT INTO public.profiles (id, full_name, role, university_id)
    VALUES (v_user_id, p_full_name, p_role, p_university_id)
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, university_id = EXCLUDED.university_id;

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Üniversite ID'leri
DO $$
DECLARE
    firat_id       uuid := 'b12fc31e-ef63-421e-a3f9-ab526cb280e5';
    odtu_id        uuid := '948b00e0-eabb-45c4-9eed-1bc63f9ceeff';
    itu_id         uuid := 'acb24146-dc3d-41a2-bceb-e29143f95b55';
    bogazici_id    uuid := '7f44d55d-f2b0-4cf2-bbf3-b14b686b025e';
    ankara_id      uuid := '9defda54-027c-4513-80b0-fecd4b106684';
    gazi_id        uuid := 'd11c922a-c09f-49f6-aede-cb879895a4d6';
    ege_id         uuid := '6241629d-6164-472e-a2b8-33b506508725';
    dokuz_eylul_id uuid := 'bf3e9f6b-40b1-4b0f-94c1-f31ac31bb151';
    ytu_id         uuid := '780230a1-6164-4322-b3fb-26f53954b8d8';
    hacettepe_id   uuid := '540b8286-0f94-4e14-8090-fe89afefa916';
    ataturk_id     uuid := 'cff1ade6-35b3-4590-86f4-d38eba548eeb';
    ktu_id         uuid := 'f55cdaeb-fddb-4b02-80c1-59d618631121';
BEGIN
    -- FIRAT ÜNİVERSİTESİ
    PERFORM public.create_seed_user('firatsks@gmail.com',     'Fırat SKS Yetkilisi',        'sks',       firat_id);
    PERFORM public.create_seed_user('future@firat.edu.tr',    'FUTURE Öğrenci Topluluğu',   'organizer', firat_id);
    PERFORM public.create_seed_user('gdg@firat.edu.tr',       'GDG Fırat',                  'organizer', firat_id);
    PERFORM public.create_seed_user('teknofest@firat.edu.tr', 'Fırat Teknofest Takımı',     'organizer', firat_id);

    -- GAZİ ÜNİVERSİTESİ
    PERFORM public.create_seed_user('gazisks@gmail.com',  'Gazi SKS Yetkilisi',              'sks',       gazi_id);
    PERFORM public.create_seed_user('ai@gazi.edu.tr',     'Yapay Zeka Öğrenci Topluluğu',    'organizer', gazi_id);
    PERFORM public.create_seed_user('gdg@gazi.edu.tr',    'GDG Gazi',                        'organizer', gazi_id);
    PERFORM public.create_seed_user('hsd@gazi.edu.tr',    'HSD Gazi',                        'organizer', gazi_id);

    -- HACETTEPE ÜNİVERSİTESİ
    PERFORM public.create_seed_user('hacettepesks@gmail.com',  'Hacettepe SKS Yetkilisi',    'sks',       hacettepe_id);
    PERFORM public.create_seed_user('acm@hacettepe.edu.tr',    'Hacettepe ACM Topluluğu',    'organizer', hacettepe_id);
    PERFORM public.create_seed_user('gdg@hacettepe.edu.tr',    'GDG Hacettepe',              'organizer', hacettepe_id);
    PERFORM public.create_seed_user('hsd@hacettepe.edu.tr',    'HSD Hacettepe',              'organizer', hacettepe_id);

    -- EGE ÜNİVERSİTESİ
    PERFORM public.create_seed_user('egesks@gmail.com',       'Ege SKS Yetkilisi',           'sks',       ege_id);
    PERFORM public.create_seed_user('gdg@ege.edu.tr',         'GDG Ege',                     'organizer', ege_id);
    PERFORM public.create_seed_user('teknofest@ege.edu.tr',   'Ege Teknofest Topluluğu',     'organizer', ege_id);
    PERFORM public.create_seed_user('tiyatro@ege.edu.tr',     'Ege Tiyatro Kulübü',          'organizer', ege_id);

    -- YILDIZ TEKNİK ÜNİVERSİTESİ
    PERFORM public.create_seed_user('ytusks@gmail.com',       'YTÜ SKS Yetkilisi',           'sks',       ytu_id);
    PERFORM public.create_seed_user('gdg@ytu.edu.tr',         'GDG YTÜ',                     'organizer', ytu_id);
    PERFORM public.create_seed_user('hsd@ytu.edu.tr',         'HSD YTÜ',                     'organizer', ytu_id);
    PERFORM public.create_seed_user('teknofest@ytu.edu.tr',   'YTÜ Teknofest Kulübü',        'organizer', ytu_id);

    -- BOĞAZİÇİ ÜNİVERSİTESİ
    PERFORM public.create_seed_user('bogazicisks@gmail.com',  'Boğaziçi SKS Yetkilisi',      'sks',       bogazici_id);
    PERFORM public.create_seed_user('bounacm@boun.edu.tr',    'Boğaziçi ACM Kulübü',         'organizer', bogazici_id);
    PERFORM public.create_seed_user('gdg@boun.edu.tr',        'GDG Boğaziçi',                'organizer', bogazici_id);
    PERFORM public.create_seed_user('hsd@boun.edu.tr',        'HSD Boğaziçi',                'organizer', bogazici_id);

    -- ORTA DOĞU TEKNİK ÜNİVERSİTESİ
    PERFORM public.create_seed_user('odtusks@gmail.com',      'ODTÜ SKS Yetkilisi',          'sks',       odtu_id);
    PERFORM public.create_seed_user('acm@odtu.edu.tr',        'ODTÜ ACM Kulübü',             'organizer', odtu_id);
    PERFORM public.create_seed_user('gdg@odtu.edu.tr',        'GDG ODTÜ',                    'organizer', odtu_id);
    PERFORM public.create_seed_user('teknofest@odtu.edu.tr',  'ODTÜ Teknofest',              'organizer', odtu_id);

    -- ANKARA ÜNİVERSİTESİ
    PERFORM public.create_seed_user('ankarasks@gmail.com',     'Ankara SKS Yetkilisi',       'sks',       ankara_id);
    PERFORM public.create_seed_user('gdg@ankara.edu.tr',       'GDG Ankara',                 'organizer', ankara_id);
    PERFORM public.create_seed_user('hsd@ankara.edu.tr',       'HSD Ankara',                 'organizer', ankara_id);
    PERFORM public.create_seed_user('teknofest@ankara.edu.tr', 'Ankara Teknofest Kulübü',    'organizer', ankara_id);

    -- İSTANBUL TEKNİK ÜNİVERSİTESİ
    PERFORM public.create_seed_user('itusks@gmail.com',       'İTÜ SKS Yetkilisi',           'sks',       itu_id);
    PERFORM public.create_seed_user('robotik@itu.edu.tr',     'İTÜ Robotik Kulübü',          'organizer', itu_id);
    PERFORM public.create_seed_user('gdg@itu.edu.tr',         'GDG İTÜ',                     'organizer', itu_id);
    PERFORM public.create_seed_user('teknofest@itu.edu.tr',   'İTÜ Teknofest Takımları',     'organizer', itu_id);

    -- DOKUZ EYLÜL ÜNİVERSİTESİ
    PERFORM public.create_seed_user('deusks@gmail.com',       'DEÜ SKS Yetkilisi',           'sks',       dokuz_eylul_id);
    PERFORM public.create_seed_user('gdg@deu.edu.tr',         'GDG Dokuz Eylül',             'organizer', dokuz_eylul_id);
    PERFORM public.create_seed_user('hsd@deu.edu.tr',         'HSD Dokuz Eylül',             'organizer', dokuz_eylul_id);
    PERFORM public.create_seed_user('tiyatro@deu.edu.tr',     'DEÜ Tiyatro Topluluğu',       'organizer', dokuz_eylul_id);

    -- ATATÜRK ÜNİVERSİTESİ
    PERFORM public.create_seed_user('ataturksks@gmail.com',    'Atatürk SKS Yetkilisi',      'sks',       ataturk_id);
    PERFORM public.create_seed_user('gdg@atauni.edu.tr',       'GDG Atatürk Üni',            'organizer', ataturk_id);
    PERFORM public.create_seed_user('hsd@atauni.edu.tr',       'HSD Atatürk Üni',            'organizer', ataturk_id);
    PERFORM public.create_seed_user('teknofest@atauni.edu.tr', 'Atatürk Üni Teknofest',      'organizer', ataturk_id);

    -- KARADENİZ TEKNİK ÜNİVERSİTESİ
    PERFORM public.create_seed_user('ktusks@gmail.com',       'KTÜ SKS Yetkilisi',           'sks',       ktu_id);
    PERFORM public.create_seed_user('gdg@ktu.edu.tr',         'GDG KTÜ',                     'organizer', ktu_id);
    PERFORM public.create_seed_user('hsd@ktu.edu.tr',         'HSD KTÜ',                     'organizer', ktu_id);
    PERFORM public.create_seed_user('teknofest@ktu.edu.tr',   'KTÜ Teknofest Topluluğu',     'organizer', ktu_id);

    RAISE NOTICE '✅ Tüm kullanıcılar başarıyla oluşturuldu!';
END $$;


-- 4. Yardımcı fonksiyonu temizle
DROP FUNCTION IF EXISTS public.create_seed_user;

-- 5. Doğrulama sorgusu: oluşturulan kullanıcıları kontrol et
SELECT 
    u.email,
    p.role,
    p.full_name,
    CASE WHEN i.id IS NOT NULL THEN '✅ VAR' ELSE '❌ YOK' END AS identity_durumu
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN auth.identities i ON i.user_id = u.id
WHERE u.email IN (
    'firatsks@gmail.com', 'future@firat.edu.tr', 'gdg@firat.edu.tr',
    'gazisks@gmail.com', 'hacettepesks@gmail.com', 'egesks@gmail.com',
    'ytusks@gmail.com', 'bogazicisks@gmail.com', 'odtusks@gmail.com',
    'ankarasks@gmail.com', 'itusks@gmail.com', 'deusks@gmail.com',
    'ataturksks@gmail.com', 'ktusks@gmail.com'
)
ORDER BY u.email;
