import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendTelegram } from '@/lib/telegram'
import { redeemSignupCode, type RedeemResult } from '@/lib/pricing'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return NextResponse.json(data ?? { id: user.id, display_name: '', phone: '', default_address: '' })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { display_name, phone, default_address, telegram_chat_id, signup_code } = body

  const { data: existing } = await supabaseAdmin
    .from('profiles').select('id').eq('id', user.id).maybeSingle()

  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: user.id, display_name, phone, default_address, telegram_chat_id: telegram_chat_id || null, updated_at: new Date().toISOString() })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let code_result: RedeemResult | null = null
  if (typeof signup_code === 'string' && signup_code.trim()) {
    code_result = await redeemSignupCode(supabaseAdmin, user.id, signup_code)
  }

  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID
  if (adminChatId && !existing) {
    const codeLine = code_result === 'applied' ? '\n🎟️ สมัครด้วยโค้ด — ได้ราคาพิเศษ' : ''
    await sendTelegram(adminChatId, `🆕 <b>สมาชิกใหม่!</b>\n👤 ${display_name || '—'}\n📞 ${phone || '—'}${codeLine}`)
  }

  return NextResponse.json({ ok: true, code_result })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { display_name, phone, default_address, telegram_chat_id } = body

  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: user.id, display_name, phone, default_address, telegram_chat_id: telegram_chat_id || null, updated_at: new Date().toISOString() })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
