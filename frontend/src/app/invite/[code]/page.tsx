'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const code = params.code as string

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired' | 'used' | 'already_influencer' | 'processing' | 'success'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Fetch invite to show status
      const { data: invite } = await supabase
        .from('invite_links')
        .select('id, code, used_by, expires_at')
        .eq('code', code)
        .single()

      if (!invite) {
        setStatus('invalid')
        return
      }

      if (invite.used_by) {
        setStatus('used')
        return
      }

      if (new Date(invite.expires_at) < new Date()) {
        setStatus('expired')
        return
      }

      if (!user) {
        // Save code and redirect to login
        localStorage.setItem('voxa_invite_code', code)
        router.push(`/login?inviteCode=${code}`)
        return
      }

      // User is logged in — check their type
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', user.id)
        .single()

      if (!profile) {
        // No profile yet — save invite code and redirect to setup
        localStorage.setItem('voxa_invite_code', code)
        router.push('/setup')
        return
      }

      if (profile.account_type === 'influencer' || profile.account_type === 'admin') {
        setStatus('already_influencer')
        return
      }

      // Fan with valid invite — redeem via server-side API
      setStatus('processing')
      try {
        const res = await fetch('/api/invite/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })

        if (!res.ok) {
          const data = await res.json()
          if (data.error === 'already_influencer') {
            setStatus('already_influencer')
            return
          }
          if (data.error === 'used') {
            setStatus('used')
            return
          }
          if (data.error === 'expired') {
            setStatus('expired')
            return
          }
          throw new Error(data.error || 'Erro ao processar convite')
        }

        setStatus('success')
        setTimeout(() => router.push('/setup/creator'), 2000)
      } catch (e: any) {
        setError(e.message || 'Erro ao processar convite')
        setStatus('invalid')
      }
    }

    check()
  }, [code, router])

  const messages: Record<string, { title: string; desc: string }> = {
    loading: { title: 'Verificando convite...', desc: 'Aguarde um momento.' },
    processing: { title: 'Ativando seu convite...', desc: 'Estamos promovendo sua conta.' },
    success: { title: 'Convite aceito!', desc: 'Você agora é um influencer! Redirecionando para configurar seu perfil...' },
    invalid: { title: 'Convite inválido', desc: error || 'Este link de convite não existe ou não é válido.' },
    expired: { title: 'Convite expirado', desc: 'Este convite já expirou. Solicite um novo convite ao administrador.' },
    used: { title: 'Convite já utilizado', desc: 'Este convite já foi usado por outro usuário.' },
    already_influencer: { title: 'Você já é influencer!', desc: 'Sua conta já possui acesso de influencer.' },
  }

  const msg = messages[status]

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] p-4 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-[#DD2A7B] opacity-10 blur-[70px] md:blur-[120px] rounded-full pointer-events-none -mt-16 sm:-mt-32 -mr-16 sm:-mr-32"></div>
      <div className="absolute -bottom-16 sm:-bottom-32 -left-16 sm:-left-32 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-purple-600 opacity-10 blur-[70px] md:blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#111] rounded-[32px] border border-white/10 p-8 shadow-2xl relative z-10 text-center">
        {(status === 'loading' || status === 'processing') && (
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
        )}

        {status === 'success' && (
          <div className="w-16 h-16 bg-gradient-instagram rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        <h1 className="text-2xl font-bold mb-2">{msg.title}</h1>
        <p className="text-gray-400 text-sm mb-6">{msg.desc}</p>

        {(status === 'invalid' || status === 'expired' || status === 'used') && (
          <Link
            href="/dashboard"
            className="inline-block bg-white/10 hover:bg-white/20 text-white font-medium text-sm px-6 py-3 rounded-xl transition-colors"
          >
            Ir para o Dashboard
          </Link>
        )}

        {status === 'already_influencer' && (
          <Link
            href="/dashboard"
            className="inline-block bg-gradient-instagram text-white font-bold text-sm px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            Ir para o Dashboard
          </Link>
        )}
      </div>
    </div>
  )
}
