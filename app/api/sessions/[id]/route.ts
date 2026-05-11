import { NextResponse } from 'next/server'

import { getSupabaseServer } from '@/lib/supabase-server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if ('artDirectionPrefix' in body) {
      updates.art_direction_prefix =
        typeof body.artDirectionPrefix === 'string' && body.artDirectionPrefix.trim()
          ? body.artDirectionPrefix.trim()
          : null
    }

    if ('referenceImageUrl' in body) {
      updates.reference_image_url =
        typeof body.referenceImageUrl === 'string' && body.referenceImageUrl.trim()
          ? body.referenceImageUrl.trim()
          : null
    }

    if (Object.keys(updates).length === 0) {
      throw new Error('沒有可更新的設定')
    }

    const supabase = getSupabaseServer()
    const { data: session, error } = await supabase
      .from('production_sessions')
      .update(updates)
      .eq('id', params.id)
      .select('*')
      .single()

    if (error || !session) {
      throw new Error(error?.message ?? '更新 Session 設定失敗')
    }

    return NextResponse.json({ success: true, session })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '更新 Session 設定失敗',
      },
      { status: 400 }
    )
  }
}
