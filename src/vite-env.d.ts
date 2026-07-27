/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GROQ_API_KEY?: string
  readonly VITE_GROQ_ENABLED?: string
  readonly VITE_GROQ_MODEL?: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
