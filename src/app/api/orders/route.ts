import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendTelegram } from '@/lib/telegram'
import { SALT_LEVEL_LABEL, type SaltLevel } from '@/lib/types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await req.json()
    const { customer_name, phone, quantity, total_amount, delivery_type, pickup_location, delivery_address, pickup_date, note, salt_level, no_pepper, sesame_oil } = body

    if (!customer_name || !phone || !quantity || !pickup_date || !delivery_type) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 })
    }

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('is_accepting_orders')
      .single()

    if (settings && !settings.is_accepting_orders) {
      return NextResponse.json({ error: 'ขณะนี้ปิดรับออเดอร์ชั่วคราว' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name: customer_name.trim(),
        phone: phone.trim(),
        quantity,
        total_amount,
        delivery_type,
        pickup_location: pickup_location || null,
        delivery_address: delivery_address?.trim() || null,
        pickup_date,
        note: note?.trim() || null,
        salt_level: salt_level || 'normal',
        no_pepper: !!no_pepper,
        sesame_oil: !!sesame_oil,
        status: 'pending',
        user_id: user?.id ?? null,
      })
      .select('id')
      .single()

    if (error) throw error

    // Notify admin via Telegram
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID
    if (adminChatId) {
      const saltLabel = SALT_LEVEL_LABEL[(salt_level as SaltLevel) || 'normal']
      const extras = [saltLabel, no_pepper ? 'ไม่ใส่พริกไท' : null, sesame_oil ? 'ใส่น้ำมันงา' : null].filter(Boolean).join(', ')
      const delivery = delivery_type === 'grab' ? `🚚 Grab: ${delivery_address || '-'}` : `📍 นัดรับ`
      const msg = [
        `🐔 <b>ออเดอร์ใหม่!</b>`,
        `#${data.id.slice(0, 6).toUpperCase()} — ${customer_name.trim()}`,
        `📞 ${phone.trim()}`,
        `🛒 ${quantity} ชิ้น · ${total_amount.toLocaleString()} บาท`,
        delivery,
        `📅 รับ ${new Date(pickup_date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}`,
        `🧂 ${extras}`,
        note ? `📝 ${note.trim()}` : null,
      ].filter(Boolean).join('\n')
      sendTelegram(adminChatId, msg)
    }

    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 })
  }
}
