'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ApprovalActions({ creatorId, username }: { creatorId: string; username: string }) {
  const router = useRouter()
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null)

  const handleApprove = async () => {
    setIsApproving(true)
    setError('')

    const res = await fetch('/api/admin/approvals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator_id: creatorId, action: 'approve' }),
    })

    if (res.ok) {
      setDone('approved')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erro ao aprovar')
    }
    setIsApproving(false)
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Informe o motivo da rejeição')
      return
    }
    setIsRejecting(true)
    setError('')

    const res = await fetch('/api/admin/approvals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creator_id: creatorId,
        action: 'reject',
        rejection_reason: rejectionReason.trim(),
      }),
    })

    if (res.ok) {
      setDone('rejected')
      setShowRejectModal(false)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erro ao rejeitar')
    }
    setIsRejecting(false)
  }

  if (done === 'approved') {
    return (
      <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg text-sm font-semibold">
        <span className="w-2 h-2 rounded-full bg-green-500"></span>
        Aprovado
      </div>
    )
  }

  if (done === 'rejected') {
    return (
      <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-sm font-semibold">
        <span className="w-2 h-2 rounded-full bg-red-500"></span>
        Rejeitado
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleApprove}
          disabled={isApproving}
          className="min-h-[36px] bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {isApproving ? 'Aprovando...' : 'Aprovar'}
        </button>
        <button
          onClick={() => setShowRejectModal(true)}
          className="min-h-[36px] border border-red-300 text-red-600 text-sm font-bold px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
        >
          Rejeitar
        </button>
      </div>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      {/* Modal de rejeição */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-lg text-gray-900 mb-1">Rejeitar @{username}</h3>
            <p className="text-sm text-gray-500 mb-4">O criador verá este motivo e poderá corrigir e reenviar.</p>

            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Motivo da rejeição..."
              rows={3}
              maxLength={500}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4"
            />

            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowRejectModal(false); setError('') }}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={isRejecting}
                className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isRejecting ? 'Rejeitando...' : 'Confirmar rejeição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
