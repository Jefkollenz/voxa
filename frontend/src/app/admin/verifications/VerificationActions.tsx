'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  requestId: string
  currentStatus: string
}

export default function VerificationActions({ requestId, currentStatus }: Props) {
  const [loading, setLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const router = useRouter()

  const isProcessed = currentStatus === 'approved' || currentStatus === 'rejected'

  async function handleAction(action: 'approve' | 'reject') {
    if (action === 'approve') {
      if (!window.confirm('Aprovar verificação? O criador receberá a badge de verificado.')) return
    }

    if (action === 'reject' && !rejectionReason.trim()) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/verifications/${requestId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejection_reason: rejectionReason.trim() || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro na requisição')
      }
      router.refresh()
    } catch (err: any) {
      alert(err.message ?? 'Erro ao processar solicitação.')
    } finally {
      setLoading(false)
    }
  }

  if (isProcessed) {
    return (
      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
        currentStatus === 'approved'
          ? 'bg-green-50 text-green-600 border border-green-200'
          : 'bg-red-50 text-red-600 border border-red-200'
      }`}>
        {currentStatus === 'approved' ? 'Aprovada' : 'Rejeitada'}
      </span>
    )
  }

  if (showRejectForm) {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <textarea
          value={rejectionReason}
          onChange={e => setRejectionReason(e.target.value)}
          placeholder="Motivo da rejeição (obrigatório)..."
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={() => handleAction('reject')}
            disabled={loading || !rejectionReason.trim()}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {loading ? '...' : 'Confirmar'}
          </button>
          <button
            onClick={() => { setShowRejectForm(false); setRejectionReason('') }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleAction('approve')}
        disabled={loading}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg border bg-green-50 text-green-600 border-green-200 hover:bg-green-100 transition-colors disabled:opacity-50"
      >
        {loading ? '...' : 'Aprovar'}
      </button>
      <button
        onClick={() => setShowRejectForm(true)}
        disabled={loading}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
      >
        Rejeitar
      </button>
    </div>
  )
}
