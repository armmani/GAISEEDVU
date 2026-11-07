import type { SupabaseClient } from '@supabase/supabase-js'
import { sendTelegram } from '@/lib/telegram'
import { sendPushToAdmin, sendPushToUser } from '@/lib/push'

/** Keeps a notification body short enough to read on a lock screen. */
function preview(body: string): string {
  const oneLine = body.replace(/\s+/g, ' ').trim()
  return oneLine.length > 120 ? `${oneLine.slice(0, 117)}…` : oneLine
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Tells the shop a customer wrote in. Never throws. */
export async function notifyAdminOfMessage(
  supabaseAdmin: SupabaseClient,
  customerName: string,
  body: string,
): Promise<void> {
  const name = customerName.trim() || 'ลูกค้า'

  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID
  if (adminChatId) {
    await sendTelegram(adminChatId, [
      '💬 <b>ข้อความใหม่จากลูกค้า</b>',
      `จาก: <b>${escapeHtml(name)}</b>`,
      '',
      escapeHtml(body),
    ].join('\n'))
  }

  await sendPushToAdmin(supabaseAdmin, {
    title: `💬 ${name}`,
    body: preview(body),
    url: '/admin/dashboard?tab=chat',
    tag: 'chat-admin',
  })
}

/** Tells a customer the shop replied. Never throws. */
export async function notifyCustomerOfReply(
  supabaseAdmin: SupabaseClient,
  userId: string,
  body: string,
): Promise<void> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('telegram_chat_id')
    .eq('id', userId)
    .single()

  if (profile?.telegram_chat_id) {
    await sendTelegram(profile.telegram_chat_id, [
      '💬 <b>GAI SEED VU ตอบกลับแล้ว</b>',
      '',
      escapeHtml(body),
    ].join('\n'))
  }

  await sendPushToUser(supabaseAdmin, userId, {
    title: '💬 ร้านไก่ซี๊ดวู้วตอบกลับ',
    body: preview(body),
    url: '/account/chat',
    tag: 'chat-customer',
  })
}
