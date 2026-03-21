'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, Plus, Loader2 } from 'lucide-react'

type Invite = {
  id: string
  code: string
  created_at: string
  expires_at: string
  used_at: string | null
  created_by_profile: { username: string } | null
  used_by_profile: { username: string } | null
}

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : '')

  const loadInvites = async () => {
    const res = await fetch('/api/admin/invites')
    if (res.ok) {
      const data = await res.json()
      setInvites(data.invites ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { loadInvites() }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    const res = await fetch('/api/admin/invites', { method: 'POST' })
    if (res.ok) {
      await loadInvites()
    }
    setGenerating(false)
  }

  const copyLink = (code: string, id: string) => {
    navigator.clipboard.writeText(`${appUrl}/invite/${code}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getStatus = (invite: Invite) => {
    if (invite.used_at) return { label: 'Usado', className: 'bg-gray-100 text-gray-600' }
    if (new Date(invite.expires_at) < new Date()) return { label: 'Expirado', className: 'bg-amber-50 text-amber-600' }
    return { label: 'Ativo', className: 'bg-green-50 text-green-600' }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Convites</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 bg-gradient-instagram text-white font-semibold text-sm px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Gerar Convite
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Criado por</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usado por</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expira em</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => {
                  const status = getStatus(invite)
                  const isActive = !invite.used_at && new Date(invite.expires_at) >= new Date()
                  return (
                    <tr key={invite.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{invite.code}</code>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        @{invite.created_by_profile?.username ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {invite.used_by_profile ? `@${invite.used_by_profile.username}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isActive && (
                          <button
                            onClick={() => copyLink(invite.code, invite.id)}
                            className="text-xs font-semibold text-[#DD2A7B] flex items-center gap-1 ml-auto hover:opacity-70"
                          >
                            {copiedId === invite.id ? (
                              <><Check className="w-3.5 h-3.5" /> Copiado</>
                            ) : (
                              <><Copy className="w-3.5 h-3.5" /> Copiar link</>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {invites.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
                      Nenhum convite gerado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
