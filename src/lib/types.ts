export type DeliveryType = 'pickup' | 'grab'
export type PickupLocation = 'donmueang' | 'siam' | 'chula'
export type OrderStatus = 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled'
export type SaltLevel = 'less' | 'normal' | 'more'
export type PepperLevel = 'normal' | 'less' | 'none'

export interface OrderItem {
  quantity: number
  pepper_level: PepperLevel
  sesame_oil: boolean
  no_salt: boolean
}

export interface Order {
  id: string
  customer_name: string
  phone: string
  quantity: number
  total_amount: number
  delivery_type: DeliveryType
  pickup_location: PickupLocation | null
  delivery_address: string | null
  pickup_date: string
  pickup_time: string | null
  recipient_name: string | null
  recipient_phone: string | null
  recipient_line_id: string | null
  status: OrderStatus
  payment_slip_url: string | null
  note: string | null
  salt_level: SaltLevel | null
  no_pepper: boolean
  sesame_oil: boolean
  user_id: string | null
  created_at: string
  items: OrderItem[] | null
}

export const TIME_SLOTS = ['09:00–12:00', '12:00–15:00', '15:00–18:00', '18:00–21:00'] as const

export const SALT_LEVEL_LABEL: Record<SaltLevel, string> = {
  less: 'เค็มน้อย',
  normal: 'เค็มปกติ',
  more: 'เค็มมาก',
}

export const PEPPER_LEVEL_LABEL: Record<PepperLevel, string> = {
  normal: 'พริกไทปกติ',
  less: 'ลดพริกไท',
  none: 'ไม่ใส่พริกไท',
}

export const PICKUP_LOCATIONS: Record<PickupLocation, string> = {
  donmueang: 'ดอนเมือง — ร้านแลนด์บาร์ก คลินิกแอนด์เพทชอป',
  siam: 'สยาม — สยามสแควร์',
  chula: 'โรงพยาบาลสัตว์ จุฬาฯ',
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'รอยืนยัน',
  confirmed: 'ยืนยันแล้ว',
  ready: 'พร้อมส่ง/รับ',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
}

export const PRICE_PER_PIECE = 65

// Orders created before the pepper_level migration store items as { no_pepper: boolean }
type LegacyOrderItem = Partial<OrderItem> & { quantity: number; no_pepper?: boolean }

export function getOrderItems(order: Order): OrderItem[] {
  const raw: LegacyOrderItem[] = (order.items && order.items.length > 0)
    ? order.items
    : [{ quantity: order.quantity, no_pepper: order.no_pepper, sesame_oil: order.sesame_oil }]
  return raw.map(it => ({
    quantity: it.quantity,
    pepper_level: it.pepper_level ?? (it.no_pepper ? 'none' : 'normal'),
    sesame_oil: it.sesame_oil ?? false,
    no_salt: it.no_salt ?? false,
  }))
}

export function itemLabel(item: OrderItem): string {
  const parts = [
    item.pepper_level !== 'normal' ? PEPPER_LEVEL_LABEL[item.pepper_level] : null,
    item.no_salt ? 'ไม่ใส่เกลือ' : null,
    item.sesame_oil ? 'เพิ่มน้ำมันงา' : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'สูตรปกติ'
}
