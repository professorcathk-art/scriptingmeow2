-- Create storage bucket for post reference materials (images, PDF, DOC)
-- Used when creating draft posts - images go to nano-banana, text docs go to Gemini
-- Max 10MB per file. Types: png, jpg, jpeg, pdf, doc, docx
--
-- If INSERT fails (bucket exists), create manually in Supabase Dashboard:
-- Storage → New bucket → id: post-references, public: true, file size limit: 10MB,
-- allowed MIME: image/png, image/jpeg, image/jpg, application/pdf,
-- application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-references',
  'post-references',
  true,
  10485760,
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
;

-- Allow authenticated users to upload to their own folder
-- Path format: {user_id}/{uuid}.{ext}
DROP POLICY IF EXISTS "Users can upload post references" ON storage.objects;
CREATE POLICY "Users can upload post references"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-references'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own uploads
DROP POLICY IF EXISTS "Users can read own post references" ON storage.objects;
CREATE POLICY "Users can read own post references"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'post-references'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
