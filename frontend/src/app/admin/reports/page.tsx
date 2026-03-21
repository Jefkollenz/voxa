export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import ReportActions from './ReportActions'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const reasonLabels: Record<string, string> = {
  offensive: 'Conteúdo ofensivo',
  harassment: 'Assédio',
  spam: 'Spam',
  threat: 'Ameaça',
  other: 'Outro',
}

const statusLabels: Record<string, { label: string; className: string }> = {
  pending_review: { label: 'Pendente', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  admin_approved: { label: 'Aprovada', className: 'bg-green-50 text-green-600 border-green-200' },
  dismissed: { label: 'Dispensada', className: 'bg-gray-50 text-gray-500 border-gray-200' },
}

export default async function AdminReportsPage() {
  const adminId = await requireAdmin()
  if (!adminId) redirect('/dashboard')

  const { data: reports } = await supabaseAdmin
    .from('question_reports')
    .select(`
      id,
      reason,
      reason_detail,
      status,
      created_at,
      question_id,
      creator_id
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  // Buscar dados relacionados (perguntas e perfis)
  const questionIds = [...new Set((reports ?? []).map(r => r.question_id))]
  const creatorIds = [...new Set((reports ?? []).map(r => r.creator_id))]

  const [{ data: questions }, { data: profiles }] = await Promise.all([
    questionIds.length > 0
      ? supabaseAdmin.from('questions').select('id, content, sender_name, sender_email, price_paid').in('id', questionIds)
      : { data: [] },
    creatorIds.length > 0
      ? supabaseAdmin.from('profiles').select('id, username').in('id', creatorIds)
      : { data: [] },
  ])

  const questionMap = new Map((questions ?? []).map(q => [q.id, q]))
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const h = Math.floor(diff / 3_600_000)
    if (h < 1) return 'Agora'
    if (h < 24) return `${h}h atrás`
    return `${Math.floor(h / 24)}d atrás`
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 md:mb-8">Denúncias</h1>

      {(!reports || reports.length === 0) ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-gray-500">Nenhuma denúncia registrada.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Criador</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pergunta</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Motivo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => {
                const question = questionMap.get(report.question_id)
                const creator = profileMap.get(report.creator_id)
                const statusInfo = statusLabels[report.status] ?? statusLabels.pending_review

                return (
                  <tr key={report.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 text-gray-500 whitespace-nowrap">
                      {timeAgo(report.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-gray-900">@{creator?.username ?? '?'}</span>
                    </td>
                    <td className="px-4 py-4 max-w-[250px]">
                      <p className="text-gray-800 truncate" title={question?.content}>
                        &ldquo;{question?.content ?? '—'}&rdquo;
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        de {question?.sender_name ?? 'Desconhecido'} • R$ {Number(question?.price_paid ?? 0).toFixed(2).replace('.', ',')}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-700">{reasonLabels[report.reason] ?? report.reason}</span>
                      {report.reason_detail && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[150px]" title={report.reason_detail}>
                          {report.reason_detail}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <ReportActions reportId={report.id} currentStatus={report.status} />
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
