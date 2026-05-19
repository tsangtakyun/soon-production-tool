'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { getDefaultTitle, parseStoryboardJSON } from '@/lib/storyboard-parser'

export function JsonImporter() {
  const router = useRouter()
  const [rawJson, setRawJson] = useState<unknown | null>(null)
  const [fileName, setFileName] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)

  const parsed = useMemo(() => {
    if (!rawJson) return null
    try {
      return parseStoryboardJSON(rawJson)
    } catch {
      return null
    }
  }, [rawJson])

  async function readFile(file: File | undefined) {
    setError('')
    setRawJson(null)
    setFileName('')

    if (!file) return
    if (!file.name.endsWith('.json')) {
      setError('JSON 檔案無效')
      return
    }

    try {
      const text = await file.text()
      const json = JSON.parse(text)
      parseStoryboardJSON(json)
      setRawJson(json)
      setFileName(file.name)
      setTitle(getDefaultTitle(json))
    } catch (err) {
      setError(err instanceof SyntaxError ? 'JSON 檔案無效' : (err as Error).message)
    }
  }

  async function handleImport() {
    if (!rawJson) {
      setError('JSON 檔案無效')
      return
    }

    setImporting(true)
    setError('')

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawJson, title }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? '匯入失敗')
      }
      router.push(`/session/${data.sessionId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '匯入失敗')
    } finally {
      setImporting(false)
    }
  }

  return (
    <section className="panel stack" style={{ width: '100%', maxWidth: '100%' }}>
      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          void readFile(event.dataTransfer.files[0])
        }}
        style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: 220,
          border: '1px dashed var(--border)',
          borderRadius: 4,
          background: 'var(--surface-2)',
          cursor: 'pointer',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <input
          type="file"
          accept="application/json,.json"
          onChange={(event) => void readFile(event.target.files?.[0])}
          style={{ display: 'none' }}
        />
        <span>
          <strong>{fileName || '將 storyboard JSON 放到呢度'}</strong>
          <br />
          <small style={{ color: 'var(--text-secondary)' }}>
            {parsed
              ? `${parsed.aiShots.length} 個 AI generation 鏡頭準備好`
              : '點擊上載 .json'}
          </small>
        </span>
      </label>

      <label className="stack" style={{ gap: 8 }}>
        <span>Session 標題</span>
        <input
          value={title}
          placeholder="可留空"
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <div className="spread">
        <p className="meta" style={{ margin: 0 }}>
          {parsed
            ? `總共 ${parsed.shotCount} 個鏡頭 / ${parsed.aiShots.length} 個 AI 鏡頭`
            : '等待 JSON'}
        </p>
        <button type="button" disabled={!rawJson || importing} onClick={handleImport}>
          {importing ? '匯入中...' : '匯入'}
        </button>
      </div>

      {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
    </section>
  )
}
