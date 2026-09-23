'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

// First stop after a Google sign-up: Google gives us a name but no phone, and
// skips the register form where the discount code is entered.
export default function WelcomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({ display_name: '', phone: '', default_address: '', telegram_chat_id: '' })
  const [code, setCode] = useState('')

  useEffect(() => {
    fetch('/api/account/profile').then(r => r.json()).then(p => {
      if (p) setProfile({
        display_name: p.display_name || '',
        phone: p.phone || '',
        default_address: p.default_address || '',
        telegram_chat_id: p.telegram_chat_id || '',
      })
    }).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile.display_name.trim()) return toast.error('กรุณากรอกชื่อ')
    if (!profile.phone.trim()) return toast.error('กรุณากรอกเบอร์โทร')
    setLoading(true)
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, display_name: profile.display_name.trim(), phone: profile.phone.trim() }),
      })
      if (!res.ok) throw new Error('บันทึกไม่สำเร็จ')

      if (code.trim()) {
        const r = await fetch('/api/account/redeem-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        const d = await r.json()
        if (!r.ok) {
          toast.error(d.error || 'โค้ดไม่ถูกต้อง')
          return
        }
        toast.success(d.result === 'already_special' ? 'คุณมีราคาพิเศษอยู่แล้ว' : 'ใช้โค้ดสำเร็จ ได้ราคาพิเศษแล้ว 🎉')
      }

      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full rounded-xl px-4 py-3 border-2 text-sm font-medium"
  const inputStyle = { borderColor: '#e8c4c4', color: '#4a2728' }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: '#f2dada' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="GAI SEED VU" className="w-36 mx-auto" />
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl p-5 border-2 space-y-3" style={{ background: 'white', borderColor: '#e8c4c4' }}>
          <div>
            <h1 className="font-black text-lg" style={{ color: '#4a2728' }}>ยินดีต้อนรับ! 🐔</h1>
            <p className="text-sm" style={{ color: '#7a4a4b' }}>กรอกข้อมูลอีกนิดก่อนเริ่มสั่ง</p>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>ชื่อ *</label>
            <input type="text" value={profile.display_name}
              onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))}
              placeholder="ชื่อ-นามสกุล" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>เบอร์โทร *</label>
            <input type="tel" value={profile.phone}
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
              placeholder="08X-XXX-XXXX" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>โค้ดส่วนลด (ถ้ามี)</label>
            <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="ใส่โค้ดเพื่อรับราคาพิเศษ" autoCapitalize="characters" className={inputClass} style={inputStyle} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50"
            style={{ background: '#4a2728', color: '#f2dada' }}>
            {loading ? 'กำลังบันทึก...' : 'เริ่มสั่งเลย'}
          </button>
        </form>
      </div>
    </main>
  )
}
