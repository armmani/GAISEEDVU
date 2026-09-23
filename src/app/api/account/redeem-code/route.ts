import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { redeemSignupCode } from '@/lib/pricing'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await req.json()
  const result = await redeemSignupCode(supabaseAdmin, user.id, typeof code === 'string' ? code : '')
  if (result === 'invalid') return NextResponse.json({ error: 'โค้ดไม่ถูกต้อง', result }, { status: 400 })
  return NextResponse.json({ ok: true, result })
}
