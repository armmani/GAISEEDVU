export async function sendTelegram(chatId: string, message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) { console.error('[Telegram] TELEGRAM_BOT_TOKEN not set'); return }
  if (!chatId) { console.error('[Telegram] chatId is empty'); return }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    })
    const json = await res.json()
    if (!res.ok) console.error('[Telegram] API error:', JSON.stringify(json))
    else console.log('[Telegram] sent ok to', chatId)
  } catch (e) {
    console.error('[Telegram] fetch error:', e)
  }
}
