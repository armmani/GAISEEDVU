import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getShopSettings, normalizeCode } from '@/lib/pricing'

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
  return NextResponse.json(await getShopSettings(supabaseAdmin))
}

function isPrice(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v > 0 && v <= 10000
}

export async function PATCH(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const update: Record<string, unknown> = {}

  if ('is_accepting_orders' in body) update.is_accepting_orders = !!body.is_accepting_orders
  if ('price_per_piece' in body) {
    if (!isPrice(body.price_per_piece)) return NextResponse.json({ error: 'ราคาไม่ถูกต้อง' }, { status: 400 })
    update.price_per_piece = body.price_per_piece
  }
  if ('signup_code_price' in body) {
    if (!isPrice(body.signup_code_price)) return NextResponse.json({ error: 'ราคาโค้ดไม่ถูกต้อง' }, { status: 400 })
    update.signup_code_price = body.signup_code_price
  }
  if ('signup_code' in body) {
    const code = typeof body.signup_code === 'string' ? normalizeCode(body.signup_code) : ''
    if (code && !/^[A-Z0-9_-]{3,30}$/.test(code)) {
      return NextResponse.json({ error: 'โค้ดใช้ได้เฉพาะ A-Z, 0-9, - และ _ (3–30 ตัว)' }, { status: 400 })
    }
    update.signup_code = code || null
  }

  const { error } = await supabaseAdmin.from('settings').upsert({ id: 1, ...update })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(await getShopSettings(supabaseAdmin))
}
