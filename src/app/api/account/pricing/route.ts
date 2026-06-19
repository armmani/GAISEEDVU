import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { PRICE_PER_PIECE } from '@/lib/types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ price_per_piece: PRICE_PER_PIECE })

  const now = new Date().toISOString()
  const { data } = await supabaseAdmin
    .from('customer_pricing')
    .select('price_per_piece')
    .eq('user_id', user.id)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ price_per_piece: data?.price_per_piece ?? PRICE_PER_PIECE })
}
