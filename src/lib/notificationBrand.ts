/** Shared notification branding — Chrome ignores SVG icons; use PNG + absolute URLs. */

export const PI_NOTIF_ICON_PATH = '/pi-logo-192.png'
export const PI_NOTIF_BADGE_PATH = '/pi-badge-96.png'

/** Absolute icon URL for Notification / Push (required for reliable Chrome branding). */
export function notificationIconUrl(origin?: string): string {
  const base =
    origin ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    ''
  return `${base}${PI_NOTIF_ICON_PATH}`
}

export function notificationBadgeUrl(origin?: string): string {
  const base =
    origin ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    ''
  return `${base}${PI_NOTIF_BADGE_PATH}`
}
