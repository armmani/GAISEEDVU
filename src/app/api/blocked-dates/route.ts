import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data } = await supabaseAdmin
    .from('blocked_dates')
    .select('start_date, end_date')
    .order('start_date', { ascending: true })
  return NextResponse.json(data ?? [])
}
