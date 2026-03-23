import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  // Verificar autenticação
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const { code } = body

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Código de convite inválido' }, { status: 400 })
  }

  // Buscar perfil do usuário
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('account_type')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
  }

  if (profile.account_type === 'influencer' || profile.account_type === 'admin') {
    return NextResponse.json({ error: 'already_influencer' }, { status: 409 })
  }

  // Buscar e validar convite atomicamente com FOR UPDATE (via service_role)
  // Usar service_role para bypassar RLS e garantir atomicidade
  const { data: invite } = await supabaseAdmin
    .from('invite_links')
    .select('id, used_by, expires_at')
    .eq('code', code)
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'invalid' }, { status: 404 })
  }

  if (invite.used_by) {
    return NextResponse.json({ error: 'used' }, { status: 410 })
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 })
  }

  // Marcar convite como usado PRIMEIRO (previne race condition)
  // O filtro used_by IS NULL + expires_at > now garante atomicidade completa
  const { data: updatedInvite, error: inviteError } = await supabaseAdmin
    .from('invite_links')
    .update({ used_by: user.id, used_at: new Date().toISOString() })
    .eq('id', invite.id)
    .is('used_by', null)
    .gt('expires_at', new Date().toISOString())
    .select('id')
    .single()

  if (inviteError || !updatedInvite) {
    // Outra requisição já usou este convite
    return NextResponse.json({ error: 'used' }, { status: 410 })
  }

  // Promover usuário a influencer (via service_role, bypassa o trigger)
  const { error: promoteError } = await supabaseAdmin
    .from('profiles')
    .update({ account_type: 'influencer', creator_setup_completed: false, approval_status: 'approved' })
    .eq('id', user.id)

  if (promoteError) {
    // Reverter o convite se a promoção falhar
    await supabaseAdmin
      .from('invite_links')
      .update({ used_by: null, used_at: null })
      .eq('id', invite.id)
    return NextResponse.json({ error: 'Erro ao promover usuário' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
