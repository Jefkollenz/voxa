export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import ApprovalActions from './ApprovalActions'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function ApprovalsPage() {
  const adminId = await requireAdmin()
  if (!adminId) redirect('/dashboard')

  // Buscar criadores pendentes de aprovação
  const { data: pending } = await supabaseAdmin
    .from('profiles')
    .select('id, username, avatar_url, bio, social_link, created_at')
    .eq('approval_status', 'pending_review')
    .eq('account_type', 'influencer')
    .order('created_at', { ascending: true })

  // Buscar nichos dos criadores pendentes
  const creatorIds = (pending ?? []).map(p => p.id)
  let nichesMap: Record<string, string[]> = {}

  if (creatorIds.length > 0) {
    const { data: creatorNiches } = await supabaseAdmin
      .from('creator_niches')
      .select('creator_id, niche_id, niches(label)')
      .in('creator_id', creatorIds)

    if (creatorNiches) {
      for (const cn of creatorNiches) {
        const label = (cn as any).niches?.label
        if (label) {
          if (!nichesMap[cn.creator_id]) nichesMap[cn.creator_id] = []
          nichesMap[cn.creator_id].push(label)
        }
      }
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Aprovações de Criadores</h1>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
          {(pending ?? []).length} pendente{(pending ?? []).length !== 1 ? 's' : ''}
        </span>
      </div>

      {(pending ?? []).length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-gray-400 text-lg mb-1">Nenhum criador aguardando aprovação</p>
          <p className="text-gray-400 text-sm">Novos cadastros aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(pending ?? []).map(creator => {
            const avatarUrl = creator.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${creator.username}`
            const niches = nichesMap[creator.id] ?? []
            return (
              <div key={creator.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-start gap-4">
                  <img
                    src={avatarUrl}
                    alt={creator.username}
                    className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-bold text-gray-900">@{creator.username}</h2>
                      <span className="text-xs text-gray-400">
                        {new Date(creator.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {creator.bio && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{creator.bio}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {niches.map(n => (
                        <span key={n} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                          {n}
                        </span>
                      ))}

                      {creator.social_link && (
                        <a
                          href={creator.social_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#DD2A7B] font-semibold hover:underline flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Ver rede social
                        </a>
                      )}
                    </div>

                    <ApprovalActions creatorId={creator.id} username={creator.username} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
