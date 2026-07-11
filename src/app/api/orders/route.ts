import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendTelegram } from '@/lib/telegram'
import { PRICE_PER_PIECE, itemLabel, type OrderItem } from '@/lib/types'


const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await req.json()
    const { customer_name, phone, delivery_type, pickup_location, delivery_address, pickup_date, pickup_time, recipient_name, recipient_phone, recipient_line_id, note, items } = body

    if (!customer_name || !phone || !pickup_date || !delivery_type) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'กรุณาเพิ่มสินค้าอย่างน้อย 1 สูตร' }, { status: 400 })
    }

    const nowTH = new Date(Date.now() + 7 * 60 * 60 * 1000)
    const minDateTH = new Date(nowTH)
    minDateTH.setDate(minDateTH.getDate() + 2)
    const minTH = minDateTH.toISOString().split('T')[0]
    if (pickup_date < minTH) {
      return NextResponse.json({ error: 'วันรับต้องเว้นล่วงหน้าอย่างน้อย 2 วัน' }, { status: 400 })
    }

    const [{ data: settings }, { data: blockedRanges }] = await Promise.all([
      supabaseAdmin.from('settings').select('is_accepting_orders').single(),
      supabaseAdmin.from('blocked_dates').select('start_date, end_date')
        .lte('start_date', pickup_date).gte('end_date', pickup_date),
    ])

    if (settings && !settings.is_accepting_orders) {
      return NextResponse.json({ error: 'ขณะนี้ปิดรับออเดอร์ชั่วคราว' }, { status: 400 })
    }
    if (blockedRanges && blockedRanges.length > 0) {
      return NextResponse.json({ error: 'วันที่เลือกไม่สะดวกรับออเดอร์ กรุณาเลือกวันอื่น' }, { status: 400 })
    }

    let pricePerPiece = PRICE_PER_PIECE
    if (user) {
      const now = new Date().toISOString()
      const { data: pricing } = await supabaseAdmin
        .from('customer_pricing').select('price_per_piece')
        .eq('user_id', user.id)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (pricing) pricePerPiece = pricing.price_per_piece
    }

    const totalQty = (items as OrderItem[]).reduce((s, i) => s + i.quantity, 0)
    const calculatedTotal = totalQty * pricePerPiece
    const first = items[0] as OrderItem

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name: customer_name.trim(),
        phone: phone.trim(),
        quantity: totalQty,
        total_amount: calculatedTotal,
        delivery_type,
        pickup_location: pickup_location || null,
        delivery_address: delivery_address?.trim() || null,
        pickup_date,
        pickup_time: pickup_time || null,
        recipient_name: delivery_type === 'grab' ? (recipient_name?.trim() || null) : null,
        recipient_phone: delivery_type === 'grab' ? (recipient_phone?.trim() || null) : null,
        recipient_line_id: delivery_type === 'grab' ? (recipient_line_id?.trim() || null) : null,
        note: note?.trim() || null,
        salt_level: null,
        no_pepper: first.pepper_level === 'none',
        sesame_oil: !!first.sesame_oil,
        items,
        status: 'pending',
        user_id: user?.id ?? null,
      })
      .select('id').single()

    if (error) throw error

    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID
    if (adminChatId) {
      const itemLines = (items as OrderItem[]).map((it, i) =>
        `  ${i + 1}. ×${it.quantity} ${itemLabel(it)}`
      ).join('\n')
      const timeStr = pickup_time ? ` (${pickup_time})` : ''
      const delivery = delivery_type === 'grab'
        ? `🚚 Grab: ${delivery_address || '-'}${timeStr}\n  ผู้รับ: ${recipient_name || '-'} ${recipient_phone || ''}${recipient_line_id ? ` · LINE: ${recipient_line_id}` : ''}`
        : `📍 นัดรับ${timeStr}`
      const msg = [
        `🐔 <b>ออเดอร์ใหม่!</b>`,
        `#${data.id.slice(0, 6).toUpperCase()} — ${customer_name.trim()}`,
        `📞 ${phone.trim()}`,
        `🛒 ${totalQty} ชิ้น · ${calculatedTotal.toLocaleString()} บาท`,
        delivery,
        `📅 รับ ${new Date(pickup_date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}`,
        itemLines,
        note ? `📝 ${note.trim()}` : null,
      ].filter(Boolean).join('\n')
      await sendTelegram(adminChatId, msg)
    }

    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 })
  }
}
