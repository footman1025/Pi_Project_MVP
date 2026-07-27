import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://enozvyhkjbqsgcjonxlr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVub3p2eWhramJxc2djam9ueGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NjI4NDQsImV4cCI6MjEwMDIzODg0NH0.0S3ZMyPUVzRyRFDseAJNf1QT2ZygyItXLh3mVqR7D7o'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  role: string | null
  location: string | null
  website: string | null
  skills: string[] | null
  interests: string[] | null
  goals: string[] | null
  ai_summary: string | null
  experience: Experience[] | null
  followers_count: number
  following_count: number
  posts_count: number
  created_at: string
}

export type Experience = {
  id: string
  title: string
  company: string
  start_date: string
  end_date: string        // empty string means "Present"
  description: string
}

export type Post = {
  id: string
  author_id: string
  community_id: string | null
  content: string
  image_url: string | null
  likes_count: number
  comments_count: number
  shares_count: number
  created_at: string
  profiles?: Profile
  liked?: boolean
}

export type Comment = {
  id: string
  post_id: string
  author_id: string
  content: string
  created_at: string
  updated_at?: string | null
  profiles?: Profile
}

export type Message = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  created_at: string
  profiles?: Profile
}

export type Community = {
  id: string
  name: string
  description: string | null
  category: string | null
  icon: string | null
  members_count: number
  posts_count: number
  is_public: boolean
  created_at: string
  joined?: boolean
}

export type Notification = {
  id: string
  user_id: string
  actor_id: string | null
  type: string
  post_id: string | null
  message: string | null
  is_read: boolean
  created_at: string
  profiles?: Profile
}
