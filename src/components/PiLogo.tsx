type Props = {
  size?: number
  className?: string
  rounded?: string
  alt?: string
  /**
   * Dark UI surfaces: invert black SVG mark to white.
   * Light surfaces (e.g. emails, print): leave natural black mark.
   */
  onDark?: boolean
  /** Prefer raster PNG (white plate) instead of SVG mark */
  raster?: boolean
}

/**
 * Pi brand mark — Cristian’s official assets:
 * - Logo SVG: /pi_logo.svg
 * - Logo Image: /pi_logo.png
 */
export default function PiLogo({
  size = 36,
  className = '',
  rounded = 'rounded-xl',
  alt = 'Pi',
  onDark = true,
  raster = false,
}: Props) {
  const src = raster ? '/pi_logo.png' : '/pi_logo.svg'

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={[
        rounded,
        'object-contain shrink-0',
        onDark && !raster ? 'invert' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      draggable={false}
      onError={e => {
        const el = e.currentTarget
        if (el.src.includes('pi_logo.svg')) {
          el.src = '/pi_logo.png'
          el.classList.remove('invert')
        } else if (!el.src.includes('pi-logo-192')) {
          el.src = '/pi-logo-192.png'
        }
      }}
    />
  )
}
