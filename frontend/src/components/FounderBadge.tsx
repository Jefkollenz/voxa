type Props = {
  isFounder: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'text-[9px] px-1.5 py-0.5',
  md: 'text-[10px] px-2 py-0.5',
  lg: 'text-[12px] px-2.5 py-1',
}

export default function FounderBadge({ isFounder, size = 'md', className = '' }: Props) {
  if (!isFounder) return null

  return (
    <span
      className={`inline-flex shrink-0 bg-gradient-to-r from-[#833ab4] to-[#fcb045] rounded-full p-[1px] shadow-[0_0_8px_rgba(131,58,180,0.4)] ${className}`}
      title="Criador pioneiro — Membro do grupo exclusivo de fundadores da VOXA"
    >
      <span className={`bg-black/80 text-white font-bold tracking-widest rounded-full ${sizeMap[size]}`}>
        FOUNDER
      </span>
    </span>
  )
}
