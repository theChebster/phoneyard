import imageCompression from 'browser-image-compression';
import { supabase } from './supabase';
export async function compressImage(file) {
  if (!file) return null;
  return imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1800, useWebWorker: true, fileType: 'image/webp' });
}
export async function uploadImage(file, folder, userId) {
  const compressed = await compressImage(file);
  const ext = 'webp';
  const path = `${folder}/${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('phoneyard').upload(path, compressed, { contentType: 'image/webp', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('phoneyard').getPublicUrl(path);
  return data.publicUrl;
}