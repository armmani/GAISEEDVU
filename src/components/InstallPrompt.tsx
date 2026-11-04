'use client'

import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'gsv-install-dismissed'

export default function InstallPrompt({ variant = 'card' }: { variant?: 'card' | 'banner' }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(true) // assume installed until checked, so nothing flashes
  const [isIOS, setIsIOS] = useState(false)
  const [dismissed, setDismissed] = useState(variant === 'banner')

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    setInstalled(standalone)
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent))

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

  if (installed || dismissed) return null

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

  const iosSteps = (
    <p className="text-xs leading-relaxed" style={{ color: '#7a4a4b' }}>
      ใน Safari กดปุ่มแชร์ <Share size={12} className="inline -mt-0.5" /> ด้านล่าง →
      เลื่อนหา <b>เพิ่มไปยังหน้าจอโฮม</b> → กด <b>เพิ่ม</b>
    </p>
  )

  if (variant === 'banner') {
    return (
      <div className="rounded-2xl p-3 mb-4 border-2 flex items-start gap-3"
        style={{ background: 'white', borderColor: '#e8c4c4' }}>
        <img src="/icon-192.png" alt="" className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm" style={{ color: '#4a2728' }}>ลงแอพไว้ในมือถือ</p>
          {deferred ? (
            <p className="text-xs" style={{ color: '#7a4a4b' }}>สั่งไก่ได้เร็วขึ้น และรับแจ้งเตือนสถานะออเดอร์</p>
          ) : isIOS ? iosSteps : (
            <p className="text-xs" style={{ color: '#7a4a4b' }}>
              เปิดเมนูเบราว์เซอร์ แล้วเลือก <b>ติดตั้งแอพ</b> หรือ <b>เพิ่มไปยังหน้าจอโฮม</b>
            </p>
          )}
          {deferred && (
            <button onClick={install}
              className="mt-2 rounded-xl px-4 py-2 font-bold text-xs"
              style={{ background: '#4a2728', color: '#f2dada' }}>
              ติดตั้งแอพ
            </button>
          )}
        </div>
        <button onClick={hide} className="p-1 shrink-0" aria-label="ปิด">
          <X size={16} style={{ color: '#b89a9b' }} />
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-5 border-2 space-y-3" style={{ background: 'white', borderColor: '#e8c4c4' }}>
      <div className="flex items-center gap-2">
        <Download size={18} style={{ color: '#4a2728' }} />
        <h3 className="font-bold text-lg" style={{ color: '#4a2728' }}>ติดตั้งแอพ</h3>
      </div>
      <p className="text-sm" style={{ color: '#7a4a4b' }}>
        เพิ่มไก่ซี๊ดวู้วไว้ที่หน้าจอโฮม เปิดได้เหมือนแอพจริง และรับแจ้งเตือนได้
      </p>

      {deferred ? (
        <button onClick={install}
          className="w-full rounded-xl py-3 font-bold text-sm"
          style={{ background: '#4a2728', color: '#f2dada' }}>
          ติดตั้งแอพ
        </button>
      ) : (
        <div className="rounded-xl p-3" style={{ background: '#fff8f0', border: '1px solid #e8c4c4' }}>
          {isIOS ? iosSteps : (
            <p className="text-xs leading-relaxed" style={{ color: '#7a4a4b' }}>
              เปิดเมนู <b>⋮</b> ของเบราว์เซอร์ แล้วเลือก <b>ติดตั้งแอพ</b> หรือ <b>เพิ่มไปยังหน้าจอโฮม</b>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
