import { notFound } from 'next/navigation'

import { ShotList } from '@/components/ShotList'
import { getSupabaseServer } from '@/lib/supabase-server'
import type { ProductionSession, ProductionShot } from '@/types/storyboard'

export default async function SessionPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServer()
  const { data: session } = await supabase
    .from('production_sessions')
    .select('*')
    .eq('id', params.id)
    .single<ProductionSession>()

  if (!session) notFound()

  const { data: shots, error } = await supabase
    .from('production_shots')
    .select('*')
    .eq('session_id', params.id)
    .order('shot_index', { ascending: true })
    .returns<ProductionShot[]>()

  if (error) {
    throw new Error(error.message)
  }

  return (
    <main className="shell stack" style={{ width: '100%', maxWidth: '100%', padding: 24, margin: 0 }}>
      <ShotList session={session} initialShots={shots ?? []} />
    </main>
  )
}
