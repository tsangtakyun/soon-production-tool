import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { storyboardId } = await req.json()

  if (!storyboardId) {
    return NextResponse.json({ error: 'no storyboardId' }, { status: 400 })
  }

  const { data: storyboard, error: storyboardError } = await supabase
    .from('storyboards')
    .select('*, scripts(*)')
    .eq('id', storyboardId)
    .single()

  if (storyboardError || !storyboard) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const { data: shots, error: shotsError } = await supabase
    .from('storyboard_shots')
    .select('*')
    .eq('storyboard_id', storyboardId)
    .eq('footage_source_slug', 'ai_generation')
    .order('display_order', { ascending: true })

  if (shotsError) {
    return NextResponse.json({ error: shotsError.message }, { status: 500 })
  }

  if (!shots || shots.length === 0) {
    return NextResponse.json({ error: 'no AI generation shots' }, { status: 404 })
  }

  const script = Array.isArray(storyboard.scripts)
    ? storyboard.scripts[0]
    : storyboard.scripts

  const { data: session, error: sessionError } = await supabase
    .from('production_sessions')
    .insert({
      title: script?.title || storyboard.title || script?.topic || 'Production Session',
      shot_count: shots.length,
      ai_shot_count: shots.length,
      raw_json: { storyboardId, shots },
    })
    .select()
    .single()

  if (sessionError || !session) {
    return NextResponse.json(
      { error: sessionError?.message || 'failed to create session' },
      { status: 500 }
    )
  }

  const productionShots = shots.map((shot: any, index: number) => ({
    session_id: session.id,
    shot_index: index + 1,
    shot_label: `Shot ${index + 1}${shot.script_part_role ? ` - ${shot.script_part_role}` : ''}`,
    production_prompt:
      shot.production_prompt ||
      shot.visual_instruction ||
      shot.description ||
      'Create a cinematic 16:9 production visual for this storyboard shot.',
    edited_prompt: shot.production_prompt || shot.visual_instruction || null,
    status: 'pending',
  }))

  const { error: insertShotsError } = await supabase
    .from('production_shots')
    .insert(productionShots)

  if (insertShotsError) {
    return NextResponse.json({ error: insertShotsError.message }, { status: 500 })
  }

  return NextResponse.json({ sessionId: session.id })
}
