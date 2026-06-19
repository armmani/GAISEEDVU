import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

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
    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 })
  }
}
