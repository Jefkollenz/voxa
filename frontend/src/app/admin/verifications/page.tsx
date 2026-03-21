import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import VerificationActions from './VerificationActions'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  approved: { label: 'Aprovada', className: 'bg-green-50 text-green-600 border-green-200' },
  rejected: { label: 'Rejeitada', className: 'bg-red-50 text-red-600 border-red-200' },
}

export default async function AdminVerificationsPage() {
  const adminId = await requireAdmin()
  if (!adminId) redirect('/dashboard')

  const { data: requests } = await supabaseAdmin
    .from('verification_requests')
    .select('id, creator_id, social_link, document_url, status, rejection_reason, reviewed_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  // Buscar profiles dos criadores
  const creatorIds = [...new Set((requests ?? []).map(r => r.creator_id))]
  const { data: profiles } = creatorIds.length > 0
    ? await supabaseAdmin.from('profiles').select('id, username, avatar_url').in('id', creatorIds)
    : { data: [] }

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  // Gerar signed URLs para documentos
  const enrichedRequests = await Promise.all(
    (requests ?? []).map(async (req) => {
      const { data: signedUrl } = await supabaseAdmin.storage
        .from('verification-docs')
        .createSignedUrl(req.document_url, 60 * 60) // 60 min

      return {
        ...req,
        document_signed_url: signedUrl?.signedUrl ?? null,
        creator: profileMap.get(req.creator_id) ?? null,
      }
    })
  )

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const h = Math.floor(diff / 3_600_000)
    if (h < 1) return 'Agora'
    if (h < 24) return `${h}h atrás`
    return `${Math.floor(h / 24)}d atrás`
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 md:mb-8">Verificações</h1>

      {enrichedRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-gray-500">Nenhuma solicitação de verificação.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Criador</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rede Social</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Documento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody>
              {enrichedRequests.map(req => {
                const statusInfo = statusLabels[req.status] ?? statusLabels.pending

                return (
                  <tr key={req.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 text-gray-500 whitespace-nowrap">
                      {timeAgo(req.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {req.creator?.avatar_url && (
                          <img
                            src={req.creator.avatar_url}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        )}
                        <span className="font-medium text-gray-900">@{req.creator?.username ?? '?'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <a
                        href={req.social_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-xs truncate max-w-[180px] block"
                        title={req.social_link}
                      >
                        {req.social_link}
                      </a>
                    </td>
                    <td className="px-4 py-4">
                      {req.document_signed_url ? (
                        <a
                          href={req.document_signed_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver documento
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">Indisponível</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                      {req.status === 'rejected' && req.rejection_reason && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[150px]" title={req.rejection_reason}>
                          {req.rejection_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <VerificationActions requestId={req.id} currentStatus={req.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
