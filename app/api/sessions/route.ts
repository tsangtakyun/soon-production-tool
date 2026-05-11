import { NextResponse } from 'next/server'

import { parseStoryboardJSON } from '@/lib/storyboard-parser'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = parseStoryboardJSON(body.rawJson)
    const title =
      typeof body.title === 'string' && body.title.trim()
        ? body.title.trim()
        : parsed.title

    const supabase = getSupabaseServer()
    const { data: session, error: sessionError } = await supabase
      .from('production_sessions')
      .insert({
        title,
        raw_json: body.rawJson,
        shot_count: parsed.shotCount,
        ai_shot_count: parsed.aiShots.length,
      })
      .select('id')
      .single()

    if (sessionError || !session) {
      throw new Error(sessionError?.message ?? '建立 Session 失敗')
    }

    const shotRows = parsed.aiShots.map((shot) => ({
      session_id: session.id,
      shot_index: shot.shotIndex,
      shot_label: shot.shotLabel,
      production_prompt: shot.productionPrompt,
    }))

    const { error: shotsError } = await supabase
      .from('production_shots')
      .insert(shotRows)

    if (shotsError) {
      throw new Error(`建立鏡頭失敗：${shotsError.message}`)
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      aiShotCount: parsed.aiShots.length,
    })
  } catch (error) {
    const message =
      error instanceof SyntaxError
        ? 'JSON 檔案無效'
        : error instanceof Error
          ? error.message
          : '匯入失敗'

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    )
  }
}
