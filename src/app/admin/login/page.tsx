'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) throw new Error('รหัสผ่านไม่ถูกต้อง')
      router.push('/admin/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f2dada' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🐔</div>
          <h1 className="text-2xl font-black" style={{ color: '#4a2728' }}>Admin Login</h1>
          <p className="text-sm mt-1" style={{ color: '#7a4a4b' }}>GAI SEED VU</p>
        </div>

        <form onSubmit={handleLogin} className="rounded-2xl p-6 border-2 space-y-4" style={{ background: 'white', borderColor: '#e8c4c4' }}>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: '#7a4a4b' }}>รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3 border-2 text-sm font-medium"
              style={{ borderColor: '#e8c4c4', color: '#4a2728' }}
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50"
            style={{ background: '#4a2728', color: '#f2dada' }}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </main>
  )
}
