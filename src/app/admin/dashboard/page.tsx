'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { MapPin, Truck, ExternalLink, RefreshCw, ToggleLeft, ToggleRight, LogOut } from 'lucide-react'
import { PICKUP_LOCATIONS, ORDER_STATUS_LABEL, type Order, type OrderStatus } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending:   { bg: '#fff3cd', text: '#856404' },
  confirmed: { bg: '#d1ecf1', text: '#0c5460' },
  ready:     { bg: '#d4edda', text: '#155724' },
  completed: { bg: '#e2e3e5', text: '#383d41' },
  cancelled: { bg: '#f8d7da', text: '#721c24' },
}

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'ready', 'completed']

export default function AdminDashboard() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [accepting, setAccepting] = useState(true)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function fetchData() {
    setLoading(true)
    const [ordersRes, settingsRes] = await Promise.all([
      fetch('/api/admin/orders'),
      fetch('/api/admin/settings'),
    ])
    if (ordersRes.status === 401) { router.push('/admin/login'); return }
    const [ordersData, settingsData] = await Promise.all([ordersRes.json(), settingsRes.json()])
    setOrders(ordersData)
    setAccepting(settingsData.is_accepting_orders ?? true)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function updateStatus(id: string, status: OrderStatus) {
    const res = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (res.ok) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
      toast.success(`อัพเดทสถานะ → ${ORDER_STATUS_LABEL[status]}`)
    }
  }

  async function toggleAccepting() {
    const next = !accepting
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_accepting_orders: next }),
    })
    if (res.ok) {
      setAccepting(next)
      toast.success(next ? 'เปิดรับออเดอร์แล้ว' : 'ปิดรับออเดอร์แล้ว')
    }
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  const counts = orders.reduce((acc, o) => ({ ...acc, [o.status]: (acc[o.status] ?? 0) + 1 }), {} as Record<string, number>)

  return (
    <main className="min-h-screen pb-8" style={{ background: '#f2dada' }}>
      {/* Top Bar */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between" style={{ background: '#4a2728' }}>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="GAI SEED VU" className="w-8 h-8 object-contain rounded" />
          <span className="font-black text-base" style={{ color: '#f2dada' }}>Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="p-1.5 rounded-lg" style={{ color: '#f2dada' }}>
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={logout} className="p-1.5 rounded-lg" style={{ color: '#f2dada' }}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4 max-w-2xl mx-auto">

        {/* Accept Orders Toggle */}
        <div className="rounded-2xl p-4 flex items-center justify-between border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
          <div>
            <p className="font-bold" style={{ color: '#4a2728' }}>รับออเดอร์</p>
            <p className="text-xs" style={{ color: '#7a4a4b' }}>{accepting ? 'เปิดรับอยู่' : 'ปิดรับชั่วคราว'}</p>
          </div>
          <button onClick={toggleAccepting}>
            {accepting
              ? <ToggleRight size={40} style={{ color: '#4a2728' }} />
              : <ToggleLeft size={40} style={{ color: '#e8c4c4' }} />}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {(['pending', 'confirmed', 'ready', 'completed'] as OrderStatus[]).map(s => (
            <div
              key={s}
              className="rounded-xl p-2 text-center border-2 cursor-pointer transition-all"
              style={{
                background: filter === s ? '#4a2728' : 'white',
                borderColor: filter === s ? '#4a2728' : '#e8c4c4',
                color: filter === s ? '#f2dada' : '#4a2728',
              }}
              onClick={() => setFilter(filter === s ? 'all' : s)}
            >
              <div className="text-xl font-black">{counts[s] ?? 0}</div>
              <div className="text-xs font-semibold">{ORDER_STATUS_LABEL[s]}</div>
            </div>
          ))}
        </div>

        {/* Orders */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-10 text-sm" style={{ color: '#7a4a4b' }}>ไม่มีออเดอร์</div>
          )}
          {filtered.map(order => {
            const expanded = expandedId === order.id
            const colors = STATUS_COLORS[order.status]
            const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1]

            return (
              <div key={order.id} className="rounded-2xl border-2 overflow-hidden" style={{ background: 'white', borderColor: '#e8c4c4' }}>
                {/* Header row */}
                <button
                  className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left"
                  onClick={() => setExpandedId(expanded ? null : order.id)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm font-black shrink-0" style={{ color: '#4a2728' }}>
                      #{order.id.slice(0, 6).toUpperCase()}
                    </span>
                    <span className="font-semibold text-sm truncate" style={{ color: '#4a2728' }}>
                      {order.customer_name}
                    </span>
                    {order.delivery_type === 'grab'
                      ? <Truck size={14} style={{ color: '#7a4a4b' }} className="shrink-0" />
                      : <MapPin size={14} style={{ color: '#7a4a4b' }} className="shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold" style={{ color: '#4a2728' }}>
                      ×{order.quantity}
                    </span>
                    <span
                      className="text-xs font-bold rounded-full px-2 py-0.5"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {ORDER_STATUS_LABEL[order.status]}
                    </span>
                  </div>
                </button>

                {/* Expanded detail */}
                {expanded && (
                  <div className="px-4 pb-4 border-t space-y-3 text-sm" style={{ borderColor: '#e8c4c4' }}>
                    <div className="pt-3 space-y-1.5" style={{ color: '#4a2728' }}>
                      <div className="flex justify-between">
                        <span style={{ color: '#7a4a4b' }}>เบอร์</span>
                        <a href={`tel:${order.phone}`} className="font-bold underline">{order.phone}</a>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: '#7a4a4b' }}>วันรับ</span>
                        <span className="font-bold">{new Date(order.pickup_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: '#7a4a4b' }}>ยอด</span>
                        <span className="font-bold">{order.total_amount.toLocaleString()} บาท</span>
                      </div>
                      {order.delivery_type === 'pickup' && order.pickup_location && (
                        <div className="flex justify-between">
                          <span style={{ color: '#7a4a4b' }}>จุดรับ</span>
                          <span className="font-bold text-right ml-4">{PICKUP_LOCATIONS[order.pickup_location]}</span>
                        </div>
                      )}
                      {order.delivery_type === 'grab' && order.delivery_address && (
                        <div>
                          <span style={{ color: '#7a4a4b' }}>ที่อยู่</span>
                          <p className="font-bold mt-0.5">{order.delivery_address}</p>
                        </div>
                      )}
                      {order.note && (
                        <div>
                          <span style={{ color: '#7a4a4b' }}>หมายเหตุ</span>
                          <p className="font-bold">{order.note}</p>
                        </div>
                      )}
                    </div>

                    {/* Slip */}
                    {order.payment_slip_url ? (
                      <a
                        href={order.payment_slip_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-semibold"
                        style={{ color: '#4a2728' }}
                      >
                        <ExternalLink size={14} />
                        ดูสลิปโอนเงิน
                      </a>
                    ) : (
                      <p className="text-xs" style={{ color: '#7a4a4b' }}>⏳ ยังไม่ได้แนบสลิป</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {nextStatus && (
                        <button
                          onClick={() => updateStatus(order.id, nextStatus)}
                          className="flex-1 rounded-xl py-2 text-xs font-bold"
                          style={{ background: '#4a2728', color: '#f2dada' }}
                        >
                          → {ORDER_STATUS_LABEL[nextStatus]}
                        </button>
                      )}
                      {order.status !== 'cancelled' && order.status !== 'completed' && (
                        <button
                          onClick={() => updateStatus(order.id, 'cancelled')}
                          className="rounded-xl px-3 py-2 text-xs font-bold"
                          style={{ background: '#f8d7da', color: '#721c24' }}
                        >
                          ยกเลิก
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
