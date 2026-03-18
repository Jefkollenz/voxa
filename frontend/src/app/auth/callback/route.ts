import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin: defaultOrigin } = new URL(request.url)
  const code = searchParams.get('code')

  // No Render, o request.url vem como localhost. Devemos forçar pela ENV do app original.
  const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || defaultOrigin

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[auth/callback] Erro ao trocar código por sessão:', error.message)
    }

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Verificar se é criador e/ou fã
        const [{ data: profile }, { data: fanProfile }] = await Promise.all([
          supabase.from('profiles').select('id').eq('id', user.id).single(),
          supabase.from('fan_profiles').select('id').eq('id', user.id).single(),
        ])

        const isCreator = !!profile
        const isFan = !!fanProfile

        if (isCreator && isFan) {
          return NextResponse.redirect(`${origin}/select-role`)
        }
        if (isCreator) {
          return NextResponse.redirect(`${origin}/dashboard`)
        }
        if (isFan) {
          return NextResponse.redirect(`${origin}/fan/dashboard`)
        }

        // Nenhum perfil — redirecionar para escolha de papel
        return NextResponse.redirect(`${origin}/select-role`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
