'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingBag, ClipboardList, User } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', icon: ShoppingBag, label: 'สั่งไก่' },
  { href: '/account/orders', icon: ClipboardList, label: 'ออเดอร์' },
  { href: '/account/profile', icon: User, label: 'โปรไฟล์' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t"
      style={{ background: 'white', borderColor: '#e8c4c4' }}
    >
      <div className="flex max-w-md mx-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center py-3 gap-1 text-xs font-semibold transition-colors"
              style={{ color: active ? '#4a2728' : '#b89a9b' }}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
