'use client'

import { useState } from 'react'

import type { ProductionSession } from '@/types/storyboard'

interface ReferenceImagePanelProps {
  session: ProductionSession
  onSessionChange: (session: ProductionSession) => void
}

export function ReferenceImagePanel({
  session,
  onSessionChange,
}: ReferenceImagePanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState(session.reference_image_url ?? '')
  const [fileName, setFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function upload(file: File | undefined) {
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
      const res = await fetch('/api/upload-reference', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? '上傳失敗，請再試')
      }
      setUploadedUrl(data.url)
      setFileName(file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : '上傳失敗，請再試')
    } finally {
      setUploading(false)
    }
  }

  async function save(nextUrl = uploadedUrl) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceImageUrl: nextUrl || null }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? '儲存 Reference Image 失敗')
      }
      onSessionChange(data.session)
      setExpanded(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存 Reference Image 失敗')
    } finally {
      setSaving(false)
    }
  }

  async function clear() {
    const ok = window.confirm(
      '移除 reference image 後，新生成嘅 shots 唔會有 subject anchor。已生成嘅 images 唔受影響。確認移除？'
    )
    if (!ok) return
    setUploadedUrl('')
    setFileName('')
    await save('')
  }

  const currentUrl = session.reference_image_url

  return (
    <section className="panel stack">
      <div className="spread">
        <div>
          <p className="kicker">Reference Image</p>
          {currentUrl ? (
            <div className="row" style={{ marginTop: 8 }}>
              <img
                src={currentUrl}
                alt="Reference"
                style={{
                  width: 96,
                  aspectRatio: '16 / 9',
                  objectFit: 'cover',
                  border: '1px solid var(--border)',
                }}
              />
              <span className="meta">{fileName || '已設定 subject anchor'}</span>
            </div>
          ) : (
            <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>
              未設定 reference image
            </p>
          )}
        </div>
        <div className="row">
          {currentUrl && (
            <button type="button" onClick={() => void clear()}>
              移除
            </button>
          )}
          <button type="button" onClick={() => setExpanded((value) => !value)}>
            {expanded ? '收起' : currentUrl ? '更換' : '+ 加入 Reference Image'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="stack">
          <label
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              void upload(event.dataTransfer.files[0])
            }}
            style={{
              display: 'grid',
              placeItems: 'center',
              minHeight: 180,
              border: '1px dashed var(--border)',
              borderRadius: 4,
              background: 'var(--surface-2)',
              cursor: 'pointer',
              textAlign: 'center',
              padding: 20,
            }}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => void upload(event.target.files?.[0])}
              style={{ display: 'none' }}
            />
            <span>
              <strong>{uploading ? '上傳中...' : fileName || '點擊或拖放圖片上傳'}</strong>
              <br />
              <small style={{ color: 'var(--text-secondary)' }}>
                JPG / PNG / WebP，最大 10MB
              </small>
            </span>
          </label>

          {uploadedUrl && (
            <img
              src={uploadedUrl}
              alt="Uploaded reference"
              style={{
                width: '100%',
                maxWidth: 360,
                aspectRatio: '16 / 9',
                objectFit: 'cover',
                border: '1px solid var(--border)',
              }}
            />
          )}

          <div className="spread">
            <p className="meta" style={{ margin: 0 }}>
              有 reference 時，生成會改用 GPT Image 2 edit endpoint
            </p>
            <button
              type="button"
              disabled={!uploadedUrl || saving || uploading}
              onClick={() => void save()}
            >
              {saving ? '儲存中...' : '儲存'}
            </button>
          </div>
          {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
        </div>
      )}
    </section>
  )
}
