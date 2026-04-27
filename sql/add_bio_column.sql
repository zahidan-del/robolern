-- Tambahkan kolom bio ke tabel profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text DEFAULT NULL;

-- Buat bucket storage 'uploads' jika belum ada (untuk foto profil)
-- Jalankan ini di Supabase Dashboard > Storage > New Bucket
-- Nama: uploads
-- Public: true

-- Policy untuk upload avatar (jalankan di SQL Editor)
CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads' AND (storage.foldername(name))[1] = 'avatars');

CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = 'avatars');

CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'uploads');
