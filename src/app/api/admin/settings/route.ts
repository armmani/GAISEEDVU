import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkAuth() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_auth')?.value === process.env.ADMIN_PASSWORD
}

export async function GET() {
  const { data } = await supabase.from('settings').select('*').single()
  return NextResponse.json(data ?? { is_accepting_orders: true })
}

export async function PATCH(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { is_accepting_orders } = await req.json()
  const { data: existing } = await supabase.from('settings').select('id').single()

  if (existing) {
    await supabase.from('settings').update({ is_accepting_orders }).eq('id', existing.id)
  } else {
    await supabase.from('settings').insert({ is_accepting_orders })
  }

  return NextResponse.json({ ok: true })
}
