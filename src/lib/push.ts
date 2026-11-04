import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface PushPayload {
  title: string
  body: string
  /** Path opened when the notification is tapped. */
  url?: string
  /** Notifications sharing a tag replace each other instead of stacking. */
  tag?: string
}

interface SubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

let vapidReady: boolean | null = null

function configureVapid(): boolean {
  if (vapidReady !== null) return vapidReady
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    console.warn('[push] VAPID keys not set — skipping push notifications')
    vapidReady = false
    return false
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'https://gaiseedvu.vercel.app',
    publicKey,
    privateKey,
  )
  vapidReady = true
  return true
}

async function deliver(
  supabase: SupabaseClient,
  rows: SubscriptionRow[],
  payload: PushPayload,
): Promise<number> {
  if (rows.length === 0) return 0
  const body = JSON.stringify(payload)
  let sent = 0
  const expired: string[] = []

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          body,
        )
        sent++
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode
        // The browser dropped this subscription — stop sending to it.
        if (status === 404 || status === 410) expired.push(row.id)
        else console.error('[push] send failed:', status, (err as Error)?.message)
      }
    }),
  )

  if (expired.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', expired)
  }
  return sent
}

/** Sends a notification to every device a customer has enabled. Never throws. */
export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload,
): Promise<number> {
  try {
    if (!configureVapid()) return 0
    const { data } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId)
    return await deliver(supabase, (data ?? []) as SubscriptionRow[], payload)
  } catch (err) {
    console.error('[push] sendPushToUser:', err)
    return 0
  }
}

/** Sends a notification to the shop's own devices. Never throws. */
export async function sendPushToAdmin(
  supabase: SupabaseClient,
  payload: PushPayload,
): Promise<number> {
  try {
    if (!configureVapid()) return 0
    const { data } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('is_admin', true)
    return await deliver(supabase, (data ?? []) as SubscriptionRow[], payload)
  } catch (err) {
    console.error('[push] sendPushToAdmin:', err)
    return 0
  }
}
