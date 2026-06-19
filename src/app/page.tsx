'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ShoppingBag, MapPin, Truck, Minus, Plus } from 'lucide-react'
import { PICKUP_LOCATIONS, SALT_LEVEL_LABEL, PRICE_PER_PIECE, type DeliveryType, type PickupLocation, type SaltLevel } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import dynamic from 'next/dynamic'

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false })

function getMinDate() {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().split('T')[0]
}

export default function OrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [pricePerPiece, setPricePerPiece] = useState(PRICE_PER_PIECE)
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('pickup')
  const [pickupLocation, setPickupLocation] = useState<PickupLocation>('donmueang')
  const [saltLevel, setSaltLevel] = useState<SaltLevel>('normal')
  const [noPepper, setNoPepper] = useState(false)
  const [sesameOil, setSesameOil] = useState(false)
  const [mapCoords, setMapCoords] = useState({ lat: 13.7563, lng: 100.5018 })
  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    delivery_address: '',
    pickup_date: '',
    note: '',
  })

  const total = quantity * pricePerPiece

  useEffect(() => {
    fetch('/api/account/pricing')
      .then(r => r.json())
      .then(d => { if (d.price_per_piece) setPricePerPiece(d.price_per_piece) })
      .catch(() => {})
    fetch('/api/account/profile')
      .then(r => r.json())
      .then(profile => {
        if (profile) {
          setForm(prev => ({
            ...prev,
            customer_name: profile.display_name || '',
            phone: profile.phone || '',
            delivery_address: profile.default_address || '',
          }))
        }
      })
      .catch(() => {})
  }, [])

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
          salt_level: saltLevel,
          no_pepper: noPepper,
          sesame_oil: sesameOil,
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

        {/* Product Card */}
        <div className="rounded-2xl p-5 mb-4 border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold" style={{ color: '#4a2728' }}>Original เกลือพริกไท</h2>
              <p className="text-sm mt-1" style={{ color: '#7a4a4b' }}>ไก่ซูวีด 200–300 กรัม/ชิ้น</p>
              {pricePerPiece !== PRICE_PER_PIECE ? (
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-sm line-through" style={{ color: '#b09090' }}>ชิ้นละ {PRICE_PER_PIECE} บาท</p>
                  <p className="text-2xl font-black" style={{ color: '#c0392b' }}>ชิ้นละ {pricePerPiece} บาท</p>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#ffd6d6', color: '#c0392b' }}>ราคาพิเศษ</span>
                </div>
              ) : (
                <p className="text-2xl font-black mt-2" style={{ color: '#4a2728' }}>ชิ้นละ {PRICE_PER_PIECE} บาท</p>
              )}
            </div>
            <div className="rounded-xl px-3 py-1 text-xs font-bold shrink-0" style={{ background: '#f2dada', color: '#4a2728' }}>
              Pre-order
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <span className="font-semibold" style={{ color: '#4a2728' }}>จำนวน</span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40"
                style={{ background: '#4a2728', color: '#f2dada' }} disabled={quantity <= 1}>
                <Minus size={16} />
              </button>
              <span className="text-2xl font-black w-8 text-center" style={{ color: '#4a2728' }}>{quantity}</span>
              <button type="button" onClick={() => setQuantity(q => q + 1)}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: '#4a2728', color: '#f2dada' }}>
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t flex justify-between items-center" style={{ borderColor: '#e8c4c4' }}>
            <span className="font-semibold" style={{ color: '#4a2728' }}>รวม</span>
            <span className="text-2xl font-black" style={{ color: '#4a2728' }}>{total.toLocaleString()} บาท</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl p-5 border-2 space-y-4" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <h3 className="font-bold text-lg" style={{ color: '#4a2728' }}>ข้อมูลผู้สั่ง</h3>
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>ชื่อ *</label>
              <input type="text" value={form.customer_name} onChange={e => set('customer_name', e.target.value)}
                placeholder="ชื่อ-นามสกุล"
                className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium"
                style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>เบอร์โทร *</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="08X-XXX-XXXX"
                className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium"
                style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
            </div>
          </div>

          <div className="rounded-2xl p-5 border-2 space-y-4" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <h3 className="font-bold text-lg" style={{ color: '#4a2728' }}>วิธีรับสินค้า</h3>
            <div className="grid grid-cols-2 gap-3">
              {(['pickup', 'grab'] as DeliveryType[]).map(type => (
                <button key={type} type="button" onClick={() => setDeliveryType(type)}
                  className="rounded-xl p-3 border-2 text-center transition-all"
                  style={{
                    borderColor: deliveryType === type ? '#4a2728' : '#e8c4c4',
                    background: deliveryType === type ? '#4a2728' : 'white',
                    color: deliveryType === type ? '#f2dada' : '#4a2728',
                  }}>
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
                    style={{
                      borderColor: pickupLocation === key ? '#4a2728' : '#e8c4c4',
                      background: pickupLocation === key ? '#f2dada' : 'white',
                      color: '#4a2728',
                    }}>
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
                  <MapPicker
                    lat={mapCoords.lat}
                    lng={mapCoords.lng}
                    onMove={(lat, lng, address) => {
                      setMapCoords({ lat, lng })
                      set('delivery_address', address)
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>
                    ที่อยู่ (แก้ไขได้)
                  </label>
                  <textarea value={form.delivery_address} onChange={e => set('delivery_address', e.target.value)}
                    placeholder="ที่อยู่จะขึ้นอัตโนมัติหลังปักหมุด หรือพิมพ์เองได้เลย"
                    rows={2}
                    className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium resize-none"
                    style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
                </div>
                <p className="text-xs" style={{ color: '#7a4a4b' }}>ค่าส่ง Grab เก็บปลายทาง</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl p-5 border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <h3 className="font-bold text-lg mb-3" style={{ color: '#4a2728' }}>วันที่รับสินค้า</h3>
            <input type="date" value={form.pickup_date} onChange={e => set('pickup_date', e.target.value)}
              min={getMinDate()}
              className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium"
              style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
            <p className="text-xs mt-2" style={{ color: '#7a4a4b' }}>สั่งล่วงหน้าอย่างน้อย 2 วัน</p>
          </div>

          <div className="rounded-2xl p-5 border-2 space-y-4" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <h3 className="font-bold text-lg" style={{ color: '#4a2728' }}>ปรุงตามใจ</h3>
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: '#7a4a4b' }}>ความเค็ม</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(SALT_LEVEL_LABEL) as [SaltLevel, string][]).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setSaltLevel(key)}
                    className="rounded-xl py-2.5 text-sm font-bold border-2 transition-all"
                    style={{
                      borderColor: saltLevel === key ? '#4a2728' : '#e8c4c4',
                      background: saltLevel === key ? '#4a2728' : 'white',
                      color: saltLevel === key ? '#f2dada' : '#4a2728',
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold" style={{ color: '#7a4a4b' }}>ตัวเลือกเพิ่มเติม</p>
              {[
                { value: noPepper, set: setNoPepper, label: 'ไม่ใส่พริกไท' },
                { value: sesameOil, set: setSesameOil, label: 'ใส่น้ำมันงา' },
              ].map(({ value, set: setter, label }) => (
                <button key={label} type="button" onClick={() => setter(!value)}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-3 border-2 text-left transition-all"
                  style={{
                    borderColor: value ? '#4a2728' : '#e8c4c4',
                    background: value ? '#f2dada' : 'white',
                  }}>
                  <div className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0"
                    style={{ borderColor: '#4a2728', background: value ? '#4a2728' : 'white' }}>
                    {value && <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#f2dada" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>}
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#4a2728' }}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5 border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <h3 className="font-bold text-lg mb-3" style={{ color: '#4a2728' }}>หมายเหตุ (ถ้ามี)</h3>
            <textarea value={form.note} onChange={e => set('note', e.target.value)}
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
