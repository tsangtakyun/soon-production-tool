import { fal } from '@fal-ai/client'
import { NextResponse } from 'next/server'

import { getSupabaseServer } from '@/lib/supabase-server'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    if (!process.env.FAL_KEY) {
      throw new Error('缺少 FAL_KEY')
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const shotId = formData.get('shotId')

    if (typeof shotId !== 'string' || !shotId) {
      return NextResponse.json(
        { success: false, error: '缺少 shotId' },
        { status: 400 }
      )
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: '請上傳 JPG / PNG / WebP 圖片' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: '圖片唔可以超過 10MB' },
        { status: 400 }
      )
    }

    if (!ACCEPTED_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: '請上傳 JPG / PNG / WebP 圖片' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServer()
    const { data: existing, error: fetchError } = await supabase
      .from('production_shots')
      .select('id')
      .eq('id', shotId)
      .single()

    if (fetchError || !existing) {
      throw new Error(fetchError?.message ?? '搵唔到鏡頭')
    }

    fal.config({ credentials: process.env.FAL_KEY })
    const url = await fal.storage.upload(file)

    const { data: shot, error: updateError } = await supabase
      .from('production_shots')
      .update({
        manual_image_url: url,
        status: 'done',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shotId)
      .select('*')
      .single()

    if (updateError || !shot) {
      throw new Error(updateError?.message ?? '更新鏡頭失敗')
    }

    return NextResponse.json({ success: true, url, shot })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '上傳失敗，請再試',
      },
      { status: 500 }
    )
  }
}
