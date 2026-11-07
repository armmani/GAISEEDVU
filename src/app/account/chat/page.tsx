'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Send } from 'lucide-react'
import { CHAT_MAX_LENGTH, formatChatTime, groupChatByDay, type ChatMessage } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import ChickenLoader from '@/components/ChickenLoader'

const POLL_MS = 5000

const QUICK_ASKS = [
  'ขอเลื่อนวันรับได้ไหมคะ',
  'สั่งเพิ่มได้ไหมคะ',
  'สอบถามเรื่องการจัดส่งค่ะ',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastCountRef = useRef(0)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/chat')
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) setMessages(data)
    } catch {
      // Offline or a flaky connection — the next poll will catch up.
    }
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  // Prefilled question from an order page: /account/chat?order=ABC123
  useEffect(() => {
    const order = new URLSearchParams(window.location.search).get('order')
    if (order) setText(`สอบถามเรื่องออเดอร์ #${order.slice(0, 6).toUpperCase()} ค่ะ `)
  }, [])

  // Poll only while the tab is actually being looked at.
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') load() }
    const timer = setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  }, [load])

  useEffect(() => {
    if (messages.length === lastCountRef.current) return
    lastCountRef.current = messages.length
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  async function send(body: string) {
    const trimmed = body.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'ส่งไม่สำเร็จ'); return }
      setText('')
      setMessages(prev => [...prev, data as ChatMessage])
    } catch {
      toast.error('ส่งไม่สำเร็จ ลองใหม่อีกครั้งนะคะ')
    } finally {
      setSending(false)
    }
  }

  const groups = groupChatByDay(messages)

  return (
    <main className="flex flex-col" style={{ height: '100dvh', paddingBottom: '4.25rem', background: '#f2dada' }}>
      <div className="shrink-0 px-4 pt-6 pb-3 max-w-md w-full mx-auto">
        <h1 className="text-2xl font-black" style={{ color: '#4a2728' }}>คุยกับร้าน</h1>
        <p className="text-xs mt-0.5" style={{ color: '#7a4a4b' }}>
          ทักมาได้เลยค่ะ ร้านตอบในเวลาทำการ 09:00–20:00
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 max-w-md w-full mx-auto">
        {loading && <div className="flex justify-center py-16"><ChickenLoader /></div>}

        {!loading && messages.length === 0 && (
          <div className="text-center py-10 rounded-2xl border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <p className="text-4xl mb-3">🐔💬</p>
            <p className="font-semibold" style={{ color: '#4a2728' }}>ยังไม่มีข้อความ</p>
            <p className="text-xs mt-1 mb-4" style={{ color: '#7a4a4b' }}>มีอะไรให้ช่วยบอกได้เลยค่ะ</p>
            <div className="flex flex-wrap justify-center gap-2 px-4">
              {QUICK_ASKS.map(q => (
                <button key={q} onClick={() => setText(q)}
                  className="rounded-full px-3 py-1.5 text-xs font-bold border-2"
                  style={{ borderColor: '#e8c4c4', color: '#7a4a4b', background: '#fffcfc' }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {groups.map(({ day, messages: dayMessages }) => (
          <div key={day} className="space-y-2 mb-3">
            <p className="text-center text-xs font-bold py-1" style={{ color: '#a08585' }}>{day}</p>
            {dayMessages.map(m => {
              const mine = m.sender === 'customer'
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%] rounded-2xl px-3.5 py-2.5"
                    style={{
                      background: mine ? '#4a2728' : 'white',
                      color: mine ? '#f2dada' : '#4a2728',
                      border: mine ? 'none' : '2px solid #e8c4c4',
                      borderBottomRightRadius: mine ? 6 : undefined,
                      borderBottomLeftRadius: mine ? undefined : 6,
                    }}>
                    <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                    <p className="text-[10px] mt-1 text-right" style={{ color: mine ? '#d8b0b0' : '#a08585' }}>
                      {formatChatTime(m.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        <div ref={bottomRef} className="h-2" />
      </div>

      <div className="shrink-0 border-t" style={{ background: 'white', borderColor: '#e8c4c4' }}>
        <div className="max-w-md mx-auto flex items-end gap-2 px-3 py-2.5">
          <textarea
            value={text}
            onChange={e => setText(e.target.value.slice(0, CHAT_MAX_LENGTH))}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text) }
            }}
            rows={1}
            placeholder="พิมพ์ข้อความ…"
            className="flex-1 resize-none rounded-2xl px-3.5 py-2.5 text-sm outline-none border-2 max-h-28"
            style={{ borderColor: '#e8c4c4', color: '#4a2728', background: '#fffcfc' }}
          />
          <button
            onClick={() => send(text)}
            disabled={sending || text.trim().length === 0}
            className="rounded-full p-3 shrink-0 transition-opacity"
            style={{
              background: '#4a2728',
              color: '#f2dada',
              opacity: sending || text.trim().length === 0 ? 0.4 : 1,
            }}
            aria-label="ส่งข้อความ">
            <Send size={18} />
          </button>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
