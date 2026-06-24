'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Truck, ExternalLink, Pencil, X, Minus, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { PICKUP_LOCATIONS, ORDER_STATUS_LABEL, getOrderItems, itemLabel, type Order, type OrderStatus, type OrderItem, type DeliveryType, type PickupLocation } from '@/lib/types'
import ChickenLoader from '@/components/ChickenLoader'
import dynamic from 'next/dynamic'

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false })

const STATUS_STEPS: OrderStatus[] = ['pending', 'confirmed', 'ready', 'completed']
const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending:   { bg: '#fff3cd', text: '#856404' },
  confirmed: { bg: '#d1ecf1', text: '#0c5460' },
  ready:     { bg: '#d4edda', text: '#155724' },
  completed: { bg: '#e2e3e5', text: '#383d41' },
  cancelled: { bg: '#f8d7da', text: '#721c24' },
}

function getMinDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const defaultItem = (): OrderItem => ({ quantity: 1, no_pepper: false, sesame_oil: false })

function ItemEditor({ item, idx, total, onChange, onRemove }: {
  item: OrderItem; idx: number; total: number
  onChange: (p: Partial<OrderItem>) => void; onRemove: () => void
}) {
  return (
    <div className="rounded-xl border-2 p-3 space-y-2.5" style={{ borderColor: '#e8c4c4', background: '#fffcfc' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold" style={{ color: '#4a2728' }}>สูตรที่ {idx + 1}</span>
        {total > 1 && <button type="button" onClick={onRemove} style={{ color: '#b89a9b' }}><X size={15} /></button>}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: '#7a4a4b' }}>จำนวน</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onChange({ quantity: Math.max(1, item.quantity - 1) })} disabled={item.quantity <= 1}
            className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-40"
            style={{ background: '#4a2728', color: '#f2dada' }}><Minus size={12} /></button>
          <span className="text-base font-black w-6 text-center" style={{ color: '#4a2728' }}>{item.quantity}</span>
          <button type="button" onClick={() => onChange({ quantity: item.quantity + 1 })}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: '#4a2728', color: '#f2dada' }}><Plus size={12} /></button>
        </div>
      </div>
      <div className="flex gap-1.5">
        {([['no_pepper', 'ไม่ใส่พริกไท'], ['sesame_oil', 'เพิ่มน้ำมันงา']] as [keyof OrderItem, string][]).map(([key, label]) => (
          <button key={key} type="button" onClick={() => onChange({ [key]: !item[key] })}
            className="flex-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 border-2 text-left transition-all"
            style={{ borderColor: item[key] ? '#4a2728' : '#e8c4c4', background: item[key] ? '#f2dada' : 'white' }}>
            <div className="w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0"
              style={{ borderColor: '#4a2728', background: item[key] ? '#4a2728' : 'white' }}>
              {item[key] && <svg viewBox="0 0 12 12" className="w-2 h-2" fill="none">
                <path d="M2 6l3 3 5-5" stroke="#f2dada" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>}
            </div>
            <span className="text-xs font-semibold" style={{ color: '#4a2728' }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // Edit form state
  const [editItems, setEditItems] = useState<OrderItem[]>([defaultItem()])
  const [editDate, setEditDate] = useState('')
  const [editDelivery, setEditDelivery] = useState<DeliveryType>('pickup')
  const [editLocation, setEditLocation] = useState<PickupLocation>('donmueang')
  const [editAddress, setEditAddress] = useState('')
  const [editNote, setEditNote] = useState('')
  const [mapCoords, setMapCoords] = useState({ lat: 13.7563, lng: 100.5018 })

  useEffect(() => {
    fetch(`/api/account/orders/${id}`)
      .then(r => { if (!r.ok) router.push('/account/orders'); return r.json() })
      .then(setOrder)
      .catch(() => router.push('/account/orders'))
  }, [id])

  function startEdit() {
    if (!order) return
    setEditItems(getOrderItems(order))
    setEditDate(order.pickup_date)
    setEditDelivery(order.delivery_type)
    setEditLocation(order.pickup_location ?? 'donmueang')
    setEditAddress(order.delivery_address ?? '')
    setEditNote(order.note ?? '')
    setEditing(true)
  }

  async function saveEdit() {
    setSaving(true)
    try {
      const res = await fetch(`/api/account/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: editItems,
          pickup_date: editDate,
          delivery_type: editDelivery,
          pickup_location: editDelivery === 'pickup' ? editLocation : null,
          delivery_address: editDelivery === 'grab' ? editAddress : null,
          note: editNote,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOrder(data)
      setEditing(false)
      toast.success('แก้ไขออเดอร์แล้ว')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  async function cancelOrder() {
    if (!confirm('ยืนยันการยกเลิกออเดอร์?')) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/account/orders/${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      toast.success('ยกเลิกออเดอร์แล้ว')
      router.push('/account/orders')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
      setCancelling(false)
    }
  }

  function updateEditItem(idx: number, patch: Partial<OrderItem>) {
    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }

  if (!order) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#f2dada' }}>
      <ChickenLoader />
    </main>
  )

  const colors = STATUS_COLORS[order.status]
  const stepIndex = STATUS_STEPS.indexOf(order.status)
  const canEdit = order.status === 'pending'
  const orderItems = getOrderItems(order)
  const editTotalQty = editItems.reduce((s, i) => s + i.quantity, 0)

  if (editing) {
    return (
      <main className="min-h-screen pb-8 pt-6 px-4" style={{ background: '#f2dada' }}>
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setEditing(false)} className="p-2 rounded-xl" style={{ background: 'white' }}>
              <ArrowLeft size={20} style={{ color: '#4a2728' }} />
            </button>
            <h1 className="text-xl font-black" style={{ color: '#4a2728' }}>แก้ไขออเดอร์ #{order.id.slice(0, 6).toUpperCase()}</h1>
          </div>

          {/* Items editor */}
          <div className="rounded-2xl p-5 border-2 space-y-3" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <h3 className="font-bold text-base" style={{ color: '#4a2728' }}>สูตรและจำนวน</h3>
            {editItems.map((item, idx) => (
              <ItemEditor key={idx} item={item} idx={idx} total={editItems.length}
                onChange={p => updateEditItem(idx, p)}
                onRemove={() => setEditItems(prev => prev.filter((_, i) => i !== idx))} />
            ))}
            <button type="button" onClick={() => setEditItems(prev => [...prev, defaultItem()])}
              className="w-full rounded-xl py-2 text-sm font-bold border-2 border-dashed"
              style={{ borderColor: '#e8c4c4', color: '#7a4a4b' }}>+ เพิ่มสูตร</button>
            <div className="pt-1 flex justify-between text-sm font-bold" style={{ color: '#4a2728' }}>
              <span>รวม {editTotalQty} ชิ้น</span>
            </div>
          </div>

          {/* Date */}
          <div className="rounded-2xl p-5 border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <h3 className="font-bold text-base mb-2" style={{ color: '#4a2728' }}>วันที่รับสินค้า</h3>
            <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} min={getMinDate()}
              className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium"
              style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
          </div>

          {/* Delivery */}
          <div className="rounded-2xl p-5 border-2 space-y-3" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <h3 className="font-bold text-base" style={{ color: '#4a2728' }}>วิธีรับสินค้า</h3>
            <div className="grid grid-cols-2 gap-3">
              {(['pickup', 'grab'] as DeliveryType[]).map(type => (
                <button key={type} type="button" onClick={() => setEditDelivery(type)}
                  className="rounded-xl p-3 border-2 text-center transition-all"
                  style={{ borderColor: editDelivery === type ? '#4a2728' : '#e8c4c4', background: editDelivery === type ? '#4a2728' : 'white', color: editDelivery === type ? '#f2dada' : '#4a2728' }}>
                  {type === 'pickup' ? <MapPin size={18} className="mx-auto mb-1" /> : <Truck size={18} className="mx-auto mb-1" />}
                  <div className="text-sm font-bold">{type === 'pickup' ? 'นัดรับ' : 'Grab'}</div>
                </button>
              ))}
            </div>
            {editDelivery === 'pickup' && (
              <div className="space-y-2">
                {(Object.entries(PICKUP_LOCATIONS) as [PickupLocation, string][]).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setEditLocation(key)}
                    className="w-full rounded-xl px-4 py-2.5 border-2 text-left text-sm font-medium transition-all"
                    style={{ borderColor: editLocation === key ? '#4a2728' : '#e8c4c4', background: editLocation === key ? '#f2dada' : 'white', color: '#4a2728' }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
            {editDelivery === 'grab' && (
              <div className="space-y-2">
                <MapPicker lat={mapCoords.lat} lng={mapCoords.lng}
                  onMove={(lat, lng, address) => { setMapCoords({ lat, lng }); setEditAddress(address) }} />
                <textarea value={editAddress} onChange={e => setEditAddress(e.target.value)}
                  placeholder="ที่อยู่จัดส่ง" rows={2}
                  className="w-full rounded-xl px-3 py-2.5 border-2 text-sm resize-none"
                  style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
              </div>
            )}
          </div>

          {/* Note */}
          <div className="rounded-2xl p-5 border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <h3 className="font-bold text-base mb-2" style={{ color: '#4a2728' }}>หมายเหตุ</h3>
            <textarea value={editNote} onChange={e => setEditNote(e.target.value)} rows={2}
              placeholder="หมายเหตุเพิ่มเติม..."
              className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium resize-none"
              style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setEditing(false)}
              className="flex-1 rounded-2xl py-3 text-sm font-bold"
              style={{ background: '#e8c4c4', color: '#4a2728' }}>
              ยกเลิก
            </button>
            <button onClick={saveEdit} disabled={saving}
              className="flex-1 rounded-2xl py-3 text-sm font-bold disabled:opacity-50"
              style={{ background: '#4a2728', color: '#f2dada' }}>
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen pb-8 pt-6 px-4" style={{ background: '#f2dada' }}>
      <div className="max-w-md mx-auto space-y-4">

        <div className="flex items-center gap-3">
          <Link href="/account/orders" className="p-2 rounded-xl" style={{ background: 'white' }}>
            <ArrowLeft size={20} style={{ color: '#4a2728' }} />
          </Link>
          <h1 className="text-xl font-black" style={{ color: '#4a2728' }}>#{order.id.slice(0, 6).toUpperCase()}</h1>
          <span className="ml-auto text-xs font-bold rounded-full px-3 py-1" style={{ background: colors.bg, color: colors.text }}>
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
                      style={{ background: i <= stepIndex ? '#4a2728' : '#e8c4c4', color: i <= stepIndex ? '#f2dada' : '#b89a9b' }}>
                      {i < stepIndex ? '✓' : i + 1}
                    </div>
                    <span className="text-center font-semibold mt-1" style={{ color: i <= stepIndex ? '#4a2728' : '#b89a9b', fontSize: '10px' }}>
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-base" style={{ color: '#4a2728' }}>รายละเอียดออเดอร์</h3>
            {canEdit && (
              <button onClick={startEdit} className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg"
                style={{ color: '#1a5eb8', background: '#eef2ff' }}>
                <Pencil size={12} /> แก้ไข
              </button>
            )}
          </div>

          {/* Items */}
          <div className="space-y-1 pb-2 border-b" style={{ borderColor: '#e8c4c4' }}>
            {orderItems.map((it, i) => (
              <div key={i} className="flex justify-between">
                <span style={{ color: '#7a4a4b' }}>{itemLabel(it)}</span>
                <span className="font-bold" style={{ color: '#4a2728' }}>×{it.quantity} ชิ้น</span>
              </div>
            ))}
          </div>

          {[
            ['วันรับ', new Date(order.pickup_date + 'T00:00:00').toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })],
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
              {order.delivery_type === 'pickup' ? PICKUP_LOCATIONS[order.pickup_location!] : order.delivery_address}
            </span>
          </div>

          {order.note && (
            <div className="flex justify-between">
              <span style={{ color: '#7a4a4b' }}>หมายเหตุ</span>
              <span className="font-bold text-right ml-4" style={{ color: '#4a2728' }}>{order.note}</span>
            </div>
          )}
        </div>

        {/* Payment */}
        {order.payment_slip_url ? (
          <a href={order.payment_slip_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-2xl p-4 border-2 text-sm font-semibold"
            style={{ background: 'white', borderColor: '#e8c4c4', color: '#4a2728' }}>
            <ExternalLink size={16} /> ดูสลิปโอนเงิน
          </a>
        ) : order.status === 'pending' && (
          <Link href={`/order/${order.id}`}
            className="block text-center rounded-2xl py-3 text-sm font-bold"
            style={{ background: '#4a2728', color: '#f2dada' }}>
            ไปชำระเงิน →
          </Link>
        )}

        {/* Cancel */}
        {canEdit && (
          <button onClick={cancelOrder} disabled={cancelling}
            className="w-full rounded-2xl py-3 text-sm font-bold border-2 disabled:opacity-50"
            style={{ borderColor: '#f8d7da', color: '#721c24', background: '#fff5f5' }}>
            {cancelling ? 'กำลังยกเลิก...' : 'ยกเลิกออเดอร์'}
          </button>
        )}
      </div>
    </main>
  )
}
