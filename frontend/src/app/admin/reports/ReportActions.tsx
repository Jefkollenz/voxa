'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  reportId: string
  currentStatus: string
}

export default function ReportActions({ reportId, currentStatus }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const isProcessed = currentStatus === 'admin_approved' || currentStatus === 'dismissed'

  async function handleAction(action: 'approve' | 'dismiss') {
    const label = action === 'approve'
      ? 'Aprovar denúncia? O criador ficará com o dinheiro e a pergunta será removida sem estorno.'
      : 'Dispensar denúncia? A pergunta voltará para a fila do criador.'

    if (!window.confirm(label)) return

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro na requisição')
      }
      router.refresh()
    } catch (err: any) {
      alert(err.message ?? 'Erro ao processar denúncia.')
    } finally {
      setLoading(false)
    }
  }

  if (isProcessed) {
    return (
      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
        currentStatus === 'admin_approved'
          ? 'bg-green-50 text-green-600 border border-green-200'
          : 'bg-gray-50 text-gray-500 border border-gray-200'
      }`}>
        {currentStatus === 'admin_approved' ? 'Aprovada' : 'Dispensada'}
      </span>
    )
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleAction('approve')}
        disabled={loading}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
      >
        {loading ? '...' : 'Aprovar'}
      </button>
      <button
        onClick={() => handleAction('dismiss')}
        disabled={loading}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg border bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        {loading ? '...' : 'Dispensar'}
      </button>
    </div>
  )
}
