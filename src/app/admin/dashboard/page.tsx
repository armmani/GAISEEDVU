'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { MapPin, Truck, ExternalLink, RefreshCw, ToggleLeft, ToggleRight, LogOut, Users, ClipboardList, Tag, X, ChefHat, CalendarOff } from 'lucide-react'
import { PICKUP_LOCATIONS, ORDER_STATUS_LABEL, PRICE_PER_PIECE, getOrderItems, itemLabel, type Order, type OrderStatus } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending:   { bg: '#ffd6d6', text: '#c0392b' },
  confirmed: { bg: '#d6e8ff', text: '#1a5eb8' },
  ready:     { bg: '#fff3cd', text: '#b8860b' },
  completed: { bg: '#d4edda', text: '#1a7a3c' },
  cancelled: { bg: '#e2e3e5', text: '#555' },
}

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'ready', 'completed']

interface Profile {
  id: string
  email: string
  display_name: string
  phone: string
  created_at: string
}

interface CustomerSummary {
  name: string
  phone: string
  email: string
  userId: string | null
  orders: Order[]
  totalOrders: number
  totalPieces: number
  totalSpent: number
  joinedAt: string | null
}

interface CustomerPricing {
  id: string
  user_id: string
  price_per_piece: number
  expires_at: string | null
  note: string | null
}

function buildCustomers(orders: Order[], profiles: Profile[]): CustomerSummary[] {
  const map = new Map<string, CustomerSummary>()

  // Seed from profiles first
  for (const p of profiles) {
    map.set(p.id, {
      name: p.display_name || '(ยังไม่ได้ตั้งชื่อ)',
      phone: p.phone || '—',
      email: p.email || '',
      userId: p.id,
      orders: [],
      totalOrders: 0,
      totalPieces: 0,
      totalSpent: 0,
      joinedAt: p.created_at,
    })
  }

  // Merge orders in
  for (const o of orders) {
    const key = o.user_id ?? `guest__${o.customer_name}__${o.phone}`
    if (!map.has(key)) {
      map.set(key, { name: o.customer_name, phone: o.phone, email: '', userId: o.user_id ?? null, orders: [], totalOrders: 0, totalPieces: 0, totalSpent: 0, joinedAt: null })
    }
    const c = map.get(key)!
    if (o.user_id && c.name === '(ยังไม่ได้ตั้งชื่อ)' && o.customer_name) c.name = o.customer_name
    c.orders.push(o)
    c.totalOrders++
    c.totalPieces += o.quantity
    if (o.status !== 'cancelled') c.totalSpent += o.total_amount
  }

  return Array.from(map.values()).sort((a, b) => b.totalOrders - a.totalOrders)
}

