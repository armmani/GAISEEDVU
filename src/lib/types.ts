export type DeliveryType = 'pickup' | 'grab'
export type PickupLocation = 'donmueang' | 'siam' | 'chula'
export type OrderStatus = 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled'

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
  status: OrderStatus
  payment_slip_url: string | null
  note: string | null
  created_at: string
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
