'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Bell, BellOff, Send } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

type State = 'loading' | 'unsupported' | 'needs-install' | 'blocked' | 'off' | 'on'

export default function PushToggle({ description }: { description: string }) {
  const [state, setState] = useState<State>('loading')
  const [busy, setBusy] = useState(false)

  const sync = useCallback(async () => {
    const supported =
      'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    if (!supported) {
      // iOS only exposes the push API once the app is on the home screen.
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      setState(isIOS ? 'needs-install' : 'unsupported')
      return
    }
    if (Notification.permission === 'denied') return setState('blocked')
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    setState(sub ? 'on' : 'off')
  }, [])

  useEffect(() => {
    sync().catch(() => setState('unsupported'))
  }, [sync])

  async function enable() {
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'blocked' : 'off')
        return
      }

      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!key) throw new Error('ระบบแจ้งเตือนยังไม่ได้ตั้งค่า')

      const reg = await navigator.serviceWorker.ready
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        }))

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'บันทึกไม่สำเร็จ')

      setState('on')
      toast.success('เปิดแจ้งเตือนแล้ว 🔔')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เปิดแจ้งเตือนไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setState('off')
      toast.success('ปิดแจ้งเตือนแล้ว')
    } catch {
      toast.error('ปิดแจ้งเตือนไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  async function sendTest() {
    setBusy(true)
    try {
      const res = await fetch('/api/push/test', { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'ส่งไม่สำเร็จ')
      toast.success('ส่งแจ้งเตือนทดสอบแล้ว')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'ส่งไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  const card = 'rounded-2xl p-5 border-2 space-y-3'
  const cardStyle = { background: 'white', borderColor: '#e8c4c4' }

  return (
    <div className={card} style={cardStyle}>
      <div className="flex items-center gap-2">
        {state === 'on'
          ? <Bell size={18} style={{ color: '#4a2728' }} />
          : <BellOff size={18} style={{ color: '#b89a9b' }} />}
        <h3 className="font-bold text-lg" style={{ color: '#4a2728' }}>แจ้งเตือนในมือถือ</h3>
      </div>

      <p className="text-sm" style={{ color: '#7a4a4b' }}>{description}</p>

      {state === 'loading' && (
        <p className="text-sm" style={{ color: '#b89a9b' }}>กำลังตรวจสอบ...</p>
      )}

      {state === 'needs-install' && (
        <div className="rounded-xl p-3 text-xs space-y-1" style={{ background: '#fff8f0', border: '1px solid #e8c4c4' }}>
          <p className="font-bold" style={{ color: '#4a2728' }}>iPhone / iPad ต้องติดตั้งแอพก่อน</p>
          <p style={{ color: '#7a4a4b' }}>
            กดปุ่มแชร์ <b>⎋</b> ใน Safari → <b>เพิ่มไปยังหน้าจอโฮม</b> แล้วเปิดแอพจากหน้าจอโฮม
            จึงจะเปิดแจ้งเตือนได้ค่ะ
          </p>
        </div>
      )}

      {state === 'unsupported' && (
        <p className="text-sm" style={{ color: '#b89a9b' }}>
          เบราว์เซอร์นี้ยังไม่รองรับการแจ้งเตือน ลองใช้ Chrome หรือ Safari รุ่นใหม่นะคะ
        </p>
      )}

      {state === 'blocked' && (
        <div className="rounded-xl p-3 text-xs" style={{ background: '#fff8f0', border: '1px solid #e8c4c4' }}>
          <p className="font-bold mb-1" style={{ color: '#4a2728' }}>การแจ้งเตือนถูกปิดไว้</p>
          <p style={{ color: '#7a4a4b' }}>
            เปิดได้ที่ตั้งค่าของเบราว์เซอร์ → การแจ้งเตือน → อนุญาตเว็บนี้ แล้วกลับมากดเปิดอีกครั้ง
          </p>
        </div>
      )}

      {state === 'off' && (
        <button onClick={enable} disabled={busy}
          className="w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50"
          style={{ background: '#4a2728', color: '#f2dada' }}>
          {busy ? 'กำลังเปิด...' : 'เปิดแจ้งเตือน'}
        </button>
      )}

      {state === 'on' && (
        <div className="space-y-2">
          <p className="text-sm font-semibold" style={{ color: '#1a7a3c' }}>เปิดแจ้งเตือนอยู่ ✓</p>
          <div className="flex gap-2">
            <button onClick={sendTest} disabled={busy}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 border-2 font-bold text-sm disabled:opacity-50"
              style={{ borderColor: '#e8c4c4', background: 'white', color: '#4a2728' }}>
              <Send size={15} />ทดสอบ
            </button>
            <button onClick={disable} disabled={busy}
              className="flex-1 rounded-xl py-2.5 border-2 font-bold text-sm disabled:opacity-50"
              style={{ borderColor: '#e8c4c4', background: 'white', color: '#7a4a4b' }}>
              ปิดแจ้งเตือน
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
