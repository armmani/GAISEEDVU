'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronLeft, Send, Phone } from 'lucide-react'
import { CHAT_MAX_LENGTH, formatChatTime, formatChatDay, groupChatByDay, type ChatMessage } from '@/lib/types'

const THREADS_POLL_MS = 10000
const THREAD_POLL_MS = 5000

export interface ChatThread {
  user_id: string
  name: string
  phone: string
  email: string
  last_body: string
  last_sender: 'customer' | 'admin'
  last_at: string
  unread: number
}

function preview(body: string): string {
  const oneLine = body.replace(/\s+/g, ' ').trim()
  return oneLine.length > 60 ? `${oneLine.slice(0, 57)}…` : oneLine
}

export default function AdminChat({ onUnreadChange }: { onUnreadChange?: (count: number) => void }) {
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [openUser, setOpenUser] = useState<ChatThread | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastCountRef = useRef(0)

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/chat')
      if (!res.ok) return
      const data = await res.json()
      if (!Array.isArray(data)) return
      setThreads(data)
      onUnreadChange?.(data.reduce((s: number, t: ChatThread) => s + t.unread, 0))
    } catch {
      // Offline — the next poll will catch up.
    }
  }, [onUnreadChange])

  const loadThread = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/chat/${userId}`)
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) setMessages(data)
    } catch {
      // Offline — the next poll will catch up.
    }
  }, [])

  useEffect(() => {
    loadThreads().finally(() => setLoading(false))
  }, [loadThreads])

  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') loadThreads() }
    const timer = setInterval(tick, THREADS_POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  }, [loadThreads])

  // Opening a thread marks it read, so refresh the list's badges too.
  useEffect(() => {
    if (!openUser) return
    const id = openUser.user_id
    setMessages([])
    lastCountRef.current = 0
    loadThread(id).then(loadThreads)
    const tick = () => { if (document.visibilityState === 'visible') loadThread(id) }
    const timer = setInterval(tick, THREAD_POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  }, [openUser, loadThread, loadThreads])

  useEffect(() => {
    if (messages.length === lastCountRef.current) return
    lastCountRef.current = messages.length
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  async function reply() {
    const trimmed = text.trim()
    if (!trimmed || !openUser || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: openUser.user_id, body: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'ส่งไม่สำเร็จ'); return }
      setText('')
      setMessages(prev => [...prev, data as ChatMessage])
      loadThreads()
    } catch {
      toast.error('ส่งไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setSending(false)
    }
  }

  // ——— Thread list ———
  if (!openUser) {
    return (
      <div className="space-y-3">
        {loading && <p className="text-center text-sm py-8" style={{ color: '#7a4a4b' }}>กำลังโหลด…</p>}

        {!loading && threads.length === 0 && (
          <div className="text-center py-12 rounded-2xl border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <p className="text-4xl mb-3">💬</p>
            <p className="font-semibold" style={{ color: '#4a2728' }}>ยังไม่มีใครทักมา</p>
            <p className="text-xs mt-1" style={{ color: '#7a4a4b' }}>ข้อความจากลูกค้าจะมาโผล่ที่นี่</p>
          </div>
        )}

        {threads.map(t => (
          <button key={t.user_id} onClick={() => setOpenUser(t)}
            className="w-full text-left rounded-2xl border-2 p-3.5 flex items-start gap-3"
            style={{ background: 'white', borderColor: t.unread > 0 ? '#c0392b' : '#e8c4c4' }}>
            <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-black"
              style={{ background: '#f2dada', color: '#4a2728' }}>
              {t.name.trim().charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold truncate" style={{ color: '#4a2728' }}>{t.name}</p>
                {t.unread > 0 && (
                  <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: '#c0392b', color: 'white' }}>
                    {t.unread > 9 ? '9+' : t.unread}
                  </span>
                )}
              </div>
              <p className="text-xs truncate mt-0.5" style={{ color: t.unread > 0 ? '#4a2728' : '#7a4a4b' }}>
                {t.last_sender === 'admin' ? 'เราตอบ: ' : ''}{preview(t.last_body)}
              </p>
            </div>
            <p className="text-[10px] shrink-0" style={{ color: '#a08585' }}>
              {formatChatDay(t.last_at) === 'วันนี้' ? formatChatTime(t.last_at) : formatChatDay(t.last_at)}
            </p>
          </button>
        ))}
      </div>
    )
  }

  // ——— One thread ———
  const groups = groupChatByDay(messages)

  return (
    <div className="rounded-2xl border-2 overflow-hidden flex flex-col" style={{ background: 'white', borderColor: '#e8c4c4', height: '70vh' }}>
      <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: '#f0e0e0' }}>
        <button onClick={() => setOpenUser(null)} className="p-1 -ml-1" style={{ color: '#4a2728' }} aria-label="ย้อนกลับ">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate text-sm" style={{ color: '#4a2728' }}>{openUser.name}</p>
          <p className="text-[11px] truncate" style={{ color: '#7a4a4b' }}>{openUser.phone || openUser.email}</p>
        </div>
        {openUser.phone && (
          <a href={`tel:${openUser.phone}`} className="p-2 rounded-full" style={{ background: '#f2dada', color: '#4a2728' }} aria-label="โทร">
            <Phone size={15} />
          </a>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3" style={{ background: '#fffcfc' }}>
        {groups.map(({ day, messages: dayMessages }) => (
          <div key={day} className="space-y-2 mb-3">
            <p className="text-center text-[11px] font-bold py-0.5" style={{ color: '#a08585' }}>{day}</p>
            {dayMessages.map(m => {
              const mine = m.sender === 'admin'
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%] rounded-2xl px-3 py-2"
                    style={{
                      background: mine ? '#4a2728' : '#f2dada',
                      color: mine ? '#f2dada' : '#4a2728',
                      borderBottomRightRadius: mine ? 6 : undefined,
                      borderBottomLeftRadius: mine ? undefined : 6,
                    }}>
                    <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                    <p className="text-[10px] mt-0.5 text-right" style={{ color: mine ? '#d8b0b0' : '#a08585' }}>
                      {formatChatTime(m.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} className="h-1" />
      </div>

      <div className="shrink-0 border-t flex items-end gap-2 px-2.5 py-2" style={{ borderColor: '#f0e0e0' }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value.slice(0, CHAT_MAX_LENGTH))}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); reply() } }}
          rows={1}
          placeholder="ตอบลูกค้า…"
          className="flex-1 resize-none rounded-2xl px-3 py-2 text-sm outline-none border-2 max-h-24"
          style={{ borderColor: '#e8c4c4', color: '#4a2728', background: '#fffcfc' }}
        />
        <button onClick={reply} disabled={sending || text.trim().length === 0}
          className="rounded-full p-2.5 shrink-0"
          style={{ background: '#4a2728', color: '#f2dada', opacity: sending || text.trim().length === 0 ? 0.4 : 1 }}
          aria-label="ส่งข้อความ">
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
