import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { applyDocumentSeo, resolveSeo } from '../lib/seo'

/**
 * Applies per-route title, description, robots, Open Graph, Twitter, canonical, JSON-LD.
 * Profile pages manage their own richer Person schema — skip when under /p/.
 */
export default function SeoHead() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (pathname.startsWith('/p/')) return
    applyDocumentSeo(resolveSeo(pathname))
  }, [pathname])

  return null
}
