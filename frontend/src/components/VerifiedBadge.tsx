type Props = {
  isVerified: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

export default function VerifiedBadge({ isVerified, size = 'md', className = '' }: Props) {
  if (!isVerified) return null

  return (
    <svg
      className={`inline-block shrink-0 ${sizeMap[size]} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Verificado"
      role="img"
    >
      <circle cx="12" cy="12" r="12" fill="#1D9BF0" />
      <path
        d="M9.5 12.5L11 14L15 10"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
