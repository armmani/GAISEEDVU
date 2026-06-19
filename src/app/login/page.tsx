'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

type Tab = 'login' | 'register' | 'forgot'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('login')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', display_name: '', phone: '' })
  const supabase = createClient()

  async function handleGoogle() {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      if (error) throw error
      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!form.display_name.trim()) return toast.error('กรุณากรอกชื่อ')
    if (!form.phone.trim()) return toast.error('กรุณากรอกเบอร์โทร')
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })
      if (error) throw error
      if (data.user) {
        await fetch('/api/account/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: data.user.id,
            display_name: form.display_name.trim(),
            phone: form.phone.trim(),
          }),
        })
        await supabase.auth.signOut()
      }
      toast.success('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ')
      setForm(prev => ({ ...prev, display_name: '', phone: '' }))
      setTab('login')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'สมัครสมาชิกไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email.trim()) return toast.error('กรุณากรอกอีเมล')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
        redirectTo: 'https://gaiseedvu.vercel.app/reset-password',
      })
      if (error) throw error
      toast.success('ส่งลิงก์ไปที่อีเมลแล้ว! กรุณาตรวจสอบ inbox')
      setTab('login')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full rounded-xl px-4 py-3 border-2 text-sm font-medium"
  const inputStyle = { borderColor: '#e8c4c4', color: '#4a2728' }

  function GoogleButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
    return (
      <button type="button" onClick={onClick} disabled={loading}
        className="w-full flex items-center justify-center gap-3 rounded-xl py-3 border-2 font-semibold text-sm disabled:opacity-50 transition-opacity"
        style={{ borderColor: '#e8c4c4', background: 'white', color: '#4a2728' }}>
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        {loading ? 'กำลังเชื่อมต่อ...' : 'เข้าสู่ระบบด้วย Google'}
      </button>
    )
  }

  function Divider() {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: '#e8c4c4' }} />
        <span className="text-xs font-semibold" style={{ color: '#b09090' }}>หรือ</span>
        <div className="flex-1 h-px" style={{ background: '#e8c4c4' }} />
      </div>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f2dada' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="GAI SEED VU" className="w-36 mx-auto" />
        </div>

        {/* Tabs */}
        {tab !== 'forgot' && (
          <div className="flex rounded-2xl p-1 mb-4" style={{ background: '#e8c4c4' }}>
            {(['login', 'register'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: tab === t ? '#4a2728' : 'transparent',
                  color: tab === t ? '#f2dada' : '#7a4a4b',
                }}>
                {t === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
              </button>
            ))}
          </div>
        )}

        {/* Login */}
        {tab === 'login' && (
          <div className="rounded-2xl p-5 border-2 space-y-3" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <GoogleButton loading={googleLoading} onClick={handleGoogle} />
            <Divider />
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>อีเมล *</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="email@example.com" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>รหัสผ่าน *</label>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร" className={inputClass} style={inputStyle} />
              </div>
              <button type="submit" disabled={loading || !form.email || !form.password}
                className="w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50"
                style={{ background: '#4a2728', color: '#f2dada' }}>
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วยอีเมล'}
              </button>
              <button type="button" onClick={() => setTab('forgot')}
                className="w-full text-center text-xs font-semibold pt-1"
                style={{ color: '#7a4a4b' }}>
                ลืมรหัสผ่าน?
              </button>
            </form>
          </div>
        )}

        {/* Register */}
        {tab === 'register' && (
          <div className="rounded-2xl p-5 border-2 space-y-3" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <GoogleButton loading={googleLoading} onClick={handleGoogle} />
            <Divider />
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>ชื่อ *</label>
              <input type="text" value={form.display_name} onChange={e => set('display_name', e.target.value)}
                placeholder="ชื่อ-นามสกุล" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>เบอร์โทร *</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="08X-XXX-XXXX" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>อีเมล *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="email@example.com" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>รหัสผ่าน *</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร" className={inputClass} style={inputStyle} />
            </div>
            <button type="submit" disabled={loading || !form.email || !form.password}
              className="w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50"
              style={{ background: '#4a2728', color: '#f2dada' }}>
              {loading ? 'กำลังสมัคร...' : 'สมัครด้วยอีเมล'}
            </button>
          </form>
          </div>
        )}

        {/* Forgot Password */}
        {tab === 'forgot' && (
          <form onSubmit={handleForgot} className="rounded-2xl p-5 border-2 space-y-3"
            style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <h2 className="font-black text-lg" style={{ color: '#4a2728' }}>ลืมรหัสผ่าน</h2>
            <p className="text-sm" style={{ color: '#7a4a4b' }}>
              กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้
            </p>
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>อีเมล *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="email@example.com" className={inputClass} style={inputStyle} />
            </div>
            <button type="submit" disabled={loading || !form.email}
              className="w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50"
              style={{ background: '#4a2728', color: '#f2dada' }}>
              {loading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
            </button>
            <button type="button" onClick={() => setTab('login')}
              className="w-full text-center text-xs font-semibold pt-1"
              style={{ color: '#7a4a4b' }}>
              ← กลับหน้าเข้าสู่ระบบ
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
