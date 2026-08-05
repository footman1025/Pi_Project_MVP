type Props = {
  size?: number
  className?: string
  rounded?: string
  alt?: string
}

/** Brand mark from cousin’s icon.jpeg → public/pi-logo-*.png */
export default function PiLogo({
  size = 36,
  className = '',
  rounded = 'rounded-xl',
  alt = 'Pi',
}: Props) {
  return (
    <img
      src="/pi-logo-192.png"
      alt={alt}
      width={size}
      height={size}
      className={`${rounded} object-cover shrink-0 ${className}`}
      draggable={false}
    />
  )
}
