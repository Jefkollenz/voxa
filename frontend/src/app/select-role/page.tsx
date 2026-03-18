'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SelectRolePage() {
  const router = useRouter()
  const [isCreator, setIsCreator] = useState(false)
  const [isFan, setIsFan] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingFan, setIsCreatingFan] = useState(false)

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: profile }, { data: fanProfile }] = await Promise.all([
        supabase.from('profiles').select('id').eq('id', user.id).single(),
        supabase.from('fan_profiles').select('id').eq('id', user.id).single(),
      ])

      setIsCreator(!!profile)
      setIsFan(!!fanProfile)
      setIsLoading(false)
    }
    check()
  }, [router])

  const handleBecomeFan = async () => {
    setIsCreatingFan(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Criar fan_profile se não existir
    if (!isFan) {
      await supabase.from('fan_profiles').insert({
        id: user.id,
        name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Fã',
        email: user.email,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      })

      // Vincular perguntas antigas pelo email
      if (user.email) {
        await supabase.rpc('link_fan_questions', {
          p_fan_id: user.id,
          p_email: user.email,
        })
      }
    }

    router.push('/fan/dashboard')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#DD2A7B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold text-gradient-instagram mb-2">VOXA</h1>
      <p className="text-gray-400 text-sm mb-10">Como você quer continuar?</p>

      <div className="w-full max-w-sm space-y-4">
        {/* Opção: Dashboard do Criador */}
        {isCreator ? (
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-[#111] border border-white/10 rounded-2xl p-6 text-left hover:border-[#DD2A7B]/50 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-instagram flex items-center justify-center text-2xl shrink-0">
                🎤
              </div>
              <div>
                <p className="font-bold text-white group-hover:text-[#DD2A7B] transition-colors">Dashboard Criador</p>
                <p className="text-sm text-gray-500 mt-0.5">Responder perguntas e gerenciar seu perfil</p>
              </div>
            </div>
          </button>
        ) : (
          <button
            onClick={() => router.push('/setup')}
            className="w-full bg-[#111] border border-white/10 rounded-2xl p-6 text-left hover:border-[#DD2A7B]/50 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-2xl shrink-0">
                🎤
              </div>
              <div>
                <p className="font-bold text-white group-hover:text-[#DD2A7B] transition-colors">Quero ser Criador</p>
                <p className="text-sm text-gray-500 mt-0.5">Configurar meu perfil e começar a receber perguntas</p>
              </div>
            </div>
          </button>
        )}

        {/* Opção: Dashboard do Fã */}
        <button
          onClick={handleBecomeFan}
          disabled={isCreatingFan}
          className="w-full bg-[#111] border border-white/10 rounded-2xl p-6 text-left hover:border-[#8134AF]/50 transition-colors group disabled:opacity-50"
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0 ${isFan ? 'bg-gradient-to-br from-[#8134AF] to-[#DD2A7B]' : 'bg-white/5'}`}>
              💬
            </div>
            <div>
              <p className="font-bold text-white group-hover:text-[#8134AF] transition-colors">
                {isCreatingFan ? 'Entrando...' : 'Minhas Perguntas'}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">Ver respostas e baixar áudios dos criadores</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
