type Props = {
  size?: number
  className?: string
  rounded?: string
  alt?: string
  /**
   * Dark UI surfaces: invert black mark to white (SVG) or keep white-plate PNG as-is.
   * Light surfaces (e.g. emails, print): leave natural black mark.
   */
  onDark?: boolean
  /**
   * Prefer SVG vector mark. Default is the official raster π plate (latest brand).
   */
  vector?: boolean
}

/**
 * Pi brand mark — Cristian’s official assets (updated Sep 2026):
 * - Logo Image: /pi_logo.png
 * - App icons: /pi-logo-192.png, /pi-logo-512.png
 */
export default function PiLogo({
  size = 36,
  className = '',
  rounded = 'rounded-xl',
  alt = 'Pi',
  onDark = true,
  vector = false,
}: Props) {
  const src = vector ? '/pi_logo.svg' : '/pi_logo.png'

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={[
        rounded,
        'object-contain shrink-0 bg-white',
        onDark && vector ? 'invert' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      draggable={false}
      onError={e => {
        const el = e.currentTarget
        if (el.src.includes('pi_logo.svg') || el.src.includes('pi_logo.png')) {
          el.src = '/pi-logo-192.png'
          el.classList.remove('invert')
          el.classList.add('bg-white')
        }
      }}
    />
  )
}
