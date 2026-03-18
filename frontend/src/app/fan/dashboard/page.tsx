import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FanQuestionList from './FanQuestionList'

type FanQuestion = {
  id: string
  creator_id: string
  sender_name: string
  content: string
  status: string
  price_paid: number
  service_type: string
  response_text: string | null
  response_audio_url: string | null
  answered_at: string | null
  created_at: string
  creator: {
    username: string
    avatar_url: string | null
  }
}

export default async function FanDashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Verificar se tem fan_profile
  const { data: fanProfile } = await supabase
    .from('fan_profiles')
    .select('id, name, avatar_url')
    .eq('id', user.id)
    .single()

  if (!fanProfile) redirect('/select-role')

  // Buscar perguntas do fã com dados do criador
  const { data: questions } = await supabase
    .from('questions')
    .select(`
      id, creator_id, sender_name, content, status, price_paid,
      service_type, response_text, response_audio_url, answered_at, created_at,
      creator:profiles!creator_id(username, avatar_url)
    `)
    .eq('fan_id', user.id)
    .order('created_at', { ascending: false })
    .returns<FanQuestion[]>()

  // Verificar se também é criador
  const { data: creatorProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  const fanQuestions = questions ?? []
  const totalSpent = fanQuestions.reduce((sum, q) => sum + Number(q.price_paid), 0)
  const totalAnswered = fanQuestions.filter(q => q.status === 'answered').length
  const avatarUrl = fanProfile.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${fanProfile.name}`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <a href="/" className="font-bold text-xl text-gradient-instagram">VOXA</a>
          </div>
          <div className="flex items-center gap-3">
            {creatorProfile && (
              <a href="/dashboard" className="text-xs text-gray-400 hover:text-[#DD2A7B] transition-colors font-medium">
                Dashboard Criador
              </a>
            )}
            <img
              src={avatarUrl}
              alt={fanProfile.name ?? 'Fã'}
              className="w-8 h-8 rounded-full object-cover border border-gray-200"
            />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Saudação */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {fanProfile.name?.split(' ')[0] ?? 'Fã'} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">Acompanhe suas perguntas e respostas</p>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-gray-900">{fanQuestions.length}</p>
            <p className="text-xs text-gray-500 mt-1">Perguntas</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-green-600">{totalAnswered}</p>
            <p className="text-xs text-gray-500 mt-1">Respondidas</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-[#DD2A7B]">R$ {totalSpent.toFixed(2).replace('.', ',')}</p>
            <p className="text-xs text-gray-500 mt-1">Total gasto</p>
          </div>
        </div>

        {/* Lista de perguntas (Client Component com filtros e download) */}
        <FanQuestionList questions={fanQuestions} />
      </main>
    </div>
  )
}
