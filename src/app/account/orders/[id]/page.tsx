'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Truck, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PICKUP_LOCATIONS, ORDER_STATUS_LABEL, type Order, type OrderStatus } from '@/lib/types'
import ChickenLoader from '@/components/ChickenLoader'

const STATUS_STEPS: OrderStatus[] = ['pending', 'confirmed', 'ready', 'completed']

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending:   { bg: '#fff3cd', text: '#856404' },
  confirmed: { bg: '#d1ecf1', text: '#0c5460' },
  ready:     { bg: '#d4edda', text: '#155724' },
  completed: { bg: '#e2e3e5', text: '#383d41' },
  cancelled: { bg: '#f8d7da', text: '#721c24' },
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetch(`/api/account/orders/${id}`)
      .then(r => { if (!r.ok) router.push('/account/orders'); return r.json() })
      .then(setOrder)
      .catch(() => router.push('/account/orders'))
  }, [id])

  if (!order) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#f2dada' }}>
      <ChickenLoader />
    </main>
  )

  const colors = STATUS_COLORS[order.status]
  const stepIndex = STATUS_STEPS.indexOf(order.status)

  return (
    <main className="min-h-screen pb-8 pt-6 px-4" style={{ background: '#f2dada' }}>
      <div className="max-w-md mx-auto space-y-4">

        <div className="flex items-center gap-3">
          <Link href="/account/orders" className="p-2 rounded-xl" style={{ background: 'white' }}>
            <ArrowLeft size={20} style={{ color: '#4a2728' }} />
          </Link>
          <h1 className="text-xl font-black" style={{ color: '#4a2728' }}>
            #{order.id.slice(0, 6).toUpperCase()}
          </h1>
          <span className="ml-auto text-xs font-bold rounded-full px-3 py-1"
            style={{ background: colors.bg, color: colors.text }}>
            {ORDER_STATUS_LABEL[order.status]}
          </span>
        </div>

        {/* Progress */}
        {order.status !== 'cancelled' && (
          <div className="rounded-2xl p-4 border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <div className="flex items-center justify-between">
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                      style={{
                        background: i <= stepIndex ? '#4a2728' : '#e8c4c4',
                        color: i <= stepIndex ? '#f2dada' : '#b89a9b',
                      }}>
                      {i < stepIndex ? '✓' : i + 1}
                    </div>
                    <span className="text-xs mt-1 font-semibold text-center" style={{ color: i <= stepIndex ? '#4a2728' : '#b89a9b', fontSize: '10px' }}>
                      {ORDER_STATUS_LABEL[step]}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 mx-1 mb-4" style={{ background: i < stepIndex ? '#4a2728' : '#e8c4c4' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order Details */}
        <div className="rounded-2xl p-5 border-2 space-y-2 text-sm" style={{ background: 'white', borderColor: '#e8c4c4' }}>
          <h3 className="font-bold text-base mb-3" style={{ color: '#4a2728' }}>รายละเอียดออเดอร์</h3>
          {[
            ['สินค้า', `Original × ${order.quantity} ชิ้น`],
            ['วันรับ', new Date(order.pickup_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })],
            ['ยอดรวม', `${order.total_amount.toLocaleString()} บาท`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span style={{ color: '#7a4a4b' }}>{label}</span>
              <span className="font-bold" style={{ color: '#4a2728' }}>{value}</span>
            </div>
          ))}

          <div className="flex justify-between items-start">
            <span style={{ color: '#7a4a4b' }}>
              {order.delivery_type === 'grab' ? <Truck size={14} className="inline mr-1" /> : <MapPin size={14} className="inline mr-1" />}
              {order.delivery_type === 'grab' ? 'ที่อยู่' : 'จุดรับ'}
            </span>
            <span className="font-bold text-right ml-4" style={{ color: '#4a2728' }}>
              {order.delivery_type === 'pickup'
                ? PICKUP_LOCATIONS[order.pickup_location!]
                : order.delivery_address}
            </span>
          </div>

          {order.note && (
            <div className="flex justify-between">
              <span style={{ color: '#7a4a4b' }}>หมายเหตุ</span>
              <span className="font-bold" style={{ color: '#4a2728' }}>{order.note}</span>
            </div>
          )}
        </div>

        {/* Payment */}
        {order.payment_slip_url ? (
          <a href={order.payment_slip_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-2xl p-4 border-2 text-sm font-semibold"
            style={{ background: 'white', borderColor: '#e8c4c4', color: '#4a2728' }}>
            <ExternalLink size={16} />
            ดูสลิปโอนเงิน
          </a>
        ) : (
          <Link href={`/order/${order.id}`}
            className="block text-center rounded-2xl py-3 text-sm font-bold"
            style={{ background: '#4a2728', color: '#f2dada' }}>
            ไปชำระเงิน →
          </Link>
        )}
      </div>
    </main>
  )
}
