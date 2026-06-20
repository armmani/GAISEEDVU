import { NextResponse } from 'next/server'
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
