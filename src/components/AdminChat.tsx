'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronLeft, Send, Phone, PenSquare, Search, BellOff, X } from 'lucide-react'
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

/** A customer the shop can start a chat with, whether or not a thread exists. */
export interface ChatCustomer {
  id: string
  name: string
  phone: string
  email: string
  has_push: boolean
  has_telegram: boolean
}

interface OpenChat {
  user_id: string
  name: string
  phone: string
  email: string
  has_push: boolean
  has_telegram: boolean
}

/** Set by the dashboard to jump straight into one customer's thread. */
export interface ChatTarget {
  userId: string
  prefill?: string
}

function preview(body: string): string {
  const oneLine = body.replace(/\s+/g, ' ').trim()
  return oneLine.length > 60 ? `${oneLine.slice(0, 57)}…` : oneLine
}

export default function AdminChat({
  customers,
  target,
  onTargetHandled,
  onUnreadChange,
}: {
  customers: ChatCustomer[]
  target?: ChatTarget | null
  onTargetHandled?: () => void
  onUnreadChange?: (count: number) => void
}) {
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [openChat, setOpenChat] = useState<OpenChat | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [picking, setPicking] = useState(false)
  const [search, setSearch] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastCountRef = useRef(0)

  const customerMap = useMemo(
    () => new Map(customers.map(c => [c.id, c])),
    [customers],
  )

  /** Everything needed for the thread header, from either source. */
  const toOpenChat = useCallback((userId: string, fallback?: Partial<OpenChat>): OpenChat => {
    const c = customerMap.get(userId)
    return {
      user_id: userId,
      name: c?.name || fallback?.name || '(ไม่ทราบชื่อ)',
      phone: c?.phone || fallback?.phone || '',
      email: c?.email || fallback?.email || '',
      has_push: c?.has_push ?? false,
      has_telegram: c?.has_telegram ?? false,
    }
  }, [customerMap])

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

  // Jump into a thread the dashboard asked for (ทักลูกค้า from an order or a
  // customer card), with its question already typed.
  useEffect(() => {
    if (!target) return
    setPicking(false)
    setOpenChat(toOpenChat(target.userId))
    setText(target.prefill ?? '')
    onTargetHandled?.()
  }, [target, toOpenChat, onTargetHandled])

  // Opening a thread marks it read, so refresh the list's badges too.
  useEffect(() => {
    if (!openChat) return
    const id = openChat.user_id
    setMessages([])
    lastCountRef.current = 0
    loadThread(id).then(loadThreads)
    const tick = () => { if (document.visibilityState === 'visible') loadThread(id) }
    const timer = setInterval(tick, THREAD_POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  }, [openChat, loadThread, loadThreads])

  useEffect(() => {
    if (messages.length === lastCountRef.current) return
    lastCountRef.current = messages.length
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  async function reply() {
    const trimmed = text.trim()
    if (!trimmed || !openChat || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: openChat.user_id, body: trimmed }),
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

  // ——— Picking a customer to write to first ———
  if (picking) {
    const q = search.trim().toLowerCase()
    const threadIds = new Set(threads.map(t => t.user_id))
    const matches = customers.filter(c =>
      !q
      || c.name.toLowerCase().includes(q)
      || c.phone.includes(q)
      || c.email.toLowerCase().includes(q)
    )

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-2xl border-2 px-3 py-2"
            style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <Search size={15} style={{ color: '#b89a9b' }} />
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ / เบอร์ / อีเมล"
              className="flex-1 text-sm outline-none" style={{ color: '#4a2728' }} />
          </div>
          <button onClick={() => { setPicking(false); setSearch('') }}
            className="rounded-2xl border-2 p-2.5" style={{ background: 'white', borderColor: '#e8c4c4', color: '#4a2728' }}
            aria-label="ปิด">
            <X size={16} />
          </button>
        </div>

        {matches.length === 0 && (
          <p className="text-center text-sm py-8" style={{ color: '#7a4a4b' }}>ไม่พบลูกค้าที่ค้นหา</p>
        )}

        <div className="space-y-2">
          {matches.map(c => (
            <button key={c.id}
              onClick={() => { setPicking(false); setSearch(''); setOpenChat(toOpenChat(c.id)); setText('') }}
              className="w-full text-left rounded-2xl border-2 px-3.5 py-3 flex items-center gap-3"
              style={{ background: 'white', borderColor: '#e8c4c4' }}>
              <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-black text-sm"
                style={{ background: '#f2dada', color: '#4a2728' }}>
                {c.name.trim().charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate" style={{ color: '#4a2728' }}>{c.name || '(ยังไม่ได้ตั้งชื่อ)'}</p>
                <p className="text-xs truncate" style={{ color: '#7a4a4b' }}>{c.phone || c.email}</p>
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                {!c.has_push && !c.has_telegram && (
                  <BellOff size={13} style={{ color: '#c0392b' }} />
                )}
                {threadIds.has(c.id) && (
                  <span className="text-[10px] font-bold rounded-full px-2 py-0.5"
                    style={{ background: '#f2dada', color: '#7a4a4b' }}>เคยคุยแล้ว</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ——— Thread list ———
  if (!openChat) {
    return (
      <div className="space-y-3">
        <button onClick={() => setPicking(true)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold"
          style={{ background: '#4a2728', color: '#f2dada' }}>
          <PenSquare size={16} /> ทักลูกค้าก่อน
        </button>

        {loading && <p className="text-center text-sm py-8" style={{ color: '#7a4a4b' }}>กำลังโหลด…</p>}

        {!loading && threads.length === 0 && (
          <div className="text-center py-12 rounded-2xl border-2" style={{ background: 'white', borderColor: '#e8c4c4' }}>
            <p className="text-4xl mb-3">💬</p>
            <p className="font-semibold" style={{ color: '#4a2728' }}>ยังไม่มีบทสนทนา</p>
            <p className="text-xs mt-1" style={{ color: '#7a4a4b' }}>ลูกค้าทักมา หรือกดปุ่มด้านบนเพื่อทักก่อนได้</p>
          </div>
        )}

        {threads.map(t => (
          <button key={t.user_id} onClick={() => setOpenChat(toOpenChat(t.user_id, t))}
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
  const unreachable = !openChat.has_push && !openChat.has_telegram

  return (
    <div className="rounded-2xl border-2 overflow-hidden flex flex-col" style={{ background: 'white', borderColor: '#e8c4c4', height: '70vh' }}>
      <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: '#f0e0e0' }}>
        <button onClick={() => setOpenChat(null)} className="p-1 -ml-1" style={{ color: '#4a2728' }} aria-label="ย้อนกลับ">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate text-sm" style={{ color: '#4a2728' }}>{openChat.name}</p>
          <p className="text-[11px] truncate" style={{ color: '#7a4a4b' }}>{openChat.phone || openChat.email}</p>
        </div>
        {openChat.phone && (
          <a href={`tel:${openChat.phone}`} className="p-2 rounded-full" style={{ background: '#f2dada', color: '#4a2728' }} aria-label="โทร">
            <Phone size={15} />
          </a>
        )}
      </div>

      {unreachable && (
        <div className="shrink-0 flex items-start gap-1.5 px-3 py-2 text-[11px] border-b"
          style={{ background: '#fff5f5', color: '#c0392b', borderColor: '#f8d7da' }}>
          <BellOff size={13} className="shrink-0 mt-0.5" />
          <span>ลูกค้ายังไม่ได้เปิดแจ้งเตือนและไม่ได้ผูก Telegram — จะเห็นข้อความตอนเปิดแอปเท่านั้น เรื่องด่วนควรโทรแจ้ง</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3" style={{ background: '#fffcfc' }}>
        {messages.length === 0 && (
          <p className="text-center text-xs py-6" style={{ color: '#a08585' }}>
            ยังไม่มีข้อความกับลูกค้าคนนี้ — พิมพ์ทักได้เลย
          </p>
        )}

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
          placeholder="พิมพ์ข้อความถึงลูกค้า…"
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
