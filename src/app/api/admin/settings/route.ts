import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === process.env.ADMIN_EMAIL
}

export async function GET() {
  const { data } = await supabaseAdmin.from('settings').select('*').single()
  return NextResponse.json(data ?? { is_accepting_orders: true })
}

export async function PATCH(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { is_accepting_orders } = await req.json()
  const { data: existing } = await supabaseAdmin.from('settings').select('id').single()

  if (existing) {
    await supabaseAdmin.from('settings').update({ is_accepting_orders }).eq('id', existing.id)
  } else {
    await supabaseAdmin.from('settings').insert({ is_accepting_orders })
  }

  return NextResponse.json({ ok: true })
}
