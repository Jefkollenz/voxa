'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CREATOR_NET_RATE, MP_PROCESSING_FEE_ESTIMATE } from '@/lib/constants'
import { trackCreatorSetupComplete } from '@/lib/analytics'

function getPriceBenchmark(price: number): string {
  if (price < 15) return 'Abaixo da média — pode deixar dinheiro na mesa'
  if (price <= 25) return 'Faixa popular — boa conversão para criadores iniciantes'
  if (price <= 50) return 'Faixa recomendada — equilíbrio entre volume e valor'
  if (price <= 100) return 'Faixa premium — ideal para especialistas com audiência engajada'
  return 'Exclusivo — para criadores com forte reputação no nicho'
}

export default function CreatorSetupPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [minPrice, setMinPrice] = useState(10)
  const [dailyLimit, setDailyLimit] = useState(10)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      // Verificar se é influencer com setup pendente
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, account_type, creator_setup_completed')
        .eq('id', user.id)
        .single()

      if (!profile) {
        router.push('/setup')
        return
      }

      if (profile.account_type !== 'influencer' && profile.account_type !== 'admin') {
        router.push('/dashboard')
        return
      }

      if (profile.creator_setup_completed) {
        router.push('/dashboard')
        return
      }

      setUsername(profile.username)
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setIsLoading(true)
    setError('')

    const supabase = createClient()

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        bio: bio.trim() || null,
        min_price: minPrice,
        daily_limit: dailyLimit,
        creator_setup_completed: true,
      })
      .eq('id', userId)

    if (updateError) {
      setError('Erro ao configurar perfil. Tente novamente.')
      setIsLoading(false)
    } else {
      trackCreatorSetupComplete(username, minPrice)
      router.push('/dashboard')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] p-4 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-[#DD2A7B] opacity-10 blur-[70px] md:blur-[120px] rounded-full pointer-events-none -mt-16 sm:-mt-32 -mr-16 sm:-mr-32"></div>
      <div className="absolute -bottom-16 sm:-bottom-32 -left-16 sm:-left-32 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-purple-600 opacity-10 blur-[70px] md:blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#111] rounded-[32px] border border-white/10 p-8 shadow-2xl relative z-10">
        <h1 className="text-2xl font-bold mb-1">Configure seu perfil de criador</h1>
        <p className="text-gray-500 text-sm mb-8">
          Seus fãs enviarão perguntas para <span className="text-white font-medium">voxa.com/perfil/<span className="text-transparent bg-clip-text bg-gradient-instagram">{username || '...'}</span></span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Bio</label>
            <textarea
              placeholder="Descreva o que seus fãs podem te perguntar..."
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={200}
              rows={3}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/40 resize-none"
            />
            <p className="text-right text-xs text-gray-500 mt-1">{bio.length}/200</p>
          </div>

          {/* Preço mínimo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Preço mínimo por pergunta: <span className="text-white font-bold">R$ {minPrice}</span>
            </label>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={minPrice}
              onChange={e => setMinPrice(Number(e.target.value))}
              className="w-full accent-pink-500"
              aria-label={`Preço mínimo: R$ ${minPrice}`}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>R$ 5</span>
              <span>R$ 100</span>
            </div>
            <p className="text-xs text-gray-500 mt-1.5 italic">{getPriceBenchmark(minPrice)}</p>
            <p className="text-xs text-gray-600 mt-0.5">Criadores similares cobram entre R$20–R$50. Você pode alterar isso a qualquer momento.</p>
          </div>

          {/* Limite diário */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Limite de perguntas por dia: <span className="text-white font-bold">{dailyLimit}</span>
            </label>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={dailyLimit}
              onChange={e => setDailyLimit(Number(e.target.value))}
              className="w-full accent-pink-500"
              aria-label={`Limite diário: ${dailyLimit} perguntas`}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1</span>
              <span>50</span>
            </div>
          </div>

          {/* Ganhos estimados */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <p className="text-xs text-gray-500 mb-1">Estimativa mensal com essa configuração:</p>
            <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-instagram">
              R$ {(minPrice * dailyLimit * 30 * (1 - MP_PROCESSING_FEE_ESTIMATE) * CREATOR_NET_RATE).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">estimativa após taxa Voxa (10%) + processamento MP (~1,2%)</p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-instagram rounded-xl py-3 px-4 text-white font-bold disabled:opacity-40 transition-all"
          >
            {isLoading ? 'Salvando...' : 'Ativar meu perfil de criador'}
          </button>
        </form>
      </div>
    </div>
  )
}
