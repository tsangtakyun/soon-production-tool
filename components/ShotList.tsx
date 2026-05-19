'use client'

import { useMemo, useState } from 'react'

import { ArtDirectionPanel } from '@/components/ArtDirectionPanel'
import { ReferenceImagePanel } from '@/components/ReferenceImagePanel'
import { ShotCard } from '@/components/ShotCard'
import type { ProductionSession, ProductionShot } from '@/types/storyboard'

interface ShotListProps {
  session: ProductionSession
  initialShots: ProductionShot[]
}

export function ShotList({ session, initialShots }: ShotListProps) {
  const [currentSession, setCurrentSession] = useState(session)
  const [shots, setShots] = useState(initialShots)
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchError, setBatchError] = useState('')

  const totals = useMemo(() => {
    const generatedImages = shots.filter((shot) => shot.status === 'done')
    const imageCost = generatedImages.reduce(
      (sum, shot) => sum + Number(shot.cost_usd ?? 0),
      0
    )
    const videoCost = shots.reduce(
      (sum, shot) => sum + Number(shot.video_cost_usd ?? 0),
      0
    )
    return {
      generatedImages: generatedImages.length,
      imageCost,
      videoCost,
      total: imageCost + videoCost,
    }
  }, [shots])

  function replaceShot(nextShot: ProductionShot) {
    setShots((current) =>
      current.map((shot) => (shot.id === nextShot.id ? nextShot : shot))
    )
  }

  async function generateOne(shot: ProductionShot) {
    const prompt = shot.edited_prompt ?? shot.production_prompt
    replaceShot({ ...shot, status: 'generating', error_message: null })
    const res = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shotId: shot.id, prompt }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error ?? '生成失敗')
    }
    replaceShot(data.shot)
  }

  async function generateAllPending() {
    setBatchRunning(true)
    setBatchError('')
    try {
      const pending = shots.filter((shot) => shot.status === 'pending')
      for (const shot of pending) {
        await generateOne(shot)
      }
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : '批量生成失敗')
    } finally {
      setBatchRunning(false)
    }
  }

  return (
    <>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 12,
        }}
      >
        <div>
          <p style={{ fontSize: 12, color: '#5a5a72', margin: '0 0 4px' }}>
            SOON 創作工作台
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f0f0f5', margin: 0 }}>
            {currentSession.title ?? 'YouTube 製作工作台'}
          </h1>
          <p style={{ fontSize: 13, color: '#9090a8', margin: '4px 0 0' }}>
            AI 生成每個鏡頭嘅素材，直接用於剪片
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={batchRunning || !shots.some((shot) => shot.status === 'pending')}
            onClick={() => void generateAllPending()}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {batchRunning ? '生成中...' : '生成所有待處理鏡頭'}
          </button>
        </div>
      </header>

      <section className="panel row" style={{ width: '100%', justifyContent: 'flex-start' }}>
        <span className="meta">{currentSession.ai_shot_count ?? shots.length} 個 AI 鏡頭</span>
        <span className="meta">Images: ${totals.imageCost.toFixed(2)}</span>
        <span className="meta">Videos: ${totals.videoCost.toFixed(2)}</span>
        <span className="meta">Total: ${totals.total.toFixed(2)}</span>
        <span className="meta">已有圖片：{totals.generatedImages} 張</span>
        {currentSession.reference_image_url && (
          <span className="meta">Reference 圖像生成估算：~$0.06-0.10 / 張</span>
        )}
        {batchError && <p className="error" style={{ width: '100%', margin: 0 }}>{batchError}</p>}
      </section>

      <ArtDirectionPanel
        session={currentSession}
        onSessionChange={setCurrentSession}
      />
      <ReferenceImagePanel
        session={currentSession}
        onSessionChange={setCurrentSession}
      />

      <section className="shot-masonry">
        {shots.map((shot) => (
          <div key={shot.id} className="shot-masonry-item">
            <ShotCard
              shot={shot}
              referenceEnabled={Boolean(currentSession.reference_image_url)}
              onShotChange={replaceShot}
            />
          </div>
        ))}
      </section>
    </>
  )
}
