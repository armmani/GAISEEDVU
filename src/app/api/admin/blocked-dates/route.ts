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
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabaseAdmin
    .from('blocked_dates')
    .select('*')
    .order('start_date', { ascending: true })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { start_date, end_date, note } = await req.json()
  if (!start_date || !end_date) return NextResponse.json({ error: 'start_date and end_date required' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('blocked_dates')
    .insert({ start_date, end_date: end_date >= start_date ? end_date : start_date, note: note || null })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, start_date, end_date, note } = await req.json()
  if (!id || !start_date || !end_date) return NextResponse.json({ error: 'id, start_date and end_date required' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('blocked_dates')
    .update({ start_date, end_date: end_date >= start_date ? end_date : start_date, note: note || null })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await supabaseAdmin.from('blocked_dates').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
