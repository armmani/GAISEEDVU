import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === process.env.ADMIN_EMAIL
}

/** One customer's thread. Opening it marks their messages as read. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await params

  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('id, sender, body, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const unread = (data ?? []).some(m => m.sender === 'customer' && !m.read_at)
  if (unread) {
    await supabaseAdmin
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('sender', 'customer')
      .is('read_at', null)
  }

  return NextResponse.json(data ?? [])
}
