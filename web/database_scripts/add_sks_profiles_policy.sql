-- SKS kullanıcılarının kendi üniversitelerindeki organizatör profillerini güncelleyebilmesi (onay/ret) için RLS politikası ekle

DROP POLICY IF EXISTS "allow_sks_update_organizer_profiles" ON public.profiles;

CREATE POLICY "allow_sks_update_organizer_profiles" ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles as reviewer
    WHERE reviewer.id = auth.uid() 
    AND reviewer.role = 'sks' 
    AND reviewer.university_id = public.profiles.university_id
  )
  AND public.profiles.role = 'organizer'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles as reviewer
    WHERE reviewer.id = auth.uid() 
    AND reviewer.role = 'sks' 
    AND reviewer.university_id = public.profiles.university_id
  )
  AND public.profiles.role = 'organizer'
);
