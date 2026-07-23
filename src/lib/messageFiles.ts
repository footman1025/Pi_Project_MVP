import { supabase } from './supabase'

const BUCKET = 'message-files'
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

const ALLOWED_PREFIXES = [
  'image/',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
  'application/json',
  'audio/',
  'video/mp4',
  'video/webm',
]

export type FileAttachment = {
  url: string
  name: string
  size: number
  type: string
}

function isAllowedMime(type: string) {
  if (!type) return false
  return ALLOWED_PREFIXES.some(p => type === p || type.startsWith(p))
}

function safeFileName(name: string) {
  return name.replace(/[^\w.\-()+ ]+/g, '_').slice(0, 120) || 'file'
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function uploadMessageFile(
  userId: string,
  peerId: string,
  file: File,
): Promise<FileAttachment> {
  if (!isAllowedMime(file.type)) {
    throw new Error('This file type is not supported. Try an image, PDF, Office doc, text, zip, audio, or short video.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('File must be under 10 MB.')
  }

  const name = safeFileName(file.name)
  const path = `${userId}/${peerId}/${Date.now()}_${name}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type, cacheControl: '3600' })

  if (error) {
    if (/bucket|not found|row-level security/i.test(error.message)) {
      throw new Error(
        'File storage is not set up yet. In Supabase: run supabase_message_files.sql (creates public bucket “message-files”).',
      )
    }
    throw new Error(error.message)
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, name: file.name, size: file.size, type: file.type }
}

export function encodeFileMessage(file: FileAttachment) {
  return `[[file:${JSON.stringify(file)}]]`
}

export function parseFileMessage(content: string): FileAttachment | null {
  if (!content.startsWith('[[file:') || !content.endsWith(']]')) return null
  try {
    const raw = content.slice('[[file:'.length, -2)
    const data = JSON.parse(raw) as FileAttachment
    if (!data?.url || !data?.name) return null
    return data
  } catch {
    return null
  }
}

export function isImageFile(type: string) {
  return type.startsWith('image/')
}
