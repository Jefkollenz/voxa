'use client'

type Props = {
  mode: 'fan' | 'creator'
  onModeChange: (mode: 'fan' | 'creator') => void
}

export default function DashboardModeToggle({ mode, onModeChange }: Props) {
  return (
    <div className="flex bg-gray-100 rounded-full p-0.5 border border-gray-200">
      <button
        type="button"
        onClick={() => onModeChange('fan')}
        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
          mode === 'fan'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Modo Fã
      </button>
      <button
        type="button"
        onClick={() => onModeChange('creator')}
        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
          mode === 'creator'
            ? 'bg-gradient-instagram text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Modo Criador
      </button>
    </div>
  )
}
