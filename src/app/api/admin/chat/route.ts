import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { notifyCustomerOfReply } from '@/lib/chat'
import { CHAT_MAX_LENGTH, type ChatSender } from '@/lib/types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === process.env.ADMIN_EMAIL
}

interface Row {
  user_id: string
  sender: ChatSender
  body: string
  read_at: string | null
  created_at: string
}

/** One row per customer who has ever written in, newest thread first. */
export async function GET() {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('user_id, sender, body, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(5000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as Row[]
  const threads = new Map<string, {
    user_id: string
    last_body: string
    last_sender: ChatSender
    last_at: string
    unread: number
  }>()

  // Rows arrive newest first, so the first one seen for a customer is the latest.
  for (const m of rows) {
    const t = threads.get(m.user_id)
    if (!t) {
      threads.set(m.user_id, {
        user_id: m.user_id,
        last_body: m.body,
        last_sender: m.sender,
        last_at: m.created_at,
        unread: m.sender === 'customer' && !m.read_at ? 1 : 0,
      })
    } else if (m.sender === 'customer' && !m.read_at) {
      t.unread++
    }
  }

  if (threads.size === 0) return NextResponse.json([])

  const [{ data: authData }, { data: profiles }] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    supabaseAdmin.from('profiles').select('id, display_name, phone'),
  ])
  const authMap = new Map((authData?.users ?? []).map(u => [u.id, u]))
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  const result = Array.from(threads.values()).map(t => {
    const u = authMap.get(t.user_id)
    const p = profileMap.get(t.user_id)
    return {
      ...t,
      name: p?.display_name
        || (u?.user_metadata?.full_name as string | undefined)
        || (u?.user_metadata?.name as string | undefined)
        || u?.email
        || '(ไม่ทราบชื่อ)',
      phone: p?.phone || '',
      email: u?.email ?? '',
    }
  }).sort((a, b) => b.last_at.localeCompare(a.last_at))

  return NextResponse.json(result)
}

/** Shop replies to a customer. */
export async function POST(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { user_id, body } = await req.json()
  if (typeof user_id !== 'string' || !user_id) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }
  const text = typeof body === 'string' ? body.trim() : ''
  if (!text) return NextResponse.json({ error: 'พิมพ์ข้อความก่อนส่ง' }, { status: 400 })
  if (text.length > CHAT_MAX_LENGTH) {
    return NextResponse.json({ error: `ข้อความยาวเกิน ${CHAT_MAX_LENGTH} ตัวอักษร` }, { status: 400 })
  }

  const { data: target } = await supabaseAdmin.auth.admin.getUserById(user_id)
  if (!target?.user) return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({ user_id, sender: 'admin', body: text })
    .select('id, sender, body, read_at, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await notifyCustomerOfReply(supabaseAdmin, user_id, text)

  return NextResponse.json(data)
}
