import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customer_name, phone, quantity, total_amount, delivery_type, pickup_location, delivery_address, pickup_date, note } = body

    if (!customer_name || !phone || !quantity || !pickup_date || !delivery_type) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 })
    }

    // Check if accepting orders
    const { data: settings } = await supabase
      .from('settings')
      .select('is_accepting_orders')
      .single()

    if (settings && !settings.is_accepting_orders) {
      return NextResponse.json({ error: 'ขณะนี้ปิดรับออเดอร์ชั่วคราว' }, { status: 400 })
    }

    const { data, error } = await supabase
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
        status: 'pending',
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
