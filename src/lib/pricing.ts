import type { SupabaseClient } from '@supabase/supabase-js'
import { PRICE_PER_PIECE, SIGNUP_CODE_PRICE } from '@/lib/types'

export interface ShopSettings {
  is_accepting_orders: boolean
  price_per_piece: number
  signup_code: string | null
  signup_code_price: number
}

export async function getShopSettings(db: SupabaseClient): Promise<ShopSettings> {
  const { data } = await db.from('settings').select('*').eq('id', 1).maybeSingle()
  return {
    is_accepting_orders: data?.is_accepting_orders ?? true,
    price_per_piece: data?.price_per_piece ?? PRICE_PER_PIECE,
    signup_code: data?.signup_code ?? null,
    signup_code_price: data?.signup_code_price ?? SIGNUP_CODE_PRICE,
  }
}

async function getActiveCustomerPrice(db: SupabaseClient, userId: string): Promise<number | null> {
  const now = new Date().toISOString()
  const { data } = await db
    .from('customer_pricing').select('price_per_piece')
    .eq('user_id', userId)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return data?.price_per_piece ?? null
}

// The price a customer pays: their own special price if one is active,
// otherwise the shop's normal price.
export async function getPriceForUser(db: SupabaseClient, userId: string): Promise<{ price: number; base: number }> {
  const [settings, special] = await Promise.all([getShopSettings(db), getActiveCustomerPrice(db, userId)])
  return { price: special ?? settings.price_per_piece, base: settings.price_per_piece }
}

export type RedeemResult = 'applied' | 'invalid' | 'already_special'

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

// Gives the customer the signup-code price when the code matches the one the
// admin set. A customer who already has a special price keeps it, so a code
// can never overwrite a deal the admin gave by hand.
export async function redeemSignupCode(db: SupabaseClient, userId: string, code: string): Promise<RedeemResult> {
  const settings = await getShopSettings(db)
  if (!settings.signup_code || !code || normalizeCode(code) !== normalizeCode(settings.signup_code)) return 'invalid'

  if (await getActiveCustomerPrice(db, userId) !== null) return 'already_special'

  await db.from('customer_pricing').delete().eq('user_id', userId)
  const { error } = await db.from('customer_pricing').insert({
    user_id: userId,
    price_per_piece: settings.signup_code_price,
    expires_at: null,
    note: `สมัครด้วยโค้ด ${normalizeCode(settings.signup_code)}`,
  })
  if (error) throw error
  return 'applied'
}