export default function AdminDashboard() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [accepting, setAccepting] = useState(true)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'orders' | 'summary' | 'customers' | 'calendar'>('orders')
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null)
  const [pricingMap, setPricingMap] = useState<Record<string, CustomerPricing>>({})
  const [pricingForm, setPricingForm] = useState<{ userId: string; price: string; expires_at: string; note: string } | null>(null)
  const [pricingLoading, setPricingLoading] = useState(false)
  const [blockedDates, setBlockedDates] = useState<{ id: string; start_date: string; end_date: string; note: string | null }[]>([])
  const [newBlock, setNewBlock] = useState({ start_date: '', end_date: '', note: '' })
  const [editBlock, setEditBlock] = useState<{ id: string; start_date: string; end_date: string; note: string } | null>(null)
  const [blockLoading, setBlockLoading] = useState(false)

  async function fetchData() {
    setLoading(true)
    const [ordersRes, settingsRes, pricingRes, profilesRes, blockedRes] = await Promise.all([
      fetch('/api/admin/orders'),
      fetch('/api/admin/settings'),
      fetch('/api/admin/customer-pricing'),
      fetch('/api/admin/profiles'),
      fetch('/api/admin/blocked-dates'),
    ])
    if (ordersRes.status === 401) { router.push('/admin/login'); return }
    const [ordersData, settingsData, pricingData, profilesData, blockedData] = await Promise.all([
      ordersRes.json(), settingsRes.json(), pricingRes.json(), profilesRes.json(), blockedRes.json(),
    ])
    setOrders(ordersData)
    setProfiles(Array.isArray(profilesData) ? profilesData : [])
    setAccepting(settingsData.is_accepting_orders ?? true)
    const pm: Record<string, CustomerPricing> = {}
    if (Array.isArray(pricingData)) pricingData.forEach((p: CustomerPricing) => { pm[p.user_id] = p })
    setPricingMap(pm)
    setBlockedDates(Array.isArray(blockedData) ? blockedData : [])
    setLoading(false)
  }

  async function savePricing() {
    if (!pricingForm) return
    setPricingLoading(true)
    const res = await fetch('/api/admin/customer-pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: pricingForm.userId,
        price_per_piece: parseInt(pricingForm.price),
        expires_at: pricingForm.expires_at || null,
        note: pricingForm.note || null,
      }),
    })
    if (res.ok) {
      toast.success('บันทึกราคาพิเศษแล้ว')
      setPricingForm(null)
      fetchData()
    }
    setPricingLoading(false)
  }

  async function addBlockedDate() {
    if (!newBlock.start_date) return toast.error('กรุณาเลือกวันเริ่ม')
    setBlockLoading(true)
    const end = newBlock.end_date || newBlock.start_date
    const res = await fetch('/api/admin/blocked-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date: newBlock.start_date, end_date: end, note: newBlock.note || null }),
    })
    if (res.ok) {
      toast.success('เพิ่มวันหยุดแล้ว')
      setNewBlock({ start_date: '', end_date: '', note: '' })
      fetchData()
    }
    setBlockLoading(false)
  }

  async function saveEditBlock() {
    if (!editBlock) return
    setBlockLoading(true)
    const res = await fetch('/api/admin/blocked-dates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editBlock),
    })
    if (res.ok) {
      toast.success('แก้ไขแล้ว')
      setEditBlock(null)
      fetchData()
    }
    setBlockLoading(false)
  }

  async function removeBlockedDate(id: string) {
    await fetch('/api/admin/blocked-dates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    toast.success('ลบวันหยุดแล้ว')
    fetchData()
  }

  async function removePricing(userId: string) {
    await fetch('/api/admin/customer-pricing', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    toast.success('ลบราคาพิเศษแล้ว')
    fetchData()
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
  const customers = buildCustomers(orders, profiles)

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
          <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ color: '#f2dada' }}>
            <LogOut size={16} />
            ออกจากระบบ
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

        {/* Tab switcher */}
        <div className="grid grid-cols-4 gap-1 rounded-2xl p-1 border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
          {([
            { key: 'orders', label: 'ออเดอร์', icon: <ClipboardList size={15} /> },
            { key: 'summary', label: 'สรุป', icon: <ChefHat size={15} /> },
            { key: 'customers', label: 'ลูกค้า', icon: <Users size={15} /> },
            { key: 'calendar', label: 'วันหยุด', icon: <CalendarOff size={15} /> },
          ] as const).map(({ key, label, icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex items-center justify-center gap-1.5 rounded-xl py-2 font-bold text-xs transition-all"
              style={{
                background: tab === key ? '#4a2728' : 'transparent',
                color: tab === key ? '#f2dada' : '#4a2728',
              }}>
              {icon}{label}
            </button>
          ))}
        </div>

        {/* ORDERS TAB */}
        {tab === 'orders' && <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {(['pending', 'confirmed', 'ready', 'completed'] as OrderStatus[]).map(s => {
              const c = STATUS_COLORS[s]
              const active = filter === s
              return (
                <div key={s}
                  className="rounded-xl p-2 text-center border-2 cursor-pointer transition-all"
                  style={{
                    background: active ? c.bg : 'white',
                    borderColor: active ? c.text : '#e8c4c4',
                    color: active ? c.text : '#4a2728',
                  }}
                  onClick={() => setFilter(active ? 'all' : s)}>
                  <div className="text-xl font-black">{counts[s] ?? 0}</div>
                  <div className="text-xs font-semibold">{ORDER_STATUS_LABEL[s]}</div>
                </div>
              )
            })}
          </div>

          {(() => {
            const src = filter === 'all' ? orders : orders.filter(o => o.status === filter)
            const active = src
              .filter(o => !['completed', 'cancelled'].includes(o.status))
              .sort((a, b) => a.pickup_date.localeCompare(b.pickup_date))
            const done = src
              .filter(o => ['completed', 'cancelled'].includes(o.status))
              .sort((a, b) => b.pickup_date.localeCompare(a.pickup_date))

            function OrderCard({ order }: { order: Order }) {
              const colors = STATUS_COLORS[order.status]
              const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1]
              const orderItems = getOrderItems(order)

              return (
                <div className="rounded-2xl border-2 overflow-hidden" style={{ background: 'white', borderColor: colors.bg === '#e2e3e5' ? '#e8c4c4' : colors.bg }}>
                  {/* Header */}
                  <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm font-black shrink-0" style={{ color: '#4a2728' }}>
                        #{order.id.slice(0, 6).toUpperCase()}
                      </span>
                      <span className="font-bold text-sm truncate" style={{ color: '#4a2728' }}>
                        {order.customer_name}
                      </span>
                    </div>
                    <span className="text-xs font-bold rounded-full px-2 py-0.5 shrink-0"
                      style={{ background: colors.bg, color: colors.text }}>
                      {ORDER_STATUS_LABEL[order.status]}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="px-4 pb-3 space-y-1.5 text-xs" style={{ color: '#4a2728' }}>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-base">×{order.quantity}</span>
                      <span className="font-bold">{order.total_amount.toLocaleString()} บาท</span>
                      <span className="ml-auto font-bold" style={{ color: '#1a5eb8' }}>
                        📅 {new Date(order.pickup_date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {order.delivery_type === 'grab'
                        ? <Truck size={12} style={{ color: '#7a4a4b' }} />
                        : <MapPin size={12} style={{ color: '#7a4a4b' }} />}
                      <span style={{ color: '#7a4a4b' }}>
                        {order.delivery_type === 'grab'
                          ? order.delivery_address || 'Grab'
                          : PICKUP_LOCATIONS[order.pickup_location!]}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      {orderItems.map((it, i) => (
                        <div key={i} className="flex justify-between">
                          <span style={{ color: '#7a4a4b' }}>🧂 {itemLabel(it)}</span>
                          {orderItems.length > 1 && <span className="font-semibold" style={{ color: '#4a2728' }}>×{it.quantity}</span>}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span />
                      <a href={`tel:${order.phone}`} className="font-bold underline" style={{ color: '#4a2728' }}>
                        {order.phone}
                      </a>
                    </div>

                    {order.note && (
                      <p style={{ color: '#7a4a4b' }}>📝 {order.note}</p>
                    )}

                    <div className="flex items-center justify-between pt-0.5">
                      {order.payment_slip_url ? (
                        <a href={order.payment_slip_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 font-semibold" style={{ color: '#1a7a3c' }}>
                          <ExternalLink size={12} /> ดูสลิป
                        </a>
                      ) : (
                        <span style={{ color: '#b09090' }}>⏳ ยังไม่แนบสลิป</span>
                      )}

                      <div className="flex gap-2">
                        {nextStatus && (
                          <button onClick={() => updateStatus(order.id, nextStatus)}
                            className="rounded-lg px-3 py-1.5 text-xs font-bold"
                            style={{ background: '#4a2728', color: '#f2dada' }}>
                            → {ORDER_STATUS_LABEL[nextStatus]}
                          </button>
                        )}
                        {!['cancelled', 'completed'].includes(order.status) && (
                          <button onClick={() => updateStatus(order.id, 'cancelled')}
                            className="rounded-lg px-2 py-1.5 text-xs font-bold"
                            style={{ background: '#f8d7da', color: '#721c24' }}>
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div className="space-y-3">
                {active.length === 0 && filter === 'all' && (
                  <div className="text-center py-10 text-sm" style={{ color: '#7a4a4b' }}>ไม่มีออเดอร์ที่รอดำเนินการ</div>
                )}
                {active.map(o => <OrderCard key={o.id} order={o} />)}

                {done.length > 0 && (
                  <>
                    <button
                      onClick={() => setExpandedId(expandedId === 'done' ? null : 'done')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl border-2 text-sm font-bold"
                      style={{ background: '#f5f5f5', borderColor: '#e8c4c4', color: '#7a4a4b' }}>
                      <span>เสร็จสิ้น / ยกเลิก ({done.length} รายการ)</span>
                      <span>{expandedId === 'done' ? '▲' : '▼'}</span>
                    </button>
                    {expandedId === 'done' && done.map(o => <OrderCard key={o.id} order={o} />)}
                  </>
                )}
              </div>
            )
          })()}
        </>}

        {/* SUMMARY TAB */}
        {tab === 'summary' && (() => {
          const workOrders = orders.filter(o => o.status === 'confirmed' || o.status === 'ready')

          // Group by pickup_date
          const byDate = new Map<string, Order[]>()
          for (const o of workOrders) {
            const d = o.pickup_date.slice(0, 10)
            if (!byDate.has(d)) byDate.set(d, [])
            byDate.get(d)!.push(o)
          }
          const sortedDates = Array.from(byDate.keys()).sort()

          return (
            <div className="space-y-4">
              {workOrders.length === 0 && (
                <div className="text-center py-10 text-sm rounded-2xl border-2"
                  style={{ background: 'white', borderColor: '#e8c4c4', color: '#7a4a4b' }}>
                  ไม่มีออเดอร์ที่ยืนยันแล้ว
                </div>
              )}

              {/* Grand total */}
              {workOrders.length > 0 && (
                <div className="rounded-2xl p-4 border-2 flex items-center justify-between"
                  style={{ background: '#4a2728', borderColor: '#4a2728' }}>
                  <span className="font-bold text-base" style={{ color: '#f2dada' }}>รวมทั้งหมด</span>
                  <span className="text-3xl font-black" style={{ color: '#f2dada' }}>
                    {workOrders.reduce((s, o) => s + o.quantity, 0)} ชิ้น
                  </span>
                </div>
              )}

              {sortedDates.map(date => {
                const dayOrders = byDate.get(date)!
                const totalPieces = dayOrders.reduce((s, o) => s + o.quantity, 0)

                // Build combinations (supports multi-item orders)
                const combos = new Map<string, { label: string; count: number }>()
                for (const o of dayOrders) {
                  for (const it of getOrderItems(o)) {
                    const label = itemLabel(it)
                    if (!combos.has(label)) combos.set(label, { label, count: 0 })
                    combos.get(label)!.count += it.quantity
                  }
                }

                // By location
                const byLocation = new Map<string, number>()
                for (const o of dayOrders) {
                  const loc = o.delivery_type === 'grab'
                    ? '🛵 Grab'
                    : PICKUP_LOCATIONS[o.pickup_location!] ?? 'นัดรับ'
                  byLocation.set(loc, (byLocation.get(loc) ?? 0) + o.quantity)
                }

                return (
                  <div key={date} className="rounded-2xl border-2 overflow-hidden"
                    style={{ background: 'white', borderColor: '#e8c4c4' }}>
                    {/* Date header */}
                    <div className="px-4 py-3 flex items-center justify-between"
                      style={{ background: '#d6e8ff' }}>
                      <span className="font-black text-base" style={{ color: '#1a5eb8' }}>
                        📅 {new Date(date + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-2xl font-black" style={{ color: '#1a5eb8' }}>
                        {totalPieces} ชิ้น
                      </span>
                    </div>

                    <div className="px-4 py-3 space-y-3">
                      {/* Seasoning breakdown */}
                      <div>
                        <p className="text-xs font-bold mb-2" style={{ color: '#7a4a4b' }}>🧂 แยกตามสูตร</p>
                        <div className="space-y-1.5">
                          {Array.from(combos.values()).map(({ label, count }) => (
                            <div key={label} className="flex items-center justify-between rounded-xl px-3 py-2"
                              style={{ background: '#f9f0f0' }}>
                              <span className="text-sm font-medium" style={{ color: '#4a2728' }}>{label}</span>
                              <span className="text-lg font-black" style={{ color: '#4a2728' }}>{count} ชิ้น</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* By location */}
                      <div>
                        <p className="text-xs font-bold mb-2" style={{ color: '#7a4a4b' }}>📍 แยกตามจุดรับ</p>
                        <div className="space-y-1.5">
                          {Array.from(byLocation.entries()).map(([loc, count]) => (
                            <div key={loc} className="flex items-center justify-between rounded-xl px-3 py-2"
                              style={{ background: '#f9f0f0' }}>
                              <span className="text-sm font-medium" style={{ color: '#4a2728' }}>{loc}</span>
                              <span className="text-lg font-black" style={{ color: '#4a2728' }}>{count} ชิ้น</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Order list quick ref */}
                      <div>
                        <p className="text-xs font-bold mb-2" style={{ color: '#7a4a4b' }}>รายการ</p>
                        <div className="space-y-1">
                          {dayOrders.map(o => (
                            <div key={o.id} className="text-xs" style={{ color: '#4a2728' }}>
                              <div className="flex items-center gap-2">
                                <span className="font-black">×{o.quantity}</span>
                                <span className="font-semibold truncate flex-1">{o.customer_name}</span>
                              </div>
                              {getOrderItems(o).map((it, ii) => (
                                <p key={ii} className="ml-5" style={{ color: '#7a4a4b' }}>
                                  ×{it.quantity} {itemLabel(it)}
                                </p>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* CUSTOMERS TAB */}
        {tab === 'customers' && (
          <div className="space-y-3">
            {customers.length === 0 && (
              <div className="text-center py-10 text-sm" style={{ color: '#7a4a4b' }}>ยังไม่มีลูกค้า</div>
            )}
            {customers.map(c => {
              const key = `${c.name}__${c.phone}`
              const expanded = expandedCustomer === key
              const pricing = c.userId ? pricingMap[c.userId] : null
              const isShowingForm = pricingForm?.userId === c.userId
              const pricingExpired = pricing?.expires_at ? new Date(pricing.expires_at) < new Date() : false
              const pricingActive = pricing && !pricingExpired

              return (
                <div key={key} className="rounded-2xl border-2 overflow-hidden" style={{ background: 'white', borderColor: pricingActive ? '#c0392b' : '#e8c4c4' }}>
                  <button className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left"
                    onClick={() => setExpandedCustomer(expanded ? null : key)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm truncate" style={{ color: '#4a2728' }}>{c.name}</p>
                        {pricingActive && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ background: '#ffd6d6', color: '#c0392b' }}>
                            ราคาพิเศษ {pricing!.price_per_piece}฿
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {c.phone && c.phone !== '—' && (
                          <a href={`tel:${c.phone}`} className="text-xs underline" style={{ color: '#7a4a4b' }}
                            onClick={e => e.stopPropagation()}>
                            {c.phone}
                          </a>
                        )}
                        {c.email && (
                          <span className="text-xs" style={{ color: '#b09090' }}>{c.email}</span>
                        )}
                        {c.joinedAt && (
                          <span className="text-xs" style={{ color: '#b09090' }}>
                            · สมัคร {new Date(c.joinedAt).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', year: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className="text-sm font-black" style={{ color: '#4a2728' }}>{c.totalOrders} รอบ · {c.totalPieces} ชิ้น</p>
                      <p className="text-xs font-semibold" style={{ color: '#7a4a4b' }}>{c.totalSpent.toLocaleString()} บาท</p>
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t" style={{ borderColor: '#e8c4c4' }}>
                      {/* Special Pricing Section */}
                      {c.userId && (
                        <div className="px-4 py-3 border-b" style={{ borderColor: '#e8c4c4', background: '#fffdf5' }}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold flex items-center gap-1" style={{ color: '#4a2728' }}>
                              <Tag size={12} /> ราคาพิเศษ
                            </p>
                            <div className="flex gap-2">
                              {pricingActive && (
                                <button onClick={() => removePricing(c.userId!)}
                                  className="text-xs font-semibold flex items-center gap-0.5"
                                  style={{ color: '#c0392b' }}>
                                  <X size={12} /> ลบ
                                </button>
                              )}
                              <button
                                onClick={() => setPricingForm(isShowingForm ? null : {
                                  userId: c.userId!,
                                  price: pricing?.price_per_piece?.toString() ?? '',
                                  expires_at: pricing?.expires_at ? pricing.expires_at.slice(0, 10) : '',
                                  note: pricing?.note ?? '',
                                })}
                                className="text-xs font-semibold"
                                style={{ color: '#1a5eb8' }}>
                                {isShowingForm ? 'ยกเลิก' : pricingActive ? 'แก้ไข' : '+ ตั้งราคา'}
                              </button>
                            </div>
                          </div>

                          {pricingActive && !isShowingForm && (
                            <div className="text-xs space-y-0.5" style={{ color: '#7a4a4b' }}>
                              <p>ราคา <b style={{ color: '#4a2728' }}>{pricing!.price_per_piece} บาท/ชิ้น</b>
                                {' '}(ปกติ {PRICE_PER_PIECE} บาท)</p>
                              {pricing!.expires_at && (
                                <p>หมดอายุ {new Date(pricing!.expires_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                              )}
                              {!pricing!.expires_at && <p>ถาวร</p>}
                              {pricing!.note && <p>หมายเหตุ: {pricing!.note}</p>}
                            </div>
                          )}

                          {isShowingForm && (
                            <div className="space-y-2 mt-1">
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <p className="text-xs mb-1" style={{ color: '#7a4a4b' }}>ราคา (บาท/ชิ้น)</p>
                                  <input type="number" value={pricingForm!.price}
                                    onChange={e => setPricingForm(p => p ? { ...p, price: e.target.value } : null)}
                                    placeholder={String(PRICE_PER_PIECE)}
                                    className="w-full rounded-lg px-3 py-2 border-2 text-sm font-bold"
                                    style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs mb-1" style={{ color: '#7a4a4b' }}>หมดอายุ (ว่าง = ถาวร)</p>
                                  <input type="date" value={pricingForm!.expires_at}
                                    onChange={e => setPricingForm(p => p ? { ...p, expires_at: e.target.value } : null)}
                                    className="w-full rounded-lg px-3 py-2 border-2 text-sm"
                                    style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
                                </div>
                              </div>
                              <input type="text" value={pricingForm!.note}
                                onChange={e => setPricingForm(p => p ? { ...p, note: e.target.value } : null)}
                                placeholder="หมายเหตุ (ไม่บังคับ)"
                                className="w-full rounded-lg px-3 py-2 border-2 text-sm"
                                style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
                              <button onClick={savePricing} disabled={pricingLoading || !pricingForm!.price}
                                className="w-full rounded-lg py-2 text-xs font-bold disabled:opacity-50"
                                style={{ background: '#4a2728', color: '#f2dada' }}>
                                {pricingLoading ? 'กำลังบันทึก...' : 'บันทึกราคาพิเศษ'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Order history */}
                      {c.orders.map((order, i) => {
                        const colors = STATUS_COLORS[order.status]
                        const oi = getOrderItems(order)
                        return (
                          <div key={order.id} className={i > 0 ? 'border-t' : ''} style={{ borderColor: '#f0dada' }}>
                            <div className="px-4 py-3 flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black" style={{ color: '#4a2728' }}>
                                    #{order.id.slice(0, 6).toUpperCase()}
                                  </span>
                                  <span className="text-xs font-bold rounded-full px-2 py-0.5"
                                    style={{ background: colors.bg, color: colors.text }}>
                                    {ORDER_STATUS_LABEL[order.status]}
                                  </span>
                                </div>
                                <p className="text-xs mt-0.5" style={{ color: '#7a4a4b' }}>
                                  {new Date(order.pickup_date + 'T00:00:00').toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                                  {' · '}{order.delivery_type === 'grab' ? 'Grab' : 'นัดรับ'}
                                </p>
                                {oi.map((it, ii) => (
                                  <p key={ii} className="text-xs" style={{ color: '#7a4a4b' }}>
                                    ×{it.quantity} {itemLabel(it)}
                                  </p>
                                ))}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-black" style={{ color: '#4a2728' }}>×{order.quantity}</p>
                                <p className="text-xs" style={{ color: '#7a4a4b' }}>{order.total_amount.toLocaleString()} บาท</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {/* CALENDAR TAB */}
        {tab === 'calendar' && (
          <div className="space-y-4">
            {/* Add new blocked range */}
            <div className="rounded-2xl p-5 border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
              <h3 className="font-bold text-base mb-3 flex items-center gap-2" style={{ color: '#4a2728' }}>
                <CalendarOff size={16} /> เพิ่มช่วงวันที่ไม่สะดวก
              </h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs mb-1 font-semibold" style={{ color: '#7a4a4b' }}>ตั้งแต่วันที่</p>
                    <input type="date" value={newBlock.start_date}
                      onChange={e => setNewBlock(p => ({ ...p, start_date: e.target.value, end_date: p.end_date || e.target.value }))}
                      className="w-full rounded-xl px-3 py-2.5 border-2 text-sm font-medium"
                      style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
                  </div>
                  <div>
                    <p className="text-xs mb-1 font-semibold" style={{ color: '#7a4a4b' }}>ถึงวันที่</p>
                    <input type="date" value={newBlock.end_date}
                      min={newBlock.start_date}
                      onChange={e => setNewBlock(p => ({ ...p, end_date: e.target.value }))}
                      className="w-full rounded-xl px-3 py-2.5 border-2 text-sm font-medium"
                      style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
                  </div>
                </div>
                <input type="text" value={newBlock.note}
                  onChange={e => setNewBlock(p => ({ ...p, note: e.target.value }))}
                  placeholder="หมายเหตุ เช่น วันหยุดสงกรานต์ (ไม่บังคับ)"
                  className="w-full rounded-xl px-3 py-2.5 border-2 text-sm"
                  style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
                <button onClick={addBlockedDate} disabled={blockLoading || !newBlock.start_date}
                  className="w-full rounded-xl py-2.5 text-sm font-bold disabled:opacity-50"
                  style={{ background: '#4a2728', color: '#f2dada' }}>
                  {blockLoading ? 'กำลังบันทึก...' : '+ เพิ่มวันหยุด'}
                </button>
              </div>
            </div>

            {/* List */}
            <div className="rounded-2xl border-2 overflow-hidden" style={{ background: 'white', borderColor: '#e8c4c4' }}>
              {blockedDates.length === 0 ? (
                <p className="text-center py-8 text-sm" style={{ color: '#7a4a4b' }}>ยังไม่มีวันที่ปิดรับออเดอร์</p>
              ) : blockedDates.map((b, i) => {
                const isEditing = editBlock?.id === b.id
                const isSame = b.start_date === b.end_date
                const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
                return (
                  <div key={b.id} className={`${i > 0 ? 'border-t' : ''}`} style={{ borderColor: '#e8c4c4' }}>
                    {!isEditing ? (
                      <div className="px-4 py-3 flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold" style={{ color: '#4a2728' }}>
                            {isSame ? fmt(b.start_date) : `${fmt(b.start_date)} – ${fmt(b.end_date)}`}
                          </p>
                          {b.note && <p className="text-xs mt-0.5" style={{ color: '#7a4a4b' }}>{b.note}</p>}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => setEditBlock({ id: b.id, start_date: b.start_date, end_date: b.end_date, note: b.note ?? '' })}
                            className="text-xs font-semibold px-2 py-1 rounded-lg"
                            style={{ color: '#1a5eb8', background: '#eef2ff' }}>
                            แก้ไข
                          </button>
                          <button onClick={() => removeBlockedDate(b.id)}
                            className="p-1.5 rounded-lg" style={{ color: '#c0392b' }}>
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-3 space-y-2" style={{ background: '#fffdf5' }}>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs mb-1 font-semibold" style={{ color: '#7a4a4b' }}>ตั้งแต่วันที่</p>
                            <input type="date" value={editBlock.start_date}
                              onChange={e => setEditBlock(p => p ? { ...p, start_date: e.target.value } : null)}
                              className="w-full rounded-lg px-2 py-2 border-2 text-sm"
                              style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
                          </div>
                          <div>
                            <p className="text-xs mb-1 font-semibold" style={{ color: '#7a4a4b' }}>ถึงวันที่</p>
                            <input type="date" value={editBlock.end_date}
                              min={editBlock.start_date}
                              onChange={e => setEditBlock(p => p ? { ...p, end_date: e.target.value } : null)}
                              className="w-full rounded-lg px-2 py-2 border-2 text-sm"
                              style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
                          </div>
                        </div>
                        <input type="text" value={editBlock.note}
                          onChange={e => setEditBlock(p => p ? { ...p, note: e.target.value } : null)}
                          placeholder="หมายเหตุ (ไม่บังคับ)"
                          className="w-full rounded-lg px-2 py-2 border-2 text-sm"
                          style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
                        <div className="flex gap-2">
                          <button onClick={saveEditBlock} disabled={blockLoading}
                            className="flex-1 rounded-lg py-2 text-xs font-bold disabled:opacity-50"
                            style={{ background: '#4a2728', color: '#f2dada' }}>
                            {blockLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                          </button>
                          <button onClick={() => setEditBlock(null)}
                            className="px-3 rounded-lg py-2 text-xs font-bold"
                            style={{ background: '#e8c4c4', color: '#4a2728' }}>
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
