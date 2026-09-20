import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
}
const MAX_BYTES = 8 * 1024 * 1024

// Returns the order when the caller owns it (or is admin), otherwise null.
async function authorize(id: string) {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null

  const { data: order } = await supabase
    .from('orders').select('id, user_id, payment_slip_url').eq('id', id).single()
  if (!order) return null

  if (user.email !== process.env.ADMIN_EMAIL && order.user_id !== user.id) return null
  return order
}

// Older rows hold a full public URL; newer ones hold just the object name.
function objectName(stored: string) {
  const marker = '/slips/'
  const i = stored.indexOf(marker)
  return i === -1 ? stored : stored.slice(i + marker.length)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await authorize(id)
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!order.payment_slip_url) return NextResponse.json({ error: 'ยังไม่มีสลิป' }, { status: 404 })

  const { data, error } = await supabase.storage
    .from('slips')
    .createSignedUrl(objectName(order.payment_slip_url), 60)

  if (error || !data) return NextResponse.json({ error: 'เปิดสลิปไม่สำเร็จ' }, { status: 500 })
  return NextResponse.redirect(data.signedUrl)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const order = await authorize(id)
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const formData = await req.formData()
    const file = formData.get('slip')

    if (!(file instanceof File)) return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 400 })

    const ext = ALLOWED_TYPES[file.type]
    if (!ext) return NextResponse.json({ error: 'รองรับเฉพาะรูปภาพ (JPG, PNG, WEBP, HEIC)' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'ไฟล์ใหญ่เกิน 8MB' }, { status: 400 })

    const fileName = `${order.id}.${ext}`
    const bytes = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from('slips')
      .upload(fileName, bytes, { contentType: file.type, upsert: true })

    if (uploadError) throw uploadError

    const { error } = await supabase
      .from('orders')
      .update({ payment_slip_url: fileName })
      .eq('id', order.id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'อัพโหลดสลิปไม่สำเร็จ' }, { status: 500 })
  }
}
