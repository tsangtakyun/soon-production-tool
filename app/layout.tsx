import './globals.css'

import { EmbeddedMode } from '@/components/EmbeddedMode'

export const metadata = {
  title: 'SOON 製作工具',
  description: 'Storyboard 製作圖像生成工具',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/soon-design-system.css" />
      </head>
      <body>
        <EmbeddedMode />
        {children}
      </body>
    </html>
  )
}
