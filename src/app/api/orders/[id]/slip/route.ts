import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const formData = await req.formData()
    const file = formData.get('slip') as File

    if (!file) return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 400 })

    const ext = file.name.split('.').pop()
    const fileName = `${id}.${ext}`
    const bytes = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from('slips')
      .upload(fileName, bytes, { contentType: file.type, upsert: true })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage.from('slips').getPublicUrl(fileName)

    const { error } = await supabase
      .from('orders')
      .update({ payment_slip_url: publicUrl })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'อัพโหลดสลิปไม่สำเร็จ' }, { status: 500 })
  }
}
