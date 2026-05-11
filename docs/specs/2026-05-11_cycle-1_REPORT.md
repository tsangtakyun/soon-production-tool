# SOON Production Tool Cycle 1 Report

> Date: 2026-05-11
> Repo: `soon-production-tool`
> Branch: `codex/cycle-1-production-tool`

## Section A

Implemented new Next.js App Router repo with:

| Area | Files |
|---|---|
| App shell | `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/session/[id]/page.tsx` |
| API routes | `app/api/sessions/route.ts`, `app/api/generate-image/route.ts`, `app/api/shots/[id]/route.ts` |
| Components | `components/JsonImporter.tsx`, `components/ShotList.tsx`, `components/ShotCard.tsx`, `components/GenerateButton.tsx` |
| Lib/types | `lib/storyboard-parser.ts`, `lib/supabase.ts`, `lib/supabase-server.ts`, `lib/fal.ts`, `types/storyboard.ts` |
| Supabase | `supabase/migrations/2026-05-11_production_sessions_and_shots.sql` |
| Config/docs | `package.json`, `tsconfig.json`, `.env.local.example`, `README.md`, `node.cmd` |

## Section B

Discovery was completed against `C:\Users\user\Desktop\SOON\soon-storyboard-youtube`.

Actual JSON export schema is defined in `lib/storyboard-export.ts`.

Confirmed field names:

| Spec memory | Actual export field |
|---|---|
| `footage_source` / possible `footage_source_slug` | `footageSourceSlug` |
| `production_prompt` | `productionPrompt` |
| shot number / label | no explicit label; use `displayOrder + 1` as `Shot N` |

Divergence handled:

- Parser uses actual camelCase schema as primary source.
- Parser keeps legacy fallback support for `footage_source`, `footage_source_slug`, and `production_prompt`.
- Non-`ai_generation` shots may have `productionPrompt: null`; parser validates the field exists but only requires non-empty prompt for `ai_generation` shots.
- Manual test discovery on 2026-05-11 found real `ai_generation` shots can also have `productionPrompt: null`. Parser now falls back to `visualInstruction`, then `description`, then `scriptExcerpt`, so the user can edit/approve the prompt inside the production tool instead of blocking import.

Design discovery:

- Current storyboard repo uses dark blue utility styling with CSS variables in `app/globals.css`, not the older EB Garamond cream system.
- New repo follows the Cycle 1 dark editorial spec, with sharp 4px cards, dark placeholder pending state, full-card generated image preview, Cormorant Garamond display, and IBM Plex Mono UI text.

fal.ai discovery:

- Official current text-to-image endpoint is `openai/gpt-image-2`.
- `@fal-ai/client` is the active JS client.
- fal schema exposes `quality: low | medium | high | auto`; it does not expose `standard`. Implementation uses `medium` while keeping Cycle 1 cost display hardcoded at `$0.04`.

## Section C

Implemented:

- Home JSON import with file picker / drag drop, optional session title, validation messages, and redirect after session creation.
- Import filtering for `footageSourceSlug === "ai_generation"`.
- Missing AI `productionPrompt` fallback to storyboard visual fields.
- Supabase-backed session and shot creation.
- Session page with title, AI shot count, total generated cost, and sequential `Generate All Pending`.
- Shot state machine: `pending -> generating -> done`, with `error` retry path.
- Pending prompt inline editing persisted to `edited_prompt`.
- Generation uses `edited_prompt ?? production_prompt`.
- Done state displays full-width generated image preview, cost, regenerate, and download.
- Server-side generation guard rejects double generation unless status is `pending` or `error`.

## Section D

Dependencies installed:

- `next@14.2.35`
- `@fal-ai/client`
- `@supabase/supabase-js`
- `react`, `react-dom`
- `typescript`, `tailwindcss`, React/Node types

Env vars documented in `.env.local.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FAL_KEY`

Note: npm audit still reports Next.js high and PostCSS moderate advisories that require a breaking Next 16 upgrade according to the current registry. Cycle 1 stayed on patched Next 14.x to satisfy the spec.

Local Windows note: `node.cmd` is included because this machine resolves bare `node` to a WindowsApps shim that returns Access denied. The shim is ignored on Linux/Vercel, where normal `node` resolution applies.

## Section E

Verification completed:

- `npm run build` passed with Next 14.2.35.
- Home route smoke test returned HTTP 200 on `http://localhost:3010/`.
- API validation for 0 AI shots returned expected message: `呢個 storyboard 冇 AI generation shots，請確認 footage source 設定`.
- `.next/static` search found no `FAL_KEY`.
- `.next/static` search found no `SUPABASE_SERVICE_ROLE_KEY`.

Not fully verified locally due missing runtime secrets / deployed DB:

- Valid storyboard import into Supabase.
- Prompt edit persistence into live DB.
- Real fal.ai generation, preview, retry, regenerate, and image download.
- End-to-end Generate All Pending against real Supabase records.

These are ready for the Manual Test Protocol after applying the migration and env vars.

2026-05-11 manual correction: image generation output changed from Cycle 1 spec square preview to `landscape_16_9` because SOON YouTube storyboard production assets should be 16:9. fal.ai documents `landscape_16_9` as 1024x576 for GPT Image 2.

2026-05-11 manual test result: Cycle 1 succeeded after patching the following manual-test findings:

- UI and primary validation errors changed to Traditional Chinese.
- `ai_generation` shots with `productionPrompt: null` now receive an English production prompt fallback built from `subjectReference`, `scriptPartRole`, `visualModeSlug`, `contentTypeSlug`, and duration.
- fal timeout increased from 30 seconds to 180 seconds because GPT Image 2 generation observed around 88 seconds in manual testing.
- Output changed to 16:9 via `image_size: "landscape_16_9"`.
- Regenerate now allows `done` shots and only rejects shots already in `generating`.
- Manual generation, preview, regenerate, and 16:9 output succeeded.

## Section F

Out of scope respected:

- No image-to-video.
- No style reference image system.
- No Kling elements system.
- No parallel batch generation.
- No auth/login.
- No session history page.
- No cross-repo API call.
- No budget cap / alert.

## Section G

IP boundary maintained:

- This repo only consumes storyboard production prompts.
- It does not codify Layer 2 framework/template data.
- No Layer 5 material is exposed.
- fal/GPT Image 2 output handling is limited to generated image URL storage, preview, cost display, and download.
