'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ShoppingBag, MapPin, Truck, Minus, Plus } from 'lucide-react'
import { PICKUP_LOCATIONS, PRICE_PER_PIECE, type DeliveryType, type PickupLocation } from '@/lib/types'

function getMinDate() {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().split('T')[0]
}

export default function OrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('pickup')
  const [pickupLocation, setPickupLocation] = useState<PickupLocation>('donmueang')
  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    delivery_address: '',
    pickup_date: '',
    note: '',
  })

  const total = quantity * PRICE_PER_PIECE

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
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
        body: JSON.stringify({
          ...form,
          quantity,
          total_amount: total,
          delivery_type: deliveryType,
          pickup_location: deliveryType === 'pickup' ? pickupLocation : null,
        }),
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
    <main className="min-h-screen py-8 px-4" style={{ background: '#f2dada' }}>
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-2">🐔</div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color: '#4a2728' }}>
            GAI SEED VU
          </h1>
          <p className="text-sm font-bold mt-1 tracking-widest uppercase" style={{ color: '#7a4a4b' }}>
            Sous Vide Chicken
          </p>
        </div>

        {/* Product Card */}
        <div className="rounded-2xl p-5 mb-6 border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold" style={{ color: '#4a2728' }}>
                Original เกลือพริกไท
              </h2>
              <p className="text-sm mt-1" style={{ color: '#7a4a4b' }}>
                ไก่ซูวีด 200–300 กรัม/ชิ้น
              </p>
              <p className="text-2xl font-black mt-2" style={{ color: '#4a2728' }}>
                ชิ้นละ {PRICE_PER_PIECE} บาท
              </p>
            </div>
            <div className="rounded-xl px-3 py-1 text-xs font-bold shrink-0" style={{ background: '#f2dada', color: '#4a2728' }}>
              Pre-order
            </div>
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-between mt-4">
            <span className="font-semibold" style={{ color: '#4a2728' }}>จำนวน</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity disabled:opacity-40"
                style={{ background: '#4a2728', color: '#f2dada' }}
                disabled={quantity <= 1}
              >
                <Minus size={16} />
              </button>
              <span className="text-2xl font-black w-8 text-center" style={{ color: '#4a2728' }}>
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(q => q + 1)}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: '#4a2728', color: '#f2dada' }}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t flex justify-between items-center" style={{ borderColor: '#e8c4c4' }}>
            <span className="font-semibold" style={{ color: '#4a2728' }}>รวม</span>
            <span className="text-2xl font-black" style={{ color: '#4a2728' }}>
              {total.toLocaleString()} บาท
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Customer Info */}
          <div className="rounded-2xl p-5 border-2 space-y-4" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <h3 className="font-bold text-lg" style={{ color: '#4a2728' }}>ข้อมูลผู้สั่ง</h3>
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>ชื่อ *</label>
              <input
                type="text"
                value={form.customer_name}
                onChange={e => set('customer_name', e.target.value)}
                placeholder="ชื่อ-นามสกุล"
                className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium"
                style={{ borderColor: '#e8c4c4', color: '#4a2728' }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>เบอร์โทร *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="08X-XXX-XXXX"
                className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium"
                style={{ borderColor: '#e8c4c4', color: '#4a2728' }}
              />
            </div>
          </div>

          {/* Delivery */}
          <div className="rounded-2xl p-5 border-2 space-y-4" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <h3 className="font-bold text-lg" style={{ color: '#4a2728' }}>วิธีรับสินค้า</h3>

            <div className="grid grid-cols-2 gap-3">
              {(['pickup', 'grab'] as DeliveryType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDeliveryType(type)}
                  className="rounded-xl p-3 border-2 text-center transition-all"
                  style={{
                    borderColor: deliveryType === type ? '#4a2728' : '#e8c4c4',
                    background: deliveryType === type ? '#4a2728' : 'white',
                    color: deliveryType === type ? '#f2dada' : '#4a2728',
                  }}
                >
                  {type === 'pickup' ? <MapPin size={20} className="mx-auto mb-1" /> : <Truck size={20} className="mx-auto mb-1" />}
                  <div className="text-sm font-bold">{type === 'pickup' ? 'นัดรับ' : 'Grab (กทม.)'}</div>
                </button>
              ))}
            </div>

            {deliveryType === 'pickup' && (
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#7a4a4b' }}>เลือกจุดรับ *</label>
                <div className="space-y-2">
                  {(Object.entries(PICKUP_LOCATIONS) as [PickupLocation, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPickupLocation(key)}
                      className="w-full rounded-xl px-4 py-3 border-2 text-left text-sm font-medium transition-all"
                      style={{
                        borderColor: pickupLocation === key ? '#4a2728' : '#e8c4c4',
                        background: pickupLocation === key ? '#f2dada' : 'white',
                        color: '#4a2728',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {deliveryType === 'grab' && (
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>
                  ที่อยู่จัดส่ง * <span className="font-normal">(เฉพาะ กทม.)</span>
                </label>
                <textarea
                  value={form.delivery_address}
                  onChange={e => set('delivery_address', e.target.value)}
                  placeholder="บ้านเลขที่ ถนน แขวง เขต กรุงเทพฯ"
                  rows={3}
                  className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium resize-none"
                  style={{ borderColor: '#e8c4c4', color: '#4a2728' }}
                />
                <p className="text-xs mt-1" style={{ color: '#7a4a4b' }}>
                  ค่าส่ง Grab เก็บปลายทาง (ลูกค้าจ่ายให้คนขับโดยตรง)
                </p>
              </div>
            )}
          </div>

          {/* Date */}
          <div className="rounded-2xl p-5 border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <h3 className="font-bold text-lg mb-3" style={{ color: '#4a2728' }}>วันที่รับสินค้า</h3>
            <input
              type="date"
              value={form.pickup_date}
              onChange={e => set('pickup_date', e.target.value)}
              min={getMinDate()}
              className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium"
              style={{ borderColor: '#e8c4c4', color: '#4a2728' }}
            />
            <p className="text-xs mt-2" style={{ color: '#7a4a4b' }}>สั่งล่วงหน้าอย่างน้อย 2 วัน</p>
          </div>

          {/* Note */}
          <div className="rounded-2xl p-5 border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <h3 className="font-bold text-lg mb-3" style={{ color: '#4a2728' }}>หมายเหตุ (ถ้ามี)</h3>
            <textarea
              value={form.note}
              onChange={e => set('note', e.target.value)}
              placeholder="แจ้งเพิ่มเติมได้เลย..."
              rows={2}
              className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium resize-none"
              style={{ borderColor: '#e8c4c4', color: '#4a2728' }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl py-4 font-black text-lg flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
            style={{ background: '#4a2728', color: '#f2dada' }}
          >
            <ShoppingBag size={22} />
            {loading ? 'กำลังส่งออเดอร์...' : `สั่งเลย — ${total.toLocaleString()} บาท`}
          </button>

          <p className="text-center text-xs pb-6" style={{ color: '#7a4a4b' }}>
            หลังสั่งแล้วจะต้องโอนเงิน + แนบสลิปเพื่อยืนยันออเดอร์
          </p>
        </form>
      </div>
    </main>
  )
}
