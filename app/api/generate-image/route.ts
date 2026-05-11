import { NextResponse } from 'next/server'

import { generateStoryboardImage } from '@/lib/fal'
import { getSupabaseServer } from '@/lib/supabase-server'

const TEXT_TO_IMAGE_COST_USD = 0.04

export const maxDuration = 180

export async function POST(request: Request) {
  const supabase = getSupabaseServer()
  let shotId: string | undefined

  try {
    const body = await request.json()
    shotId = typeof body.shotId === 'string' ? body.shotId : undefined
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''

    if (!shotId) throw new Error('缺少 shotId')
    if (!prompt) throw new Error('缺少提示詞')

    const { data: shot, error: fetchError } = await supabase
      .from('production_shots')
      .select('*')
      .eq('id', shotId)
      .single()

    if (fetchError || !shot) {
      throw new Error(fetchError?.message ?? '搵唔到鏡頭')
    }

    if (shot.status === 'generating') {
      return NextResponse.json(
        {
          success: false,
          error: '呢個鏡頭正在生成中，已拒絕重複生成',
        },
        { status: 409 }
      )
    }

    const { data: session, error: sessionError } = await supabase
      .from('production_sessions')
      .select('art_direction_prefix, reference_image_url')
      .eq('id', shot.session_id)
      .single()

    if (sessionError || !session) {
      throw new Error(sessionError?.message ?? '搵唔到 Session')
    }

    const artDirectionPrefix =
      typeof session.art_direction_prefix === 'string'
        ? session.art_direction_prefix.trim()
        : ''
    const referenceImageUrl =
      typeof session.reference_image_url === 'string'
        ? session.reference_image_url.trim()
        : ''
    const finalPrompt = artDirectionPrefix
      ? `${artDirectionPrefix} ${prompt}`
      : prompt

    const { error: generatingError } = await supabase
      .from('production_shots')
      .update({
        status: 'generating',
        edited_prompt: prompt === shot.production_prompt ? shot.edited_prompt : prompt,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shotId)

    if (generatingError) throw new Error(generatingError.message)

    const result = await generateStoryboardImage({
      prompt: finalPrompt,
      referenceImageUrl,
    })

    const { data: updated, error: doneError } = await supabase
      .from('production_shots')
      .update({
        status: 'done',
        generated_image_url: result.imageUrl,
        fal_request_id: result.requestId ?? null,
        cost_usd: referenceImageUrl ? null : TEXT_TO_IMAGE_COST_USD,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shotId)
      .select('*')
      .single()

    if (doneError || !updated) {
      throw new Error(doneError?.message ?? '更新鏡頭失敗')
    }

    return NextResponse.json({
      success: true,
      shot: updated,
      endpoint: result.endpoint,
      referenceUsed: Boolean(referenceImageUrl),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '生成失敗'

    if (shotId) {
      await supabase
        .from('production_shots')
        .update({
          status: 'error',
          error_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shotId)
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}
