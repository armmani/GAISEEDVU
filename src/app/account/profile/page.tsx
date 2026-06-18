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
  const [email, setEmail] = useState('')
  const [form, setForm] = useState({ display_name: '', phone: '', default_address: '' })
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' })
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email ?? '')
    })
    fetch('/api/account/profile')
      .then(r => r.json())
      .then(p => {
        if (p) setForm({
          display_name: p.display_name || '',
          phone: p.phone || '',
          default_address: p.default_address || '',
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

        {/* Email */}
        <div className="rounded-2xl p-4 mb-4 border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
          <p className="text-xs font-semibold mb-0.5" style={{ color: '#7a4a4b' }}>อีเมล</p>
          <p className="font-bold text-sm" style={{ color: '#4a2728' }}>{email || '—'}</p>
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
