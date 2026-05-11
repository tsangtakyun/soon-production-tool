'use client'

import { useMemo, useState } from 'react'

import type { ProductionSession } from '@/types/storyboard'

const STYLE_PREFIXES = {
  Documentary:
    '35mm documentary photography, natural available light only, slight film grain, muted and slightly desaturated colour palette, imperfect hand-held composition, visible environmental texture, no studio lighting, no artificial fill, shot on location, photojournalism aesthetic, believable mundane detail --',
  Editorial:
    'medium format editorial photography, controlled natural light, clean negative space, precise composition, muted tones with selective contrast, minimal post-processing feel, magazine-quality but not commercial, no CGI feel --',
  Cinematic:
    'anamorphic lens, cinematic colour grade, shallow depth of field, motivated practical lighting, film-like contrast, subtle lens flare, intentional shadow detail, no oversaturation, mood-driven composition --',
} as const

type StyleName = keyof typeof STYLE_PREFIXES

const STYLE_LABELS: Record<StyleName, string> = {
  Documentary: '紀實',
  Editorial: '編輯',
  Cinematic: '電影感',
}

const STYLE_SUMMARIES: Record<StyleName, string> = {
  Documentary:
    '35mm 紀實攝影、自然現場光、微粒感、低飽和色調、手持構圖同真實環境質感',
  Editorial:
    '中片幅 editorial 攝影、自然受控光線、乾淨留白、精準構圖同雜誌式質感',
  Cinematic:
    'anamorphic 鏡頭感、電影調色、淺景深、實景動機光、陰影層次同情緒構圖',
}

interface ArtDirectionPanelProps {
  session: ProductionSession
  onSessionChange: (session: ProductionSession) => void
}

function inferStyle(prefix: string | null): StyleName {
  if (!prefix) return 'Documentary'
  const match = Object.entries(STYLE_PREFIXES).find(([, value]) => value === prefix)
  return (match?.[0] as StyleName | undefined) ?? 'Documentary'
}

export function ArtDirectionPanel({
  session,
  onSessionChange,
}: ArtDirectionPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [style, setStyle] = useState<StyleName>(() =>
    inferStyle(session.art_direction_prefix)
  )
  const [prefix, setPrefix] = useState(
    session.art_direction_prefix ?? STYLE_PREFIXES.Documentary
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const summary = useMemo(() => {
    const currentStyle = inferStyle(session.art_direction_prefix)
    return STYLE_SUMMARIES[currentStyle]
  }, [session.art_direction_prefix])

  function chooseStyle(nextStyle: StyleName) {
    if (prefix !== STYLE_PREFIXES[style]) {
      const ok = window.confirm('覆蓋你嘅自定內容？')
      if (!ok) return
    }
    setStyle(nextStyle)
    setPrefix(STYLE_PREFIXES[nextStyle])
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artDirectionPrefix: prefix }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? '儲存 Art Direction 失敗')
      }
      onSessionChange(data.session)
      setExpanded(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存 Art Direction 失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel stack">
      <div className="spread">
        <div>
          <p className="kicker">美術方向</p>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>
            {STYLE_LABELS[style]} · {summary}
          </p>
        </div>
        <button type="button" onClick={() => setExpanded((value) => !value)}>
          {expanded ? '收起' : '編輯'}
        </button>
      </div>

      {expanded && (
        <div className="stack">
          <div className="row">
            {(Object.keys(STYLE_PREFIXES) as StyleName[]).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => chooseStyle(name)}
                style={{
                  borderColor: style === name ? 'var(--accent)' : 'var(--border)',
                  color: style === name ? 'var(--accent)' : 'var(--text-primary)',
                }}
              >
                {STYLE_LABELS[name]}
              </button>
            ))}
          </div>
          <label className="stack" style={{ gap: 8 }}>
            <span>英文 Style Prefix（生成時使用）</span>
            <textarea value={prefix} onChange={(event) => setPrefix(event.target.value)} />
          </label>
          <div className="spread">
            <p className="meta" style={{ margin: 0 }}>
              生成時會將呢段英文 prefix 加喺每個 shot prompt 前面。
            </p>
            <button type="button" disabled={saving} onClick={() => void save()}>
              {saving ? '儲存中...' : '儲存'}
            </button>
          </div>
          {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
        </div>
      )}
    </section>
  )
}
