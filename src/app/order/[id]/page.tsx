'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'
import { CheckCircle, Upload, Clock, MapPin, Truck } from 'lucide-react'
import { PICKUP_LOCATIONS, ORDER_STATUS_LABEL, type Order } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import ChickenLoader from '@/components/ChickenLoader'

const PROMPTPAY_ID = process.env.NEXT_PUBLIC_PROMPTPAY_ID ?? ''

function generatePromptPayPayload(promptpayId: string, amount: number): string {
  const sanitized = promptpayId.replace(/[-\s]/g, '')
  const amountStr = amount.toFixed(2)

  function field(tag: string, value: string) {
    return `${tag}${value.length.toString().padStart(2, '0')}${value}`
  }

  function crc16(data: string): string {
    let crc = 0xFFFF
    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i) << 8
      for (let j = 0; j < 8; j++) {
        crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1
      }
    }
    return ((crc & 0xFFFF) >>> 0).toString(16).toUpperCase().padStart(4, '0')
  }

  // National ID = 13 digits → sub-tag 02
  // Phone number = 10 digits (08X) → convert to 66XXXXXXXXX → sub-tag 01
  let proxyField: string
  if (sanitized.length === 13) {
    proxyField = field('02', sanitized)
  } else {
    const phone = sanitized.startsWith('0') ? '66' + sanitized.slice(1) : sanitized
    proxyField = field('01', phone)
  }

  const payload =
    field('00', '01') +
    field('01', '12') +
    field('29', field('00', 'A000000677010111') + proxyField) +
    field('53', '764') +
    field('54', amountStr) +
    field('58', 'TH') +
    '6304'

  return payload + crc16(payload)
}

