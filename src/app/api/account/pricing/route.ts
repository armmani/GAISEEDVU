import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getPriceForUser, getShopSettings } from '@/lib/pricing'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const { price_per_piece } = await getShopSettings(supabaseAdmin)
    return NextResponse.json({ price_per_piece, base_price: price_per_piece })
  }

  const { price, base } = await getPriceForUser(supabaseAdmin, user.id)
  return NextResponse.json({ price_per_piece: price, base_price: base })
}
