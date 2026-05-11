# SOON Production Tool — Cycle 4 Report

Date: 2026-05-11
Repo: soon-production-tool
Status: Implemented locally

## Section A — File Changes

Modified:
- `components/VideoSection.tsx`
- `app/api/generate-video/route.ts`
- `app/api/shots/[id]/route.ts`
- `types/storyboard.ts`

Added:
- `supabase/migrations/2026-05-11_production_shots_audio.sql`

## Section B — Discovery

fal.ai official API page confirms the Kling 2.6 Pro image-to-video endpoint:
- Endpoint: `fal-ai/kling-video/v2.6/pro/image-to-video`
- Audio parameter: `generate_audio`
- Audio description: no separate audio prompt field in schema, so Cycle 4 injects audio description into the main `prompt` as an `Audio:` section.
- The official schema says `generate_audio` defaults to `true`; the app explicitly sends `generate_audio: false` when audio prompt is empty to preserve Cycle 3 behavior.
- Duration remains enum `5` or `10`.
- Output remains `video.url`.

Pricing discovery:
- fal listing/search result states Kling 2.6 Pro is `$0.07/sec` audio off and `$0.14/sec` audio on.

## Section C — Feature Implementation

Implemented:
- Audio Description textarea in `VideoSection`.
- Audio preset buttons:
  - 街市環境音
  - 廚房聲
  - 靜音 B-roll
- Empty audio prompt keeps audio disabled.
- Non-empty audio prompt enables `generate_audio: true`.
- Final Kling prompt combines motion prompt plus `Audio: ...`.
- Video cost now uses:
  - `$0.07/sec` without audio
  - `$0.14/sec` with audio
- Done state displays `（含 Audio）` when applicable.
- Regenerate/reset preserves editable motion and audio prompts.

## Section D — Dependencies

No new dependency added.

## Section E — Verification

Passed:
- `npm run build`
- `.next/static` contains no `FAL_KEY`
- Local dev server restarted on `http://localhost:3010`

Not run from Codex shell:
- Hosted Supabase migration apply, because Supabase CLI is not available in this environment.
- Manual audio generation/listen test, because it should be triggered by Tommy with selected shot/reference.

## Section F — Out of Scope

Kept out:
- Custom voice cloning
- Narration/dialogue workflow
- Audio-only regenerate
- Batch audio generation
- Audio level/mixing control

## Section G — IP Boundary

No Layer 2 framework data added.
Audio prompt is user-entered production data.
Kling audio/video generation remains inside production tooling only.
