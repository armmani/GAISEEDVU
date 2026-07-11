import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { PRICE_PER_PIECE, type OrderItem } from '@/lib/types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthUser() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('orders').select('*').eq('id', id).eq('user_id', user.id).single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: existing } = await supabaseAdmin
    .from('orders').select('status, user_id').eq('id', id).single()

  if (!existing || existing.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.status !== 'pending') return NextResponse.json({ error: 'แก้ไขได้เฉพาะออเดอร์ที่รอยืนยันเท่านั้น' }, { status: 400 })

  const body = await req.json()
  const { items, pickup_date, pickup_time, delivery_type, pickup_location, delivery_address, recipient_name, recipient_phone, recipient_line_id, note } = body

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'กรุณาเพิ่มสินค้าอย่างน้อย 1 สูตร' }, { status: 400 })
  }
  if (!pickup_date) return NextResponse.json({ error: 'กรุณาเลือกวันรับ' }, { status: 400 })

  const nowTH = new Date(Date.now() + 7 * 60 * 60 * 1000)
  const minDateTH = new Date(nowTH)
  minDateTH.setDate(minDateTH.getDate() + 2)
  const minTH = minDateTH.toISOString().split('T')[0]
  if (pickup_date < minTH) {
    return NextResponse.json({ error: 'วันรับต้องเว้นล่วงหน้าอย่างน้อย 2 วัน' }, { status: 400 })
  }

  // Check blocked dates
  const { data: blocked } = await supabaseAdmin.from('blocked_dates').select('id')
    .lte('start_date', pickup_date).gte('end_date', pickup_date)
  if (blocked && blocked.length > 0) {
    return NextResponse.json({ error: 'วันที่เลือกไม่สะดวกรับออเดอร์' }, { status: 400 })
  }

  // Recalculate price
  let pricePerPiece = PRICE_PER_PIECE
  const now = new Date().toISOString()
  const { data: pricing } = await supabaseAdmin.from('customer_pricing').select('price_per_piece')
    .eq('user_id', user.id).or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (pricing) pricePerPiece = pricing.price_per_piece

  const totalQty = (items as OrderItem[]).reduce((s, i) => s + i.quantity, 0)
  const calculatedTotal = totalQty * pricePerPiece
  const first = items[0] as OrderItem

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({
      items,
      quantity: totalQty,
      total_amount: calculatedTotal,
      pickup_date,
      pickup_time: pickup_time || null,
      delivery_type,
      pickup_location: pickup_location || null,
      delivery_address: delivery_address?.trim() || null,
      recipient_name: delivery_type === 'grab' ? (recipient_name?.trim() || null) : null,
      recipient_phone: delivery_type === 'grab' ? (recipient_phone?.trim() || null) : null,
      recipient_line_id: delivery_type === 'grab' ? (recipient_line_id?.trim() || null) : null,
      note: note?.trim() || null,
      salt_level: null,
      no_pepper: first.pepper_level === 'none',
      sesame_oil: !!first.sesame_oil,
      payment_slip_url: null, // clear slip since amount may change
    })
    .eq('id', id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: existing } = await supabaseAdmin
    .from('orders').select('status, user_id').eq('id', id).single()

  if (!existing || existing.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.status !== 'pending') return NextResponse.json({ error: 'ยกเลิกได้เฉพาะออเดอร์ที่รอยืนยันเท่านั้น' }, { status: 400 })

  await supabaseAdmin.from('orders').update({ status: 'cancelled' }).eq('id', id)
  return NextResponse.json({ ok: true })
}
