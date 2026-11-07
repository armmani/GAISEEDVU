import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { notifyAdminOfMessage } from '@/lib/chat'
import { CHAT_MAX_LENGTH } from '@/lib/types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthUser() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/** The customer's own thread. Opening it marks the shop's replies as read. */
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('id, sender, body, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const unreadFromShop = (data ?? []).some(m => m.sender === 'admin' && !m.read_at)
  if (unreadFromShop) {
    await supabaseAdmin
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('sender', 'admin')
      .is('read_at', null)
  }

  return NextResponse.json(data ?? [])
}

/** Customer sends a message to the shop. */
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { body } = await req.json()
  const text = typeof body === 'string' ? body.trim() : ''
  if (!text) return NextResponse.json({ error: 'พิมพ์ข้อความก่อนส่งนะคะ' }, { status: 400 })
  if (text.length > CHAT_MAX_LENGTH) {
    return NextResponse.json({ error: `ข้อความยาวเกิน ${CHAT_MAX_LENGTH} ตัวอักษร` }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({ user_id: user.id, sender: 'customer', body: text })
    .select('id, sender, body, read_at, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const name = profile?.display_name
    || (user.user_metadata?.full_name as string | undefined)
    || user.email
    || 'ลูกค้า'

  await notifyAdminOfMessage(supabaseAdmin, name, text)

  return NextResponse.json(data)
}
