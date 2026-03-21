'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  userId: string
  currentType: string
}

export default function PromoteDemoteButton({ userId, currentType }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const isInfluencer = currentType === 'influencer'

  const handleClick = async () => {
    const action = isInfluencer ? 'demote' : 'promote'
    const confirmMsg = isInfluencer
      ? 'Rebaixar este influencer para fã? O perfil público será desativado.'
      : 'Promover este fã para influencer? Ele precisará completar o setup de criador.'

    if (!confirm(confirmMsg)) return

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/${action}`, { method: 'PATCH' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Erro ao atualizar usuário')
      } else {
        router.refresh()
      }
    } catch {
      alert('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
        isInfluencer
          ? 'text-red-600 bg-red-50 hover:bg-red-100'
          : 'text-[#DD2A7B] bg-pink-50 hover:bg-pink-100'
      }`}
    >
      {loading ? '...' : isInfluencer ? 'Rebaixar a Fã' : 'Promover a Influencer'}
    </button>
  )
}
