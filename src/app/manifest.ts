import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GAI SEED VU — ไก่ซี๊ดวู้ว',
    short_name: 'ไก่ซี๊ดวู้ว',
    description: 'ไก่ซูวีดคุณภาพดี สั่งล่วงหน้า 2-3 วัน นัดรับหรือส่ง Grab ใน กทม.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'th',
    dir: 'ltr',
    background_color: '#f2dada',
    theme_color: '#f2dada',
    categories: ['food', 'shopping'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'สั่งไก่', short_name: 'สั่งไก่', url: '/', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'ออเดอร์ของฉัน', short_name: 'ออเดอร์', url: '/account/orders', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
    ],
  }
}
