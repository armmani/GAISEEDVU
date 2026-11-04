import type { Metadata, Viewport } from 'next'
import { Sarabun } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import PwaRegister from '@/components/PwaRegister'

const sarabun = Sarabun({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['thai', 'latin'],
  variable: '--font-sarabun',
})

export const metadata: Metadata = {
  title: 'GAI SEED VU — ไก่ซี๊ดวู้ว',
  description: 'ไก่ซูวีดคุณภาพดี สั่งล่วงหน้า 2-3 วัน นัดรับหรือส่ง Grab ใน กทม.',
  openGraph: {
    title: 'GAI SEED VU — ไก่ซี๊ดวู้ว',
    description: 'ไก่ซูวีดคุณภาพดี สั่งล่วงหน้า 2-3 วัน',
    siteName: 'GAI SEED VU',
  },
  applicationName: 'GAI SEED VU',
  appleWebApp: {
    capable: true,
    title: 'ไก่ซี๊ดวู้ว',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#f2dada',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body className="min-h-screen font-[var(--font-sarabun)]">
        {children}
        <PwaRegister />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#4a2728',
              color: '#f2dada',
              fontFamily: 'var(--font-sarabun)',
            },
          }}
        />
      </body>
    </html>
  )
}
