
-- Drop the overly broad SELECT policy and replace with path-specific one
DROP POLICY "Product images are publicly accessible" ON storage.objects;
CREATE POLICY "Product images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] IS NOT NULL);
