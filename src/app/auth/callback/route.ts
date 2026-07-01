import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendTelegram } from '@/lib/telegram'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createServerClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Create profile if first Google login
      const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!existing) {
        const name = data.user.user_metadata?.full_name || data.user.user_metadata?.name || ''
        await supabaseAdmin.from('profiles').insert({
          id: data.user.id,
          display_name: name,
          phone: '',
          default_address: '',
        })
        const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID
        if (adminChatId) {
          await sendTelegram(adminChatId, `🆕 <b>สมาชิกใหม่! (Google)</b>\n👤 ${name || '—'}\n📧 ${data.user.email || '—'}`)
        }
      }

      const isAdmin = data.user.email === process.env.ADMIN_EMAIL
      return NextResponse.redirect(`${origin}${isAdmin ? '/admin/dashboard' : '/'}`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
