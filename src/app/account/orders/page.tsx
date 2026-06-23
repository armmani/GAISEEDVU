'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, MapPin, Truck, RotateCcw } from 'lucide-react'
import { ORDER_STATUS_LABEL, getOrderItems, itemLabel, type Order, type OrderStatus } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import ChickenLoader from '@/components/ChickenLoader'

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending:   { bg: '#fff3cd', text: '#856404' },
  confirmed: { bg: '#d1ecf1', text: '#0c5460' },
  ready:     { bg: '#d4edda', text: '#155724' },
  completed: { bg: '#e2e3e5', text: '#383d41' },
  cancelled: { bg: '#f8d7da', text: '#721c24' },
}

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'ready']
const DONE_STATUSES: OrderStatus[] = ['completed', 'cancelled']

function OrderCard({ order, showReorder }: { order: Order; showReorder?: boolean }) {
  const router = useRouter()
  const colors = STATUS_COLORS[order.status]
  const orderItems = getOrderItems(order)
  return (
    <div className="rounded-2xl border-2 overflow-hidden" style={{ background: 'white', borderColor: '#e8c4c4' }}>
      <Link href={`/account/orders/${order.id}`} className="block p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold" style={{ color: '#7a4a4b' }}>#{order.id.slice(0, 6).toUpperCase()}</span>
              <span className="text-xs font-bold rounded-full px-2 py-0.5" style={{ background: colors.bg, color: colors.text }}>
                {ORDER_STATUS_LABEL[order.status]}
              </span>
            </div>
            {orderItems.map((it, i) => (
              <p key={i} className="text-sm font-bold" style={{ color: '#4a2728' }}>
                ×{it.quantity} {itemLabel(it)}
              </p>
            ))}
            <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: '#7a4a4b' }}>
              {order.delivery_type === 'grab' ? <Truck size={12} /> : <MapPin size={12} />}
              <span>{new Date(order.pickup_date + 'T00:00:00').toLocaleDateString('th-TH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span>·</span>
              <span className="font-semibold">{order.total_amount.toLocaleString()} บาท</span>
            </div>
          </div>
          <ChevronRight size={18} style={{ color: '#b89a9b' }} className="shrink-0 mt-1" />
        </div>
      </Link>
      {showReorder && (
        <div className="border-t px-4 py-2.5" style={{ borderColor: '#f0e0e0', background: '#fffcfc' }}>
          <button onClick={() => router.push(`/?reorder=${order.id}`)}
            className="flex items-center gap-1.5 text-xs font-bold"
            style={{ color: '#4a2728' }}>
            <RotateCcw size={13} /> สั่งซ้ำออเดอร์นี้
          </button>
        </div>
      )}
    </div>
  )
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/account/orders')
      .then(r => r.json())
      .then(data => { setOrders(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const active = orders.filter(o => ACTIVE_STATUSES.includes(o.status))
    .sort((a, b) => a.pickup_date.localeCompare(b.pickup_date))
  const done = orders.filter(o => DONE_STATUSES.includes(o.status))
    .sort((a, b) => b.pickup_date.localeCompare(a.pickup_date))

  return (
    <main className="min-h-screen pb-24 pt-6 px-4" style={{ background: '#f2dada' }}>
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-black mb-5" style={{ color: '#4a2728' }}>ออเดอร์ของฉัน</h1>

        {loading && <div className="flex justify-center py-16"><ChickenLoader /></div>}

        {!loading && orders.length === 0 && (
          <div className="text-center py-16 rounded-2xl border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <p className="text-4xl mb-3">🛒</p>
            <p className="font-semibold" style={{ color: '#4a2728' }}>ยังไม่มีออเดอร์</p>
            <Link href="/" className="block mt-3 text-sm font-bold" style={{ color: '#7a4a4b' }}>สั่งเลย →</Link>
          </div>
        )}

        {!loading && active.length > 0 && (
          <div className="space-y-3 mb-6">
            <h2 className="text-sm font-bold" style={{ color: '#7a4a4b' }}>ออเดอร์ที่ใช้งานอยู่</h2>
            {active.map(o => <OrderCard key={o.id} order={o} />)}
          </div>
        )}

        {!loading && done.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold" style={{ color: '#7a4a4b' }}>ประวัติการสั่ง</h2>
            {done.map(o => <OrderCard key={o.id} order={o} showReorder={o.status === 'completed'} />)}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
