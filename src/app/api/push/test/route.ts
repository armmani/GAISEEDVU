import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sent = await sendPushToUser(supabaseAdmin, user.id, {
    title: '🐔 GAI SEED VU',
    body: 'ทดสอบแจ้งเตือน — ถ้าเห็นข้อความนี้แปลว่าใช้งานได้แล้วค่ะ',
    url: '/account/orders',
    tag: 'test',
  })

  if (sent === 0) {
    return NextResponse.json({ error: 'ส่งไม่สำเร็จ ลองปิดแล้วเปิดแจ้งเตือนใหม่' }, { status: 400 })
  }
  return NextResponse.json({ ok: true, sent })
}