export default function OrderConfirmPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [qrUrl, setQrUrl] = useState('')
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [slipUploaded, setSlipUploaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/account/orders/${id}`)
      if (!res.ok) return
      const data = await res.json()
      if (data) {
        setOrder(data)
        setSlipUploaded(!!data.payment_slip_url)
        if (!data.payment_slip_url) {
          const payload = generatePromptPayPayload(PROMPTPAY_ID, data.total_amount)
          const url = await QRCode.toDataURL(payload, { width: 280, margin: 2 })
          setQrUrl(url)
        }
      }
    }
    load()
  }, [id])

  async function handleUpload() {
    if (!slipFile) return toast.error('กรุณาเลือกไฟล์สลิป')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('slip', slipFile)
      const res = await fetch(`/api/orders/${id}/slip`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSlipUploaded(true)
      toast.success('แนบสลิปสำเร็จ! รอ admin ยืนยันนะคะ 🐔')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'อัพโหลดไม่สำเร็จ')
    } finally {
      setUploading(false)
    }
  }

  if (!order) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#f2dada' }}>
        <ChickenLoader />
      </main>
    )
  }

  const isPickup = order.delivery_type === 'pickup'
  const statusLabel = ORDER_STATUS_LABEL[order.status]

  return (
    <main className="min-h-screen py-8 pb-28 px-4" style={{ background: '#f2dada' }}>
      <div className="max-w-md mx-auto space-y-4">

        {/* Header */}
        <div className="text-center mb-6">
          <img src="/logo.png" alt="GAI SEED VU" className="w-52 mx-auto"  />
        </div>

        {/* Order Summary */}
        <div className="rounded-2xl p-5 border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={20} style={{ color: '#4a2728' }} />
            <h2 className="font-bold text-lg" style={{ color: '#4a2728' }}>ออเดอร์ของคุณ</h2>
          </div>

          <div className="space-y-2 text-sm" style={{ color: '#4a2728' }}>
            <div className="flex justify-between">
              <span className="font-medium" style={{ color: '#7a4a4b' }}>ชื่อ</span>
              <span className="font-bold">{order.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium" style={{ color: '#7a4a4b' }}>เบอร์</span>
              <span className="font-bold">{order.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium" style={{ color: '#7a4a4b' }}>สินค้า</span>
              <span className="font-bold">Original × {order.quantity} ชิ้น</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium" style={{ color: '#7a4a4b' }}>วันรับ</span>
              <span className="font-bold">{new Date(order.pickup_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="font-medium shrink-0" style={{ color: '#7a4a4b' }}>
                {isPickup ? <MapPin size={14} className="inline mr-1" /> : <Truck size={14} className="inline mr-1" />}
                {isPickup ? 'จุดรับ' : 'ที่อยู่'}
              </span>
              <span className="font-bold text-right ml-4">
                {isPickup
                  ? PICKUP_LOCATIONS[order.pickup_location!]
                  : order.delivery_address}
              </span>
            </div>
            {order.note && (
              <div className="flex justify-between">
                <span className="font-medium" style={{ color: '#7a4a4b' }}>หมายเหตุ</span>
                <span className="font-bold text-right">{order.note}</span>
              </div>
            )}
            <div className="pt-2 border-t flex justify-between items-center" style={{ borderColor: '#e8c4c4' }}>
              <span className="font-bold text-base" style={{ color: '#7a4a4b' }}>ยอดรวม</span>
              <span className="text-2xl font-black" style={{ color: '#4a2728' }}>{order.total_amount.toLocaleString()} บาท</span>
            </div>
          </div>

          {/* Status */}
          <div className="mt-4 rounded-xl px-4 py-2 flex items-center gap-2" style={{ background: '#f2dada' }}>
            <Clock size={16} style={{ color: '#4a2728' }} />
            <span className="text-sm font-bold" style={{ color: '#4a2728' }}>สถานะ: {statusLabel}</span>
          </div>
        </div>

        {/* Payment */}
        {!slipUploaded ? (
          <div className="rounded-2xl p-5 border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <h3 className="font-bold text-lg mb-1" style={{ color: '#4a2728' }}>ชำระเงิน</h3>
            <p className="text-sm mb-4" style={{ color: '#7a4a4b' }}>สแกน QR ด้วย app ธนาคารหรือ Wallet</p>

            {qrUrl && (
              <div className="flex flex-col items-center mb-4">
                <img src={qrUrl} alt="PromptPay QR" className="rounded-xl" width={220} height={220} />
                <p className="text-xs mt-2 font-semibold" style={{ color: '#7a4a4b' }}>
                  PromptPay — {order.total_amount.toLocaleString()} บาท
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#7a4a4b' }}>แนบสลิปโอนเงิน *</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => setSlipFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed py-4 text-sm font-semibold flex items-center justify-center gap-2 mb-3 transition-colors"
                style={{
                  borderColor: slipFile ? '#4a2728' : '#e8c4c4',
                  background: slipFile ? '#f2dada' : 'white',
                  color: '#4a2728',
                }}
              >
                <Upload size={18} />
                {slipFile ? slipFile.name : 'เลือกรูปสลิป'}
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!slipFile || uploading}
                className="w-full rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                style={{ background: '#4a2728', color: '#f2dada' }}
              >
                {uploading ? 'กำลังส่ง...' : 'ส่งสลิป'}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-5 border-2 text-center" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <div className="text-4xl mb-2">✅</div>
            <h3 className="font-bold text-lg" style={{ color: '#4a2728' }}>แนบสลิปเรียบร้อยแล้ว!</h3>
            <p className="text-sm mt-1" style={{ color: '#7a4a4b' }}>
              รอ admin ยืนยันออเดอร์นะคะ 🐔
            </p>
          </div>
        )}

        {/* Grab Note */}
        {!isPickup && (
          <div className="rounded-2xl p-4 border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <p className="text-sm font-semibold" style={{ color: '#4a2728' }}>
              🛵 หลัง admin ยืนยันแล้ว เราจะเรียก Grab และแจ้งให้ทราบนะคะ
            </p>
          </div>
        )}

      </div>
      <BottomNav />
    </main>
  )
}
