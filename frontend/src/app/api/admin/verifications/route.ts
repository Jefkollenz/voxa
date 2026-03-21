import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { data: requests, error } = await supabaseAdmin
    .from('verification_requests')
    .select('id, creator_id, social_link, document_url, status, rejection_reason, reviewed_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar solicitações' }, { status: 500 })
  }

  // Buscar profiles dos criadores
  const creatorIds = [...new Set((requests ?? []).map(r => r.creator_id))]
  const { data: profiles } = creatorIds.length > 0
    ? await supabaseAdmin.from('profiles').select('id, username, avatar_url').in('id', creatorIds)
    : { data: [] }

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  // Gerar signed URLs para os documentos
  const enriched = await Promise.all(
    (requests ?? []).map(async (req) => {
      const { data: signedUrl } = await supabaseAdmin.storage
        .from('verification-docs')
        .createSignedUrl(req.document_url, 60 * 60) // 60 min

      return {
        ...req,
        document_signed_url: signedUrl?.signedUrl ?? null,
        creator: profileMap.get(req.creator_id) ?? null,
      }
    })
  )

  return NextResponse.json({ requests: enriched })
}
