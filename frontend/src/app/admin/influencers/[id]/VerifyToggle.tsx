'use client'

import { useState } from 'react'

type Props = {
  creatorId: string
  isVerified: boolean
  username: string
}

export default function VerifyToggle({ creatorId, isVerified, username }: Props) {
  const [verified, setVerified] = useState(isVerified)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    const action = verified ? 'remover verificação de' : 'verificar'
    const confirmed = window.confirm(
      `Tem certeza que deseja ${action} @${username}?`
    )
    if (!confirmed) return

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/influencers/${creatorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_verified: !verified }),
      })
      if (!res.ok) throw new Error('Erro na requisição')
      setVerified(!verified)
    } catch {
      alert('Erro ao atualizar verificação do criador.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
        verified
          ? 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
          : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
      }`}
    >
      {loading ? '...' : verified ? 'Remover verificação' : 'Verificar manualmente'}
    </button>
  )
}
