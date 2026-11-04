'use client'

import { useEffect } from 'react'

/** Registers the service worker and keeps the stored push subscription in step
 *  with the one the browser actually holds. */
export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const run = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })
        const sub = await reg.pushManager?.getSubscription()
        if (!sub) return
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        })
      } catch (err) {
        console.warn('[pwa] service worker:', err)
      }
    }

    run()
  }, [])

  return null
}
