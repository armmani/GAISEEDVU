import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendTelegram } from '@/lib/telegram'
import { ORDER_STATUS_LABEL, type OrderStatus } from '@/lib/types'

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

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await req.json()
  const { error } = await supabaseAdmin.from('orders').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify customer via Telegram
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, customer_name, quantity, user_id')
    .eq('id', id)
    .single()

  if (order?.user_id) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('telegram_chat_id')
      .eq('id', order.user_id)
      .single()

    if (profile?.telegram_chat_id) {
      const statusEmoji: Record<OrderStatus, string> = {
        confirmed: '✅', ready: '🎉', completed: '🏁', cancelled: '❌', pending: '⏳',
      }
      const emoji = statusEmoji[status as OrderStatus] ?? '📦'
      const msg = [
        `${emoji} <b>GAI SEED VU</b>`,
        `ออเดอร์ #${order.id.slice(0, 6).toUpperCase()} ของคุณ`,
        `สถานะ: <b>${ORDER_STATUS_LABEL[status as OrderStatus]}</b>`,
        status === 'ready' ? '🐔 ไก่พร้อมแล้ว! นัดรับได้เลยนะคะ' : null,
        status === 'confirmed' ? '👩‍🍳 ยืนยันออเดอร์แล้ว กำลังเตรียมไก่ให้เลยค่ะ' : null,
      ].filter(Boolean).join('\n')
      await sendTelegram(profile.telegram_chat_id, msg)
    }
  }

  return NextResponse.json({ ok: true })
}
