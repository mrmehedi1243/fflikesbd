ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users read own avatars"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'profile-avatars'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "users upload own avatars"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "users update own avatars"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'profile-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "users delete own avatars"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'profile-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
