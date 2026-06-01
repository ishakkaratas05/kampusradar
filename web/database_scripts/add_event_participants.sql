-- ====================================================================
-- KAMPÜSRADAR - ETKİNLİK KATILIM VE KABUL SİSTEMİ SQL SCRİPTİ
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın.
-- ====================================================================

-- 1. Events Tablosuna Onay Gereksinimi Kolonu Ekleme
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;

-- 2. Event Participants (Etkinlik Katılımcıları) Tablosunu Oluşturma
CREATE TABLE IF NOT EXISTS public.event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_event_student UNIQUE (event_id, student_id)
);

-- 3. Row Level Security (RLS) Aktifleştirme
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- 4. RLS Politikaları (Policies)

-- A. OKUMA (SELECT) POLİTİKASI
-- Herkes katılım kayıtlarını görebilir veya sadece kendi kayıtlarını/organizatörler kendi etkinliğindeki kayıtları görebilir.
-- Etkinliğe katılanları herkesin görebilmesi (sayı ve liste için) genelde faydalıdır:
CREATE POLICY "Allow select for everyone" 
ON public.event_participants 
FOR SELECT 
USING (true);

-- B. EKLEME (INSERT) POLİTİKASI
-- Sadece giriş yapmış öğrenciler kendi adlarına katılım kaydı oluşturabilir.
CREATE POLICY "Allow insert for authenticated users as self" 
ON public.event_participants 
FOR INSERT 
TO authenticated 
WITH CHECK (
    auth.uid() = student_id
);

-- C. GÜNCELLEME (UPDATE) POLİTİKASI
-- Sadece ilgili etkinliği düzenleyen organizatör katılımcının durumunu (onaylandı/reddedildi) güncelleyebilir.
CREATE POLICY "Allow update for event organizers" 
ON public.event_participants 
FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.events 
        WHERE events.id = event_participants.event_id 
          AND events.organizer_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.events 
        WHERE events.id = event_participants.event_id 
          AND events.organizer_id = auth.uid()
    )
);

-- D. SİLME (DELETE) POLİTİKASI
-- Sadece öğrenci kendi katılımını iptal edebilir (başvuruyu geri çekebilir).
CREATE POLICY "Allow delete for participant self" 
ON public.event_participants 
FOR DELETE 
TO authenticated 
USING (
    auth.uid() = student_id
);
