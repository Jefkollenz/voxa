import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminUser } from '@/lib/admin'
import { randomUUID } from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const adminId = await getAdminUser()
  if (!adminId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { data: invites, error } = await supabaseAdmin
    .from('invite_links')
    .select('*, created_by_profile:profiles!created_by(username), used_by_profile:profiles!used_by(username)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar convites' }, { status: 500 })
  }

  return NextResponse.json({ invites })
}

export async function POST() {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const code = randomUUID().slice(0, 12)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: invite, error } = await supabaseAdmin
    .from('invite_links')
    .insert({
      code,
      created_by: adminUser.id,
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Erro ao gerar convite' }, { status: 500 })
  }

  return NextResponse.json({ invite })
}
