import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import PromoteDemoteButton from './PromoteDemoteButton'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { filter?: string }
}) {
  const adminId = await requireAdmin()
  if (!adminId) redirect('/dashboard')

  const filter = searchParams.filter ?? 'all'

  let query = supabaseAdmin
    .from('profiles')
    .select('id, username, avatar_url, account_type, is_active, creator_setup_completed, created_at')
    .order('created_at', { ascending: false })

  if (filter === 'fans') query = query.eq('account_type', 'fan')
  if (filter === 'influencers') query = query.eq('account_type', 'influencer')
  if (filter === 'admins') query = query.eq('account_type', 'admin')

  const { data: users } = await query

  const filters = [
    { key: 'all', label: 'Todos' },
    { key: 'fans', label: 'Fãs' },
    { key: 'influencers', label: 'Influencers' },
    { key: 'admins', label: 'Admins' },
  ]

  const typeBadge = (type: string) => {
    switch (type) {
      case 'admin':
        return <span className="inline-flex items-center bg-purple-50 text-purple-600 border border-purple-200 text-xs font-semibold px-2 py-0.5 rounded-full">Admin</span>
      case 'influencer':
        return <span className="inline-flex items-center bg-pink-50 text-[#DD2A7B] border border-pink-200 text-xs font-semibold px-2 py-0.5 rounded-full">Influencer</span>
      default:
        return <span className="inline-flex items-center bg-gray-50 text-gray-600 border border-gray-200 text-xs font-semibold px-2 py-0.5 rounded-full">Fã</span>
    }
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Usuários</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'all' ? '/admin/users' : `/admin/users?filter=${f.key}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuário</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cadastro</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((user) => {
                const avatarUrl = user.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
                const joinedAt = new Date(user.created_at).toLocaleDateString('pt-BR')
                return (
                  <tr key={user.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={avatarUrl} alt={user.username} className="w-8 h-8 rounded-full object-cover" />
                        <span className="font-medium text-gray-900">@{user.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">{typeBadge(user.account_type)}</td>
                    <td className="px-6 py-4 text-center">
                      {user.is_active === false ? (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Banido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 border border-green-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span> Ativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{joinedAt}</td>
                    <td className="px-6 py-4 text-right">
                      {user.account_type !== 'admin' && (
                        <PromoteDemoteButton
                          userId={user.id}
                          currentType={user.account_type}
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
              {(users ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">Nenhum usuário encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
