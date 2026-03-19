import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase
    .from('profiles')
    .update({ questions_answered_today: 0 })
    .gte('questions_answered_today', 0)

  if (error) {
    console.error('[cron/reset-daily] erro:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('[cron/reset-daily] reset concluído às', new Date().toISOString())
  return NextResponse.json({ ok: true })
}
