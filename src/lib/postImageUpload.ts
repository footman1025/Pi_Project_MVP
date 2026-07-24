import { supabase } from './supabase'

const BUCKET = 'post-images'
const MAX_BYTES = 8 * 1024 * 1024 // 8 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function uploadPostImage(userId: string, file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error('Please upload a JPG, PNG, WEBP, or GIF image.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image must be under 8 MB.')
  }

  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type, cacheControl: '3600' })

  if (uploadError) {
    if (/bucket|not found|row-level security/i.test(uploadError.message)) {
      throw new Error(
        'Post image storage is not set up yet. In Supabase: run supabase_post_images.sql (creates public bucket “post-images”).',
      )
    }
    throw new Error(uploadError.message)
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
