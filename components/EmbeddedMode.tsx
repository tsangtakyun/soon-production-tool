'use client'

import { useEffect } from 'react'

import { getSupabaseBrowser } from '@/lib/supabase'

export function EmbeddedMode() {
  useEffect(() => {
    const isEmbedded = new URLSearchParams(window.location.search).get('embedded') === 'true'
    document.body.classList.toggle('embedded', isEmbedded)

    const receiveAuth = async (event: MessageEvent) => {
      if (event.data?.type !== 'SOON_AUTH') return
      const { accessToken, refreshToken } = event.data
      if (!accessToken || !refreshToken) return

      try {
        const supabase = getSupabaseBrowser()
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
      } catch {
        // Auth handoff is best-effort; production APIs currently use server credentials.
      }
    }

    window.addEventListener('message', receiveAuth)

    try {
      window.parent?.postMessage({ type: 'SOON_TOOL_READY' }, '*')
    } catch {
      // Ignore if the tool is opened standalone.
    }

    return () => {
      window.removeEventListener('message', receiveAuth)
      document.body.classList.remove('embedded')
    }
  }, [])

  return null
}
