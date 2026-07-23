import { supabase } from './supabase'

const BUCKET = 'avatars'
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error('Please upload a JPG, PNG, WEBP, or GIF image.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image must be under 2 MB.')
  }

  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${userId}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' })

  if (uploadError) {
    // Common when bucket is missing — give a clear hint
    if (/bucket|not found|row-level security/i.test(uploadError.message)) {
      throw new Error(
        'Avatar storage is not set up yet. In Supabase: Storage → create a public bucket named “avatars”, then run supabase_storage.sql.'
      )
    }
    throw new Error(uploadError.message)
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  // Cache-bust so UI updates immediately after replace
  return `${data.publicUrl}?t=${Date.now()}`
}
