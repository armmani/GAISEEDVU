'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, MapPin, Truck } from 'lucide-react'
import { ORDER_STATUS_LABEL, type Order, type OrderStatus } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import ChickenLoader from '@/components/ChickenLoader'

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending:   { bg: '#fff3cd', text: '#856404' },
  confirmed: { bg: '#d1ecf1', text: '#0c5460' },
  ready:     { bg: '#d4edda', text: '#155724' },
  completed: { bg: '#e2e3e5', text: '#383d41' },
  cancelled: { bg: '#f8d7da', text: '#721c24' },
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

  return (
    <main className="min-h-screen pb-24 pt-6 px-4" style={{ background: '#f2dada' }}>
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-black mb-5" style={{ color: '#4a2728' }}>ออเดอร์ของฉัน</h1>

        {loading && (
          <div className="flex justify-center py-16"><ChickenLoader /></div>
        )}

        {!loading && orders.length === 0 && (
          <div className="text-center py-16 rounded-2xl border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <p className="text-4xl mb-3">🛒</p>
            <p className="font-semibold" style={{ color: '#4a2728' }}>ยังไม่มีออเดอร์</p>
            <Link href="/" className="block mt-3 text-sm font-bold" style={{ color: '#7a4a4b' }}>
              สั่งเลย →
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {orders.map(order => {
            const colors = STATUS_COLORS[order.status]
            return (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="block rounded-2xl p-4 border-2"
                style={{ background: 'white', borderColor: '#e8c4c4' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold" style={{ color: '#7a4a4b' }}>
                        #{order.id.slice(0, 6).toUpperCase()}
                      </span>
                      <span
                        className="text-xs font-bold rounded-full px-2 py-0.5"
                        style={{ background: colors.bg, color: colors.text }}
                      >
                        {ORDER_STATUS_LABEL[order.status]}
                      </span>
                    </div>
                    <p className="font-bold text-sm" style={{ color: '#4a2728' }}>
                      Original × {order.quantity} ชิ้น — {order.total_amount.toLocaleString()} บาท
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: '#7a4a4b' }}>
                      {order.delivery_type === 'grab' ? <Truck size={12} /> : <MapPin size={12} />}
                      <span>{new Date(order.pickup_date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} style={{ color: '#b89a9b' }} />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
