'use client'

import { useEffect, useState } from 'react'
import { Check, Download, Share, Smartphone, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'ios' | 'android'

const DISMISS_KEY = 'gsv-install-dismissed'

const STEPS: Record<Platform, { title: string; steps: React.ReactNode[] }> = {
  ios: {
    title: 'iPhone / iPad',
    steps: [
      <>เปิดเว็บนี้ด้วย <b>Safari</b></>,
      <>กดปุ่มแชร์ <Share size={12} className="inline -mt-0.5" /> ที่แถบล่างของหน้าจอ</>,
      <>เลื่อนลงหา <b>เพิ่มไปยังหน้าจอโฮม</b> (Add to Home Screen)</>,
      <>กด <b>เพิ่ม</b> มุมขวาบน</>,
      <>เสร็จแล้ว! เปิดแอพจากไอคอนไก่ที่หน้าจอโฮมได้เลย</>,
    ],
  },
  android: {
    title: 'Android',
    steps: [
      <>เปิดเว็บนี้ด้วย <b>Chrome</b></>,
      <>กดเมนู <b>⋮</b> มุมขวาบน</>,
      <>เลือก <b>ติดตั้งแอพ</b> หรือ <b>เพิ่มลงในหน้าจอหลัก</b></>,
      <>กด <b>ติดตั้ง</b> เพื่อยืนยัน</>,
      <>เสร็จแล้ว! เปิดแอพจากไอคอนไก่ที่หน้าจอโฮมได้เลย</>,
    ],
  },
}

function StepList({ platform }: { platform: Platform }) {
  return (
    <ol className="space-y-2">
      {STEPS[platform].steps.map((step, i) => (
        <li key={i} className="flex gap-2 text-xs leading-relaxed" style={{ color: '#7a4a4b' }}>
          <span
            className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-bold"
            style={{ background: '#f2dada', color: '#4a2728', fontSize: 11 }}
          >
            {i + 1}
          </span>
          <span className="pt-0.5">{step}</span>
        </li>
      ))}
    </ol>
  )
}

export default function InstallPrompt({ variant = 'card' }: { variant?: 'card' | 'banner' }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(true) // assume installed until checked, so nothing flashes
  const [platform, setPlatform] = useState<Platform>('android')
  const [tab, setTab] = useState<Platform>('android')
  const [inAppBrowser, setInAppBrowser] = useState(false)
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(variant === 'banner')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    setInstalled(standalone)

    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))
    setPlatform(isIOS ? 'ios' : 'android')
    setTab(isIOS ? 'ios' : 'android')
    // LINE and Facebook open links in their own browser, which cannot install a
    // web app at all — the customer has to move to Safari/Chrome first.
    setInAppBrowser(/\bLine\//i.test(ua) || /FBAN|FBAV|Instagram/i.test(ua))

    if (variant === 'banner') {
      try {
        setDismissed(localStorage.getItem(DISMISS_KEY) === '1')
      } catch {
        setDismissed(false)
      }
    }

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstalled(true)

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [variant])

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null)
    if (outcome === 'accepted') setInstalled(true)
  }

  function hide() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {}
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const inAppNote = inAppBrowser && (
    <div className="rounded-xl p-3 space-y-2" style={{ background: '#fff2f2', border: '1px solid #e8c4c4' }}>
      <p className="text-xs font-bold" style={{ color: '#c0392b' }}>
        ตอนนี้เปิดอยู่ในแอพ LINE / Facebook
      </p>
      <p className="text-xs leading-relaxed" style={{ color: '#7a4a4b' }}>
        เบราว์เซอร์ในแอพพวกนี้ติดตั้งไม่ได้ ต้องเปิดใน {platform === 'ios' ? 'Safari' : 'Chrome'} ก่อน —
        กดเมนูมุมขวาบนแล้วเลือก <b>เปิดในเบราว์เซอร์</b> หรือก๊อปลิงก์ไปวางเอง
      </p>
      <button onClick={copyLink}
        className="rounded-lg px-3 py-1.5 text-xs font-bold"
        style={{ background: '#4a2728', color: '#f2dada' }}>
        {copied ? 'คัดลอกแล้ว ✓' : 'คัดลอกลิงก์'}
      </button>
    </div>
  )

  const guide = (
    <div className="space-y-3">
      {inAppNote}

      <div className="grid grid-cols-2 gap-1 rounded-xl p-1" style={{ background: '#f8eeee' }}>
        {(['ios', 'android'] as const).map((p) => (
          <button key={p} onClick={() => setTab(p)}
            className="rounded-lg py-1.5 text-xs font-bold transition-all"
            style={{
              background: tab === p ? '#4a2728' : 'transparent',
              color: tab === p ? '#f2dada' : '#7a4a4b',
            }}>
            {STEPS[p].title}
          </button>
        ))}
      </div>

      <StepList platform={tab} />

      <p className="text-xs" style={{ color: '#b89a9b' }}>
        ติดตั้งแล้วเปิดแอพขึ้นมา จะเปิดแจ้งเตือนสถานะออเดอร์ได้ในหน้าโปรไฟล์
      </p>
    </div>
  )

  // ---- banner (order page, admin dashboard) ----
  if (variant === 'banner') {
    if (installed || dismissed) return null
    return (
      <div className="rounded-2xl p-3 mb-4 border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
        <div className="flex items-start gap-3">
          <img src="/icon-192.png" alt="" className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm" style={{ color: '#4a2728' }}>ลงแอพไว้ในมือถือ</p>
            <p className="text-xs" style={{ color: '#7a4a4b' }}>
              สั่งไก่ได้เร็วขึ้น และรับแจ้งเตือนเมื่อสถานะออเดอร์เปลี่ยน
            </p>
            <div className="flex gap-2 mt-2">
              {deferred && (
                <button onClick={install}
                  className="rounded-xl px-4 py-2 font-bold text-xs"
                  style={{ background: '#4a2728', color: '#f2dada' }}>
                  ติดตั้งแอพ
                </button>
              )}
              <button onClick={() => setOpen((v) => !v)}
                className="rounded-xl px-4 py-2 font-bold text-xs border-2"
                style={{ borderColor: '#e8c4c4', background: 'white', color: '#4a2728' }}>
                {open ? 'ซ่อนวิธีติดตั้ง' : 'ดูวิธีติดตั้ง'}
              </button>
            </div>
          </div>
          <button onClick={hide} className="p-1 shrink-0" aria-label="ปิด">
            <X size={16} style={{ color: '#b89a9b' }} />
          </button>
        </div>
        {open && <div className="mt-3 pt-3 border-t" style={{ borderColor: '#e8c4c4' }}>{guide}</div>}
      </div>
    )
  }

  // ---- card (profile page) ----
  if (installed) {
    return (
      <div className="rounded-2xl p-4 border-2 flex items-center gap-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
        <Check size={18} style={{ color: '#1a7a3c' }} />
        <p className="font-bold text-sm" style={{ color: '#1a7a3c' }}>ติดตั้งแอพในเครื่องนี้แล้ว</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-5 border-2 space-y-3" style={{ background: 'white', borderColor: '#e8c4c4' }}>
      <div className="flex items-center gap-2">
        <Smartphone size={18} style={{ color: '#4a2728' }} />
        <h3 className="font-bold text-lg" style={{ color: '#4a2728' }}>ติดตั้งแอพลงมือถือ</h3>
      </div>
      <p className="text-sm" style={{ color: '#7a4a4b' }}>
        เพิ่มไก่ซี๊ดวู้วไว้ที่หน้าจอโฮม เปิดได้เหมือนแอพจริง สั่งไก่เร็วขึ้น และรับแจ้งเตือนสถานะออเดอร์ได้
      </p>

      {deferred && (
        <button onClick={install}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-sm"
          style={{ background: '#4a2728', color: '#f2dada' }}>
          <Download size={16} />ติดตั้งแอพเลย
        </button>
      )}

      {guide}
    </div>
  )
}
