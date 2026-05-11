# SOON Production Tool

Cycle 1 production image generator for storyboard JSON exports.

## Setup

1. Apply `supabase/migrations/2026-05-11_production_sessions_and_shots.sql`.
2. Copy `.env.local.example` to `.env.local`.
3. Fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FAL_KEY`
4. Run `npm run dev`.

## Cycle 1 Scope

Import `soon-storyboard-youtube` JSON exports, filter `footageSourceSlug === "ai_generation"`, approve prompts, generate square GPT Image 2 previews through fal.ai, preview, download, retry, and regenerate.
