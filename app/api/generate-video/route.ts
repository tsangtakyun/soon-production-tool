import { fal } from '@fal-ai/client'
import { NextResponse } from 'next/server'

import { getSupabaseServer } from '@/lib/supabase-server'

const ENDPOINT = 'fal-ai/kling-video/v2.6/pro/image-to-video'
const COST_PER_SECOND_AUDIO_OFF = 0.07
const COST_PER_SECOND_AUDIO_ON = 0.14

export const maxDuration = 300

interface KlingResult {
  video?: {
    url?: string
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildKlingPrompt(motionPrompt: string, audioPrompt: string) {
  if (!audioPrompt) return motionPrompt
  return `${motionPrompt}\n\nAudio: ${audioPrompt}`
}

export async function POST(request: Request) {
  const supabase = getSupabaseServer()
  let shotId: string | undefined

  try {
    if (!process.env.FAL_KEY) {
      throw new Error('缺少 FAL_KEY')
    }

    const body = await request.json()
    shotId = typeof body.shotId === 'string' ? body.shotId : undefined
    const motionPrompt =
      typeof body.motionPrompt === 'string' ? body.motionPrompt.trim() : ''
    const audioPrompt =
      typeof body.audioPrompt === 'string' ? body.audioPrompt.trim() : ''
    const audioEnabled = Boolean(audioPrompt)
    const duration = Number(body.duration)

    if (!shotId) throw new Error('缺少 shotId')
    if (!motionPrompt) throw new Error('缺少 motion prompt')
    if (![5, 10].includes(duration)) {
      throw new Error('Duration 只可以係 5 或 10 秒')
    }

    const { data: shot, error: fetchError } = await supabase
      .from('production_shots')
      .select('*')
      .eq('id', shotId)
      .single()

    if (fetchError || !shot) {
      throw new Error(fetchError?.message ?? '找不到鏡頭')
    }

    if (shot.video_status === 'generating') {
      return NextResponse.json(
        { success: false, error: '呢個鏡頭已經生成緊 video' },
        { status: 409 }
      )
    }

    const sourceImageUrl = shot.manual_image_url ?? shot.generated_image_url
    if (!sourceImageUrl) {
      return NextResponse.json(
        { success: false, error: '未有圖片，唔可以生成 video' },
        { status: 400 }
      )
    }

    await supabase
      .from('production_shots')
      .update({
        motion_prompt: motionPrompt,
        audio_prompt: audioPrompt || null,
        audio_enabled: audioEnabled,
        video_status: 'generating',
        video_source_image_url: sourceImageUrl,
        video_error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shotId)

    fal.config({ credentials: process.env.FAL_KEY })

    const queued = await fal.queue.submit(ENDPOINT, {
      input: {
        start_image_url: sourceImageUrl,
        prompt: buildKlingPrompt(motionPrompt, audioPrompt),
        duration: duration === 10 ? '10' : '5',
        aspect_ratio: '16:9',
        generate_audio: audioEnabled,
      } as any,
      startTimeout: 600,
    })

    const requestId = queued.request_id
    const startedAt = Date.now()
    let completed = false

    while (!completed) {
      if (Date.now() - startedAt > 290000) {
        throw new Error('Video 生成 timeout，請 retry')
      }

      const status = await fal.queue.status(ENDPOINT, {
        requestId,
        logs: false,
      })

      if (status.status === 'COMPLETED') {
        completed = true
        break
      }

      await sleep(5000)
    }

    const result = await fal.queue.result(ENDPOINT, { requestId })
    const data = result.data as KlingResult
    const videoUrl = data.video?.url

    if (!videoUrl) {
      throw new Error('Kling 沒有返回 video URL')
    }

    const costPerSecond = audioEnabled
      ? COST_PER_SECOND_AUDIO_ON
      : COST_PER_SECOND_AUDIO_OFF

    const { data: updated, error: updateError } = await supabase
      .from('production_shots')
      .update({
        video_status: 'done',
        video_url: videoUrl,
        video_duration: duration,
        video_cost_usd: Number((duration * costPerSecond).toFixed(2)),
        audio_prompt: audioPrompt || null,
        audio_enabled: audioEnabled,
        video_fal_request_id: requestId,
        video_error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shotId)
      .select('*')
      .single()

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? '更新 video 結果失敗')
    }

    return NextResponse.json({ success: true, shot: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Video 生成失敗'

    if (shotId) {
      await supabase
        .from('production_shots')
        .update({
          video_status: 'error',
          video_error_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shotId)
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
