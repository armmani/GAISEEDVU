'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) { router.push('/login'); return }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) { toast.error('ลิงก์หมดอายุ กรุณาขอใหม่'); router.push('/login') }
      else setReady(true)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) return toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
    if (password !== confirm) return toast.error('รหัสผ่านไม่ตรงกัน')
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('เปลี่ยนรหัสผ่านสำเร็จ!')
      router.push('/')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  if (!ready) return (
    <div className="text-center py-16 text-2xl animate-bounce">🐔</div>
  )

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-5 border-2 space-y-4" style={{ background: 'white', borderColor: '#e8c4c4' }}>
      <h2 className="font-black text-lg" style={{ color: '#4a2728' }}>ตั้งรหัสผ่านใหม่</h2>
      <div>
        <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>รหัสผ่านใหม่</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="อย่างน้อย 6 ตัวอักษร"
          className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium"
          style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>ยืนยันรหัสผ่าน</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="พิมพ์รหัสผ่านอีกครั้ง"
          className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium"
          style={{ borderColor: '#e8c4c4', color: '#4a2728' }} />
      </div>
      <button type="submit" disabled={loading || !password || !confirm}
        className="w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50"
        style={{ background: '#4a2728', color: '#f2dada' }}>
        {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f2dada' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="GAI SEED VU" className="w-32 mx-auto" />
        </div>
        <Suspense fallback={<div className="text-center py-16 text-2xl animate-bounce">🐔</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  )
}
