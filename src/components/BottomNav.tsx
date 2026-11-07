'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingBag, ClipboardList, MessageCircle, User } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', icon: ShoppingBag, label: 'สั่งไก่' },
  { href: '/account/orders', icon: ClipboardList, label: 'ออเดอร์' },
  { href: '/account/chat', icon: MessageCircle, label: 'แชท' },
  { href: '/account/profile', icon: User, label: 'โปรไฟล์' },
]

const UNREAD_POLL_MS = 20000

export default function BottomNav() {
  const pathname = usePathname()
  const onChat = pathname === '/account/chat'
  const [unread, setUnread] = useState(0)

  // Badge for replies the customer hasn't opened yet. Reading the thread
  // clears them server-side, so the chat page itself never shows a badge.
  useEffect(() => {
    if (onChat) { setUnread(0); return }
    let active = true
    const load = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const res = await fetch('/api/chat/unread')
        if (!res.ok) return
        const data = await res.json()
        if (active) setUnread(typeof data.count === 'number' ? data.count : 0)
      } catch {
        // Offline — leave the badge as it is.
      }
    }
    load()
    const timer = setInterval(load, UNREAD_POLL_MS)
    document.addEventListener('visibilitychange', load)
    return () => {
      active = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', load)
    }
  }, [onChat])

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t"
      style={{ background: 'white', borderColor: '#e8c4c4' }}
    >
      <div className="flex max-w-md mx-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          const badge = href === '/account/chat' ? unread : 0
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center py-3 gap-1 text-xs font-semibold transition-colors"
              style={{ color: active ? '#4a2728' : '#b89a9b' }}
            >
              <span className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                {badge > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: '#c0392b', color: 'white' }}
                  >
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
