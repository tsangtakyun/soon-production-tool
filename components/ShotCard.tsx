'use client'

import { useEffect, useRef, useState } from 'react'

import { GenerateButton } from '@/components/GenerateButton'
import { VideoSection } from '@/components/VideoSection'
import type { ProductionShot } from '@/types/storyboard'

interface ShotCardProps {
  shot: ProductionShot
  referenceEnabled: boolean
  onShotChange: (shot: ProductionShot) => void
}

const statusLabel: Record<ProductionShot['status'], string> = {
  pending: '準備好',
  generating: '生成中',
  done: '完成',
  error: '錯誤',
}

function getShotTitle(shot: ProductionShot) {
  return shot.shot_label ?? `鏡頭 ${shot.shot_index}`
}

export function ShotCard({ shot, referenceEnabled, onShotChange }: ShotCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [prompt, setPrompt] = useState(shot.edited_prompt ?? shot.production_prompt)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setPrompt(shot.edited_prompt ?? shot.production_prompt)
  }, [shot.edited_prompt, shot.production_prompt])

  async function savePrompt(nextPrompt = prompt) {
    if (shot.status !== 'pending') return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/shots/${shot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedPrompt: nextPrompt }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? '儲存失敗')
      onShotChange(data.shot)
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  async function generate() {
    setError('')
    onShotChange({ ...shot, status: 'generating', error_message: null })
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotId: shot.id, prompt }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? '生成失敗')
      onShotChange(data.shot)
    } catch (err) {
      const message = err instanceof Error ? err.message : '生成失敗'
      setError(message)
      onShotChange({ ...shot, status: 'error', error_message: message })
    }
  }

  async function resetAndGenerate() {
    setError('')
    const res = await fetch(`/api/shots/${shot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetStatus: true, editedPrompt: prompt }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      setError(data.error ?? '重設失敗')
      return
    }
    onShotChange(data.shot)
    await generate()
  }

  async function uploadShotImage(file: File | undefined) {
    setError('')
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('請上傳 JPG / PNG / WebP 圖片')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('圖片唔可以超過 10MB')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('shotId', shot.id)
      const res = await fetch('/api/upload-shot-image', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? '上傳失敗，請再試')
      }
      onShotChange(data.shot)
    } catch (err) {
      setError(err instanceof Error ? err.message : '上傳失敗，請再試')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function downloadImage() {
    const imageUrl = shot.manual_image_url ?? shot.generated_image_url
    if (!imageUrl) return
    const response = await fetch(imageUrl)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${getShotTitle(shot)}.png`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const isGenerating = shot.status === 'generating'
  const isDone = shot.status === 'done'
  const isError = shot.status === 'error'
  const imageUrl = shot.manual_image_url ?? shot.generated_image_url
  const activeError = error || shot.error_message

  return (
    <article className="shot-card stack" style={{ overflow: 'hidden' }}>
      {isDone && imageUrl ? (
        <img
          src={imageUrl}
          alt={getShotTitle(shot)}
          style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }}
        />
      ) : (
        <div
          style={{
            aspectRatio: '16 / 9',
            display: 'grid',
            placeItems: 'center',
            background: 'var(--surface)',
            color: isGenerating ? 'var(--status-generating)' : 'var(--muted)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {isGenerating ? '生成中...' : '等待生成'}
        </div>
      )}

      <div className="stack" style={{ padding: 16 }}>
        <div className="spread">
          <strong>
            {getShotTitle(shot)}
            <span className="meta" style={{ marginLeft: 8 }}>
              #{shot.shot_index}
            </span>
          </strong>
          <span
            className="meta"
            style={{
              color: isError
                ? 'var(--status-error)'
                : isDone
                  ? 'var(--status-done)'
                  : isGenerating
                    ? 'var(--status-generating)'
                    : 'var(--text-secondary)',
            }}
          >
            {statusLabel[shot.status]}
          </span>
        </div>

        {isDone && (
          <p className="meta" style={{ margin: 0 }}>
            {shot.manual_image_url ? '自己上傳嘅圖片' : 'AI 生成圖片'}
          </p>
        )}

        <label className="stack" style={{ gap: 8 }}>
          <span>生成提示詞</span>
          <textarea
            value={prompt}
            disabled={shot.status !== 'pending'}
            onBlur={() => void savePrompt()}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>

        <div className="spread">
          <p className="meta" style={{ margin: 0 }}>
            {saving
              ? '儲存中...'
              : isDone
                ? referenceEnabled && !shot.manual_image_url
                  ? '~$0.06-0.10'
                  : shot.manual_image_url
                    ? 'Manual image'
                    : '$0.04'
                : '準備好'}
          </p>
          <div className="row">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={(event) => void uploadShotImage(event.target.files?.[0])}
            />
            {isDone && (
              <>
                <button type="button" onClick={() => void downloadImage()}>
                  下載圖片
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? '上傳中...' : '更換圖片'}
                </button>
                {!shot.manual_image_url && (
                  <GenerateButton
                    label="重新生成圖片"
                    onClick={() => void resetAndGenerate()}
                  />
                )}
              </>
            )}
            {(shot.status === 'pending' || isError) && (
              <>
                <GenerateButton
                  label={isError ? '重試生成圖片' : '生成圖片'}
                  generating={isGenerating}
                  onClick={() => void generate()}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? '上傳中...' : '上傳圖片'}
                </button>
              </>
            )}
          </div>
        </div>

        {activeError && <p className="error" style={{ margin: 0 }}>{activeError}</p>}

        {isDone && imageUrl && <VideoSection shot={shot} onShotChange={onShotChange} />}
      </div>
    </article>
  )
}
