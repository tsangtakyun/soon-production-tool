'use client'

import { useEffect, useState } from 'react'

import { generateVideoFilename } from '@/lib/filename'
import type { ProductionShot } from '@/types/storyboard'

interface VideoSectionProps {
  shot: ProductionShot
  onShotChange: (shot: ProductionShot) => void
}

const motionPresets = {
  'Slow push in':
    'Camera slowly pushes in toward the subject, subtle depth of field, natural ambient movement only',
  'Gentle overhead':
    'Gentle overhead pull-back, subject remains centered, soft natural lighting, no sudden motion',
  'Rack focus':
    'Static camera, smooth rack focus from foreground to subject, background softly blurs, minimal motion',
}

const audioPresets = {
  街市環境音:
    'busy hawker centre ambient, distant chatter, cutlery clinking, ventilation hum, no music, no narration',
  廚房聲:
    'commercial kitchen ambience, wok sizzle, chopping sounds, flame under burner, no music',
  '靜音 B-roll':
    'minimal ambient room tone only, no dialogue, no music, subtle background presence',
}

function getVideoCost(duration: 5 | 10, audioEnabled: boolean) {
  return duration * (audioEnabled ? 0.14 : 0.07)
}

export function VideoSection({ shot, onShotChange }: VideoSectionProps) {
  const [motionPrompt, setMotionPrompt] = useState(shot.motion_prompt ?? '')
  const [audioPrompt, setAudioPrompt] = useState(shot.audio_prompt ?? '')
  const [duration, setDuration] = useState<5 | 10>(
    shot.video_duration === 10 ? 10 : 5
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setMotionPrompt(shot.motion_prompt ?? '')
    setAudioPrompt(shot.audio_prompt ?? '')
    setDuration(shot.video_duration === 10 ? 10 : 5)
  }, [shot.motion_prompt, shot.audio_prompt, shot.video_duration])

  async function savePrompts(
    nextMotionPrompt = motionPrompt,
    nextAudioPrompt = audioPrompt
  ) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/shots/${shot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motionPrompt: nextMotionPrompt,
          audioPrompt: nextAudioPrompt,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? '儲存 prompt 失敗')
      }
      onShotChange(data.shot)
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存 prompt 失敗')
    } finally {
      setSaving(false)
    }
  }

  async function generateVideo() {
    setError('')
    onShotChange({ ...shot, video_status: 'generating', video_error_message: null })
    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shotId: shot.id,
          motionPrompt,
          audioPrompt,
          duration,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Video 生成失敗')
      }
      onShotChange(data.shot)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Video 生成失敗'
      setError(message)
      onShotChange({
        ...shot,
        video_status: 'error',
        video_error_message: message,
      })
    }
  }

  async function resetVideo() {
    setError('')
    const res = await fetch(`/api/shots/${shot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoStatus: 'idle',
        motionPrompt,
        audioPrompt,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      setError(data.error ?? '重設 video 狀態失敗')
      return
    }
    onShotChange(data.shot)
  }

  async function downloadVideo() {
    if (!shot.video_url) return
    const response = await fetch(shot.video_url)
    if (!response.ok) {
      setError('下載 MP4 失敗')
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = generateVideoFilename(shot.shot_index, shot.shot_label)
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function insertMotionPreset(text: string) {
    setMotionPrompt((current) => (current ? `${current}\n${text}` : text))
  }

  function insertAudioPreset(text: string) {
    setAudioPrompt((current) => (current ? `${current}\n${text}` : text))
  }

  const activeError = error || shot.video_error_message
  const isGenerating = shot.video_status === 'generating'
  const isDone = shot.video_status === 'done' && shot.video_url
  const audioEnabled = Boolean(audioPrompt.trim())
  const previewCost = getVideoCost(duration, audioEnabled)

  return (
    <section
      className="stack"
      style={{
        borderTop: '1px solid var(--border)',
        paddingTop: 14,
      }}
    >
      <div className="spread">
        <strong>Video</strong>
        <span className="meta">
          {shot.video_status === 'generating'
            ? '生成中'
            : shot.video_status === 'done'
              ? '已完成'
              : shot.video_status === 'error'
                ? '錯誤'
                : '未生成'}
        </span>
      </div>

      {isDone ? (
        <>
          <video
            src={shot.video_url ?? undefined}
            controls
            style={{ width: '100%', aspectRatio: '16 / 9', background: '#000' }}
          />
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            {shot.motion_prompt}
          </p>
          {shot.audio_prompt && (
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Audio: {shot.audio_prompt}
            </p>
          )}
          {!shot.audio_enabled && (
            <p className="meta" style={{ margin: 0 }}>
              Audio：未啟用。要有聲請重新生成並填 Audio Description。
            </p>
          )}
          <div className="spread">
            <span className="meta">
              Video: ${Number(shot.video_cost_usd ?? 0).toFixed(2)}
              {shot.audio_enabled ? '（含 Audio）' : ''}
            </span>
            <div className="row">
              <button type="button" onClick={() => void resetVideo()}>
                {shot.audio_enabled ? '重新生成' : '加 Audio 重新生成'}
              </button>
              <button type="button" onClick={() => void downloadVideo()}>
                下載 MP4
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <label className="stack" style={{ gap: 8 }}>
            <span>Motion Prompt</span>
            <textarea
              value={motionPrompt}
              disabled={isGenerating}
              placeholder="slow push in toward the curry bowl, steam gently rising, shallow depth of field"
              onBlur={() => void savePrompts()}
              onChange={(event) => setMotionPrompt(event.target.value)}
            />
          </label>
          <div className="row">
            {Object.entries(motionPresets).map(([label, text]) => (
              <button
                key={label}
                type="button"
                disabled={isGenerating}
                onClick={() => insertMotionPreset(text)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="stack" style={{ gap: 8 }}>
            <span>
              Audio Description（可選）
              <span style={{ marginLeft: 8, textTransform: 'none' }}>
                有填則加入 ambient sound，費用 $0.14/秒
              </span>
            </span>
            <textarea
              value={audioPrompt}
              disabled={isGenerating}
              placeholder="sizzling curry in wok, busy hawker centre ambient noise, distant chatter, no music"
              onBlur={() => void savePrompts()}
              onChange={(event) => setAudioPrompt(event.target.value)}
            />
          </label>
          <div className="row">
            {Object.entries(audioPresets).map(([label, text]) => (
              <button
                key={label}
                type="button"
                disabled={isGenerating}
                onClick={() => insertAudioPreset(text)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="row">
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => setDuration(5)}
              style={{
                borderColor: duration === 5 ? 'var(--accent)' : 'var(--border)',
                color: duration === 5 ? 'var(--accent)' : 'var(--text-primary)',
              }}
            >
              5 秒
            </button>
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => setDuration(10)}
              style={{
                borderColor: duration === 10 ? 'var(--accent)' : 'var(--border)',
                color: duration === 10 ? 'var(--accent)' : 'var(--text-primary)',
              }}
            >
              10 秒
            </button>
          </div>
          <div className="spread">
            <span className="meta">
              {saving
                ? '儲存中...'
                : isGenerating
                  ? '生成中，約 3-5 分鐘...'
                  : `預估成本：$${previewCost.toFixed(2)}${audioEnabled ? '（含 Audio）' : ''}`}
            </span>
            <div className="row">
              {shot.video_status === 'error' && (
                <button type="button" onClick={() => void resetVideo()}>
                  重試前先重設
                </button>
              )}
              <button
                type="button"
                disabled={isGenerating || !motionPrompt.trim()}
                onClick={() => void generateVideo()}
              >
                {isGenerating ? '生成中...' : '生成 Video'}
              </button>
            </div>
          </div>
        </>
      )}

      {activeError && <p className="error" style={{ margin: 0 }}>{activeError}</p>}
    </section>
  )
}
