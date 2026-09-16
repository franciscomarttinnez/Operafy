type BrandMarkProps = {
  className?: string
  alt?: string
}

export function BrandMark({
  className = 'h-8 w-8 rounded-lg',
  alt = 'Operafy',
}: BrandMarkProps) {
  return (
    <img
      src="/brand-mark.png"
      alt={alt}
      className={className}
      width={32}
      height={32}
      decoding="async"
    />
  )
}
