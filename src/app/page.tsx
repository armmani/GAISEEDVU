'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ShoppingBag, MapPin, Truck, Minus, Plus, X } from 'lucide-react'
import { PICKUP_LOCATIONS, PRICE_PER_PIECE, getOrderItems, type DeliveryType, type PickupLocation, type OrderItem } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import dynamic from 'next/dynamic'

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false })

function getMinDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const defaultItem = (): OrderItem => ({ quantity: 1, no_pepper: false, sesame_oil: false })

function ItemCard({ item, idx, total, onChange, onRemove }: {
  item: OrderItem; idx: number; total: number
  onChange: (patch: Partial<OrderItem>) => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-xl border-2 p-4 space-y-3" style={{ borderColor: '#e8c4c4', background: '#fffcfc' }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold" style={{ color: '#4a2728' }}>สูตรที่ {idx + 1}</span>
        {total > 1 && (
          <button type="button" onClick={onRemove}
            className="p-1 rounded-lg" style={{ color: '#b89a9b' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Quantity */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: '#7a4a4b' }}>จำนวน</span>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => onChange({ quantity: Math.max(1, item.quantity - 1) })}
            disabled={item.quantity <= 1}
            className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40"
            style={{ background: '#4a2728', color: '#f2dada' }}>
            <Minus size={14} />
          </button>
          <span className="text-xl font-black w-7 text-center" style={{ color: '#4a2728' }}>{item.quantity}</span>
          <button type="button" onClick={() => onChange({ quantity: item.quantity + 1 })}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: '#4a2728', color: '#f2dada' }}>
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="flex gap-2">
        {[
          { key: 'no_pepper' as const, label: 'ไม่ใส่พริกไท' },
          { key: 'sesame_oil' as const, label: 'เพิ่มน้ำมันงา' },
        ].map(({ key, label }) => (
          <button key={key} type="button" onClick={() => onChange({ [key]: !item[key] })}
            className="flex-1 flex items-center gap-2 rounded-lg px-3 py-2 border-2 text-left transition-all"
            style={{ borderColor: item[key] ? '#4a2728' : '#e8c4c4', background: item[key] ? '#f2dada' : 'white' }}>
            <div className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0"
              style={{ borderColor: '#4a2728', background: item[key] ? '#4a2728' : 'white' }}>
              {item[key] && <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none">
                <path d="M2 6l3 3 5-5" stroke="#f2dada" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>}
            </div>
            <span className="text-xs font-semibold" style={{ color: '#4a2728' }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function OrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [pricePerPiece, setPricePerPiece] = useState(PRICE_PER_PIECE)
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('pickup')
  const [pickupLocation, setPickupLocation] = useState<PickupLocation>('donmueang')
  const [mapCoords, setMapCoords] = useState({ lat: 13.7563, lng: 100.5018 })
  const [blockedRanges, setBlockedRanges] = useState<{ start_date: string; end_date: string; note: string | null }[]>([])
  const [items, setItems] = useState<OrderItem[]>([defaultItem()])
  const [form, setForm] = useState({ customer_name: '', phone: '', delivery_address: '', pickup_date: '', note: '' })

  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const total = totalQty * pricePerPiece

  useEffect(() => {
    fetch('/api/account/pricing').then(r => r.json()).then(d => { if (d.price_per_piece) setPricePerPiece(d.price_per_piece) }).catch(() => {})
    fetch('/api/account/profile').then(r => r.json()).then(profile => {
      if (profile) setForm(prev => ({ ...prev, customer_name: profile.display_name || '', phone: profile.phone || '', delivery_address: profile.default_address || '' }))
    }).catch(() => {})
    fetch('/api/blocked-dates').then(r => r.json()).then(d => { if (Array.isArray(d)) setBlockedRanges(d) }).catch(() => {})

    // Reorder prefill
    const reorderId = new URLSearchParams(window.location.search).get('reorder')
    if (reorderId) {
      fetch(`/api/account/orders/${reorderId}`).then(r => r.json()).then(order => {
        if (order && !order.error) {
          setForm(prev => ({
            ...prev,
            customer_name: order.customer_name || prev.customer_name,
            phone: order.phone || prev.phone,
            delivery_address: order.delivery_address || '',
            note: order.note || '',
            pickup_date: '',
          }))
          setDeliveryType(order.delivery_type)
          if (order.pickup_location) setPickupLocation(order.pickup_location)
          setItems(getOrderItems(order))
        }
      }).catch(() => {})
    }
  }, [])

  function setField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }
  function updateItem(idx: number, patch: Partial<OrderItem>) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customer_name.trim()) return toast.error('กรุณากรอกชื่อ')
    if (!form.phone.trim()) return toast.error('กรุณากรอกเบอร์โทร')
    if (!form.pickup_date) return toast.error('กรุณาเลือกวันรับ')
    if (deliveryType === 'grab' && !form.delivery_address.trim()) return toast.error('กรุณากรอกที่อยู่สำหรับ Grab')

    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, items, delivery_type: deliveryType, pickup_location: deliveryType === 'pickup' ? pickupLocation : null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด')
      router.push(`/order/${data.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen pb-24 pt-6 px-4" style={{ background: '#f2dada' }}>
      <div className="max-w-md mx-auto">

        <div className="text-center mb-6">
          <img src="/logo.png" alt="GAI SEED VU" className="w-64 mx-auto" />
          <div className="flex items-center justify-center gap-4 mt-3">
            <a href="https://www.facebook.com/profile.php?id=61590657426900" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full"
              style={{ background: '#1877f2', color: 'white' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </a>
            <a href="https://www.instagram.com/gaiseedvu/" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full"
              style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: 'white' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
              Instagram
            </a>
          </div>
        </div>

        {/* Product info */}
        <div className="rounded-2xl p-5 mb-4 border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold" style={{ color: '#4a2728' }}>Original เกลือพริกไท</h2>
              <p className="text-sm mt-1" style={{ color: '#7a4a4b' }}>ไก่ซูวีด 200–300 กรัม/ชิ้น</p>
              {pricePerPiece !== PRICE_PER_PIECE ? (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <p className="text-sm line-through" style={{ color: '#b09090' }}>ชิ้นละ {PRICE_PER_PIECE} บาท</p>
                  <p className="text-2xl font-black" style={{ color: '#c0392b' }}>ชิ้นละ {pricePerPiece} บาท</p>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#ffd6d6', color: '#c0392b' }}>ราคาพิเศษ</span>
                </div>
              ) : (
                <p className="text-2xl font-black mt-2" style={{ color: '#4a2728' }}>ชิ้นละ {PRICE_PER_PIECE} บาท</p>
              )}
            </div>
            <div className="rounded-xl px-3 py-1 text-xs font-bold shrink-0" style={{ background: '#f2dada', color: '#4a2728' }}>Pre-order</div>
          </div>
          <div className="mt-4 pt-3 border-t flex justify-between items-center" style={{ borderColor: '#e8c4c4' }}>
            <span className="font-semibold" style={{ color: '#4a2728' }}>รวมทั้งหมด</span>
            <div className="text-right">
              <span className="text-2xl font-black" style={{ color: '#4a2728' }}>{total.toLocaleString()} บาท</span>
              <span className="ml-2 text-sm font-semibold" style={{ color: '#7a4a4b' }}>({totalQty} ชิ้น)</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer info */}
          <div className="rounded-2xl p-5 border-2 space-y-4" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <h3 className="font-bold text-lg" style={{ color: '#4a2728' }}>ข้อมูลผู้สั่ง</h3>
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>ชื่อ *</label>
              <input type="text" value={form.customer_name} onChange={e => setField('customer_name', e.target.value)}
                placeholder="ชื่อ-นามสกุล" className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium"
                style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>เบอร์โทร *</label>
              <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)}
                placeholder="08X-XXX-XXXX" className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium"
                style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
            </div>
          </div>

          {/* Delivery */}
          <div className="rounded-2xl p-5 border-2 space-y-4" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <h3 className="font-bold text-lg" style={{ color: '#4a2728' }}>วิธีรับสินค้า</h3>
            <div className="grid grid-cols-2 gap-3">
              {(['pickup', 'grab'] as DeliveryType[]).map(type => (
                <button key={type} type="button" onClick={() => setDeliveryType(type)}
                  className="rounded-xl p-3 border-2 text-center transition-all"
                  style={{ borderColor: deliveryType === type ? '#4a2728' : '#e8c4c4', background: deliveryType === type ? '#4a2728' : 'white', color: deliveryType === type ? '#f2dada' : '#4a2728' }}>
                  {type === 'pickup' ? <MapPin size={20} className="mx-auto mb-1" /> : <Truck size={20} className="mx-auto mb-1" />}
                  <div className="text-sm font-bold">{type === 'pickup' ? 'นัดรับ' : 'Grab (กทม.)'}</div>
                </button>
              ))}
            </div>
            {deliveryType === 'pickup' && (
              <div className="space-y-2">
                {(Object.entries(PICKUP_LOCATIONS) as [PickupLocation, string][]).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setPickupLocation(key)}
                    className="w-full rounded-xl px-4 py-3 border-2 text-left text-sm font-medium transition-all"
                    style={{ borderColor: pickupLocation === key ? '#4a2728' : '#e8c4c4', background: pickupLocation === key ? '#f2dada' : 'white', color: '#4a2728' }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
            {deliveryType === 'grab' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#7a4a4b' }}>
                    ปักหมุดตำแหน่งจัดส่ง * <span className="font-normal">(เฉพาะ กทม.)</span>
                  </label>
                  <MapPicker lat={mapCoords.lat} lng={mapCoords.lng} onMove={(lat, lng, address) => { setMapCoords({ lat, lng }); setField('delivery_address', address) }} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>ที่อยู่ (แก้ไขได้)</label>
                  <textarea value={form.delivery_address} onChange={e => setField('delivery_address', e.target.value)}
                    placeholder="ที่อยู่จะขึ้นอัตโนมัติหลังปักหมุด หรือพิมพ์เองได้เลย" rows={2}
                    className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium resize-none"
                    style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
                </div>
                <p className="text-xs" style={{ color: '#7a4a4b' }}>ค่าส่ง Grab เก็บปลายทาง</p>
              </div>
            )}
          </div>

          {/* Date */}
          <div className="rounded-2xl p-5 border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <h3 className="font-bold text-lg mb-3" style={{ color: '#4a2728' }}>วันที่รับสินค้า</h3>
            {blockedRanges.length > 0 && (
              <div className="mb-3 rounded-xl p-3 space-y-1.5" style={{ background: '#fff3cd', border: '1.5px solid #f0c040' }}>
                <p className="text-xs font-bold" style={{ color: '#7a4a0a' }}>⚠️ วันที่ไม่สะดวกรับออเดอร์</p>
                {blockedRanges.map((r, i) => {
                  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
                  const label = r.start_date === r.end_date ? fmt(r.start_date) : `${fmt(r.start_date)} – ${fmt(r.end_date)}`
                  return (
                    <div key={i} className="text-xs" style={{ color: '#7a4a0a' }}>
                      <span className="font-semibold">{label}</span>
                      {r.note && <span className="ml-1 opacity-80">— {r.note}</span>}
                    </div>
                  )
                })}
              </div>
            )}
            <input type="date" value={form.pickup_date}
              onChange={e => {
                const val = e.target.value
                if (blockedRanges.some(r => val >= r.start_date && val <= r.end_date)) {
                  toast.error('วันที่เลือกไม่สะดวกรับออเดอร์ กรุณาเลือกวันอื่น')
                  setField('pickup_date', '')
                } else {
                  setField('pickup_date', val)
                }
              }}
              min={getMinDate()}
              className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium"
              style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
            <p className="text-xs mt-2" style={{ color: '#7a4a4b' }}>สั่งล่วงหน้าอย่างน้อย 1 วัน</p>
          </div>

          {/* Items */}
          <div className="rounded-2xl p-5 border-2 space-y-3" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <h3 className="font-bold text-lg" style={{ color: '#4a2728' }}>สูตรและจำนวน</h3>
            {items.map((item, idx) => (
              <ItemCard key={idx} item={item} idx={idx} total={items.length}
                onChange={patch => updateItem(idx, patch)}
                onRemove={() => setItems(prev => prev.filter((_, i) => i !== idx))} />
            ))}
            <button type="button" onClick={() => setItems(prev => [...prev, defaultItem()])}
              className="w-full rounded-xl py-2.5 text-sm font-bold border-2 border-dashed transition-all"
              style={{ borderColor: '#e8c4c4', color: '#7a4a4b' }}>
              + เพิ่มสูตร
            </button>
          </div>

          {/* Note */}
          <div className="rounded-2xl p-5 border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <h3 className="font-bold text-lg mb-3" style={{ color: '#4a2728' }}>หมายเหตุ (ถ้ามี)</h3>
            <textarea value={form.note} onChange={e => setField('note', e.target.value)}
              placeholder="แจ้งเพิ่มเติมได้เลย..." rows={2}
              className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium resize-none"
              style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
          </div>

          <button type="submit" disabled={loading}
            className="w-full rounded-2xl py-4 font-black text-lg flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: '#4a2728', color: '#f2dada' }}>
            <ShoppingBag size={22} />
            {loading ? 'กำลังส่งออเดอร์...' : `สั่งเลย — ${total.toLocaleString()} บาท`}
          </button>
          <p className="text-center text-xs pb-2" style={{ color: '#7a4a4b' }}>
            หลังสั่งแล้วจะต้องโอนเงิน + แนบสลิปเพื่อยืนยันออเดอร์
          </p>
        </form>
      </div>
      <BottomNav />
    </main>
  )
}
