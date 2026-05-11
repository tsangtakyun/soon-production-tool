import { NextResponse } from 'next/server'

import { getSupabaseServer } from '@/lib/supabase-server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof body.editedPrompt === 'string') {
      updates.edited_prompt = body.editedPrompt
    }

    if (typeof body.motionPrompt === 'string') {
      updates.motion_prompt = body.motionPrompt
    }

    if (typeof body.audioPrompt === 'string') {
      const audioPrompt = body.audioPrompt.trim()
      updates.audio_prompt = audioPrompt || null
      updates.audio_enabled = Boolean(audioPrompt)
    }

    if (typeof body.videoStatus === 'string') {
      updates.video_status = body.videoStatus
      if (body.videoStatus === 'idle') {
        updates.video_error_message = null
      }
    }

    if (typeof body.resetStatus === 'boolean' && body.resetStatus) {
      updates.status = 'pending'
      updates.error_message = null
    }

    const supabase = getSupabaseServer()
    const { data: shot, error } = await supabase
      .from('production_shots')
      .update(updates)
      .eq('id', params.id)
      .select('*')
      .single()

    if (error || !shot) {
      throw new Error(error?.message ?? '更新鏡頭失敗')
    }

    return NextResponse.json({ success: true, shot })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '更新鏡頭失敗',
      },
      { status: 400 }
    )
  }
}
