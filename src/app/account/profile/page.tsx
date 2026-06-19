'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [hasGoogle, setHasGoogle] = useState(false)
  const [form, setForm] = useState({ display_name: '', phone: '', default_address: '', telegram_chat_id: '' })
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' })
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? '')
        setHasGoogle(data.user.identities?.some(i => i.provider === 'google') ?? false)
      }
    })
    fetch('/api/account/profile')
      .then(r => r.json())
      .then(p => {
        if (p) setForm({
          display_name: p.display_name || '',
          phone: p.phone || '',
          default_address: p.default_address || '',
          telegram_chat_id: p.telegram_chat_id || '',
        })
      })
  }, [])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('บันทึกไม่สำเร็จ')
      toast.success('บันทึกแล้ว!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwForm.newPassword.length < 6) return toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('รหัสผ่านไม่ตรงกัน')
    setPwLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword })
      if (error) throw error
      toast.success('เปลี่ยนรหัสผ่านสำเร็จ!')
      setPwForm({ newPassword: '', confirmPassword: '' })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setPwLoading(false)
    }
  }

  async function handleLinkGoogle() {
    setGoogleLoading(true)
    await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    setGoogleLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const inputClass = "w-full rounded-xl px-4 py-3 border-2 text-sm font-medium"
  const inputStyle = { borderColor: '#e8c4c4', color: '#4a2728' }

  return (
    <main className="min-h-screen pb-24 pt-6 px-4" style={{ background: '#f2dada' }}>
      <div className="max-w-md mx-auto">

        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-black" style={{ color: '#4a2728' }}>โปรไฟล์</h1>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl"
            style={{ background: 'white', color: '#7a4a4b' }}>
            <LogOut size={16} />
            ออกจากระบบ
          </button>
        </div>

        {/* Email + Google */}
        <div className="rounded-2xl p-4 mb-4 border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
          <p className="text-xs font-semibold mb-0.5" style={{ color: '#7a4a4b' }}>อีเมล</p>
          <p className="font-bold text-sm mb-3" style={{ color: '#4a2728' }}>{email || '—'}</p>

          <div className="border-t pt-3" style={{ borderColor: '#e8c4c4' }}>
            {hasGoogle ? (
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span className="text-sm font-semibold" style={{ color: '#1a7a3c' }}>เชื่อมกับ Google แล้ว ✓</span>
              </div>
            ) : (
              <button onClick={handleLinkGoogle} disabled={googleLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 border-2 text-sm font-semibold disabled:opacity-50"
                style={{ borderColor: '#e8c4c4', background: 'white', color: '#4a2728' }}>
                <svg width="16" height="16" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                {googleLoading ? 'กำลังเชื่อมต่อ...' : 'เชื่อมกับ Google'}
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} className="rounded-2xl p-5 border-2 space-y-4" style={{ background: 'white', borderColor: '#e8c4c4' }}>
          <h3 className="font-bold text-lg" style={{ color: '#4a2728' }}>ข้อมูลส่วนตัว</h3>

          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>ชื่อ</label>
            <input type="text" value={form.display_name} onChange={e => set('display_name', e.target.value)}
              placeholder="ชื่อ-นามสกุล" className={inputClass} style={inputStyle} />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>เบอร์โทร</label>
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="08X-XXX-XXXX" className={inputClass} style={inputStyle} />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>ที่อยู่สำหรับ Grab (ถ้ามี)</label>
            <textarea value={form.default_address} onChange={e => set('default_address', e.target.value)}
              placeholder="บ้านเลขที่ ถนน แขวง เขต กรุงเทพฯ" rows={3}
              className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium resize-none"
              style={inputStyle} />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>
              Telegram Chat ID <span className="font-normal">(รับแจ้งเตือนสถานะออเดอร์)</span>
            </label>
            <input type="text" value={form.telegram_chat_id} onChange={e => set('telegram_chat_id', e.target.value)}
              placeholder="เช่น 123456789"
              className={inputClass} style={inputStyle} />

            <div className="mt-2 rounded-xl p-3 text-xs space-y-1.5" style={{ background: '#fff8f0', border: '1px solid #e8c4c4' }}>
              <p className="font-bold" style={{ color: '#4a2728' }}>วิธีหา Chat ID (ใช้แค่ครั้งเดียว)</p>
              <p style={{ color: '#7a4a4b' }}>1. เปิดแอป Telegram บนมือถือ</p>
              <p style={{ color: '#7a4a4b' }}>2. กดค้นหา แล้วพิมพ์ <span className="font-bold text-black">@userinfobot</span></p>
              <p style={{ color: '#7a4a4b' }}>3. กดเข้าไปในแชท แล้วกด <span className="font-bold text-black">START</span> หรือ <span className="font-bold text-black">เริ่ม</span></p>
              <p style={{ color: '#7a4a4b' }}>4. Bot จะตอบข้อมูลของคุณมาเลย มีบรรทัด <span className="font-bold text-black">Id: ตัวเลข</span></p>
              <p style={{ color: '#7a4a4b' }}>5. เอาตัวเลขนั้นมากรอกในช่องด้านบน แล้วกดบันทึก</p>
              <p className="pt-0.5" style={{ color: '#4a2728' }}>⚡ หลังบันทึกแล้วจะได้รับแจ้งเตือนใน Telegram ทุกครั้งที่สถานะออเดอร์เปลี่ยน</p>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50"
            style={{ background: '#4a2728', color: '#f2dada' }}>
            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </form>

        {/* Change Password */}
        <form onSubmit={handleChangePassword} className="rounded-2xl p-5 border-2 space-y-4 mt-4"
          style={{ background: 'white', borderColor: '#e8c4c4' }}>
          <h3 className="font-bold text-lg" style={{ color: '#4a2728' }}>เปลี่ยนรหัสผ่าน</h3>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>รหัสผ่านใหม่</label>
            <input type="password" value={pwForm.newPassword}
              onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium"
              style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>ยืนยันรหัสผ่าน</label>
            <input type="password" value={pwForm.confirmPassword}
              onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
              placeholder="พิมพ์รหัสผ่านอีกครั้ง"
              className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium"
              style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
          </div>
          <button type="submit"
            disabled={pwLoading || !pwForm.newPassword || !pwForm.confirmPassword}
            className="w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50"
            style={{ background: '#4a2728', color: '#f2dada' }}>
            {pwLoading ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
          </button>
        </form>
      </div>
      <BottomNav />
    </main>
  )
}
