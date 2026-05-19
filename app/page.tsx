'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { JsonImporter } from '@/components/JsonImporter'

function ProgressBar() {
  const labels = ['題材工作台', '劇本工作台', '分鏡工作台', '製作工作台']

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
      {labels.map((label, index) => (
        <div key={label} style={{ display: 'contents' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: index === 3 ? '#7c5cfc' : 'transparent',
                border: index === 3 ? 'none' : '1px solid #3a3a50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                color: index === 3 ? 'white' : '#5a5a72',
                fontWeight: index === 3 ? 600 : 400,
                flexShrink: 0,
              }}
            >
              {index + 1}
            </div>
            <span
              style={{
                fontSize: 12,
                color: index === 3 ? '#f0f0f5' : '#5a5a72',
                fontWeight: index === 3 ? 500 : 400,
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          </div>
          {index < labels.length - 1 && (
            <div style={{ flex: 1, height: 1, background: '#2a2a3a' }} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasStoryboardId, setHasStoryboardId] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const storyboardId = params.get('storyboardId')
    if (!storyboardId) return

    setHasStoryboardId(true)

    const autoLoad = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/load-from-storyboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storyboardId }),
        })
        const data = await res.json()

        if (data.sessionId) {
          router.push(`/session/${data.sessionId}`)
          return
        }

        setError(data.error || '載入失敗，請重試')
      } catch {
        setError('載入失敗，請重試')
      } finally {
        setLoading(false)
      }
    }

    void autoLoad()
  }, [router])

  if (loading || hasStoryboardId) {
    return (
      <main
        className="shell stack"
        style={{ width: '100%', maxWidth: '100%', padding: 24, margin: 0 }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            flexDirection: 'column',
            gap: 16,
            textAlign: 'center',
          }}
        >
          <p style={{ color: error ? '#ef4444' : '#9090a8', fontSize: 14, margin: 0 }}>
            {error || '正在載入分鏡資料...'}
          </p>
          {error && (
            <button type="button" onClick={() => setHasStoryboardId(false)}>
              手動匯入 Storyboard JSON
            </button>
          )}
        </div>
      </main>
    )
  }

  return (
    <main
      className="shell stack"
      style={{ width: '100%', maxWidth: '100%', padding: 24, margin: 0 }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
        }}
      >
        <div>
          <p style={{ fontSize: 12, color: '#5a5a72', margin: '0 0 4px' }}>
            SOON 創作工作台
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f0f0f5', margin: 0 }}>
            YouTube 製作工作台
          </h1>
          <p style={{ fontSize: 13, color: '#9090a8', margin: '4px 0 0' }}>
            AI 生成每個鏡頭嘅素材，直接用於剪片
          </p>
        </div>
      </header>

      <div
        style={{
          width: '100%',
          height: 120,
          background: 'linear-gradient(135deg, #0d0d1a 0%, #1a1030 40%, #0a1628 100%)',
          borderRadius: 12,
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.2em',
            margin: 0,
          }}
        >
          YOUTUBE PRODUCTION
        </p>
      </div>

      <ProgressBar />

      <section
        style={{
          background: '#16161f',
          border: '1px solid #2a2a3a',
          borderRadius: 12,
          padding: 24,
          textAlign: 'left',
          width: '100%',
        }}
      >
        <p style={{ color: '#9090a8', fontSize: 13, margin: '0 0 16px' }}>
          或手動匯入 Storyboard JSON
        </p>
        <JsonImporter />
      </section>
    </main>
  )
}
