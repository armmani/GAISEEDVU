import type { Metadata } from 'next'
import { Sarabun } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

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
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body className="min-h-screen font-[var(--font-sarabun)]">
        {children}
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
