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

export async function GET() {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get all auth users
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const authUsers = authData?.users ?? []

  // Get all profiles
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, phone, created_at')

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))
  const adminEmail = process.env.ADMIN_EMAIL

  const result = authUsers
    .filter(u => u.email !== adminEmail)
    .map(u => {
      const profile = profileMap.get(u.id)
      return {
        id: u.id,
        email: u.email ?? '',
        display_name: profile?.display_name || u.user_metadata?.full_name || u.user_metadata?.name || '',
        phone: profile?.phone || '',
        created_at: u.created_at,
      }
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json(result)
}

// Removes the customer's account. Their orders stay as sales history but are
// detached from the account, so they show up as a guest customer afterwards.
export async function DELETE(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { user_id } = await req.json()
  if (typeof user_id !== 'string' || !user_id) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }

  const { data: target } = await supabaseAdmin.auth.admin.getUserById(user_id)
  if (!target?.user) return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 })
  if (target.user.email === process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'ลบบัญชีแอดมินไม่ได้' }, { status: 400 })
  }

  const steps = await Promise.all([
    supabaseAdmin.from('orders').update({ user_id: null }).eq('user_id', user_id),
    supabaseAdmin.from('customer_pricing').delete().eq('user_id', user_id),
    supabaseAdmin.from('profiles').delete().eq('id', user_id),
  ])
  const failed = steps.find(s => s.error)
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 })

  const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
