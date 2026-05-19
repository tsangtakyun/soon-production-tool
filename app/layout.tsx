import './globals.css'

import { EmbeddedMode } from '@/components/EmbeddedMode'

export const metadata = {
  title: 'SOON Production',
  description: 'YouTube 製作工作台',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-HK">
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
