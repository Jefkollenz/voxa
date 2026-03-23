import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminUser } from '@/lib/admin'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  if (params.id === adminUser.id) {
    return NextResponse.json({ error: 'Não é possível alterar sua própria conta' }, { status: 422 })
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({
      account_type: 'influencer',
      creator_setup_completed: true,
      approval_status: 'approved',
    })
    .eq('id', params.id)
    .eq('account_type', 'fan')
    .select('id')

  if (error) {
    return NextResponse.json({ error: 'Erro ao promover usuário' }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Usuário não encontrado ou não é fã' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
