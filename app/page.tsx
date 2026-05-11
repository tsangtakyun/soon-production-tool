import { JsonImporter } from '@/components/JsonImporter'

export default function HomePage() {
  return (
    <main className="shell stack">
      <header className="stack" style={{ gap: 10 }}>
        <p className="kicker">SOON 製作工具</p>
        <h1 className="display">Storyboard 圖像生成</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 720 }}>
          匯入 storyboard JSON，篩出 AI generation 鏡頭，確認提示詞後用
          fal.ai GPT Image 2 生成製作預覽圖。
        </p>
      </header>
      <JsonImporter />
    </main>
  )
}
