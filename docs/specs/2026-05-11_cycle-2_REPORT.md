# SOON Production Tool Cycle 2 Report

> Date: 2026-05-11
> Repo: `soon-production-tool`
> Branch: `codex/cycle-1-production-tool`
> Depends on: Cycle 1 shipped

## Section A

Files changed:

| Area | Files |
|---|---|
| Session UI | `components/ArtDirectionPanel.tsx`, `components/ReferenceImagePanel.tsx`, `components/ShotList.tsx`, `components/ShotCard.tsx` |
| API | `app/api/generate-image/route.ts`, `app/api/upload-reference/route.ts`, `app/api/sessions/[id]/route.ts` |
| fal wrapper | `lib/fal.ts` |
| Types | `types/storyboard.ts` |
| Supabase | `supabase/migrations/2026-05-11_production_session_art_reference.sql` |

Migration:

```sql
alter table public.production_sessions
  add column if not exists art_direction_prefix text,
  add column if not exists reference_image_url text;

notify pgrst, 'reload schema';
```

## Section B

B.1: Existing Cycle 1 route was read before extension. The route now still validates `shotId`, reads the shot server-side, blocks only `generating`, and then reads session-level settings server-side before calling fal.

B.2: fal.ai `openai/gpt-image-2/edit` discovery confirmed:

- Input uses `image_urls: string[]`.
- Input uses `prompt`.
- `image_size` supports `landscape_16_9`.
- Default `image_size` is `auto`.

Decision: **Option A**. The implementation forces `image_size: "landscape_16_9"` for both text-to-image and edit endpoint. Reason: SOON YouTube production still needs 16:9 output, and fal explicitly supports `landscape_16_9` for the edit endpoint, so no reference crop UI is needed in Cycle 2.

B.3: fal storage discovery confirmed `fal.storage.upload(file)` accepts a server-side Blob/File and returns a storage URL. `POST /api/upload-reference` performs this server-side so `FAL_KEY` stays out of the client bundle.

Sources:

- https://fal.ai/models/openai/gpt-image-2/edit/api
- https://docs.fal.ai/api-reference/client-libraries/javascript/storage

## Section C

Implemented:

- Session header now followed by `ArtDirectionPanel` and `ReferenceImagePanel`.
- `ArtDirectionPanel` supports Documentary / Editorial / Cinematic presets, editable prefix, overwrite confirm, save, and collapsed preview.
- `ReferenceImagePanel` supports JPG / PNG / WebP upload, 10MB validation, preview, save, replace, and confirm clear.
- New `PATCH /api/sessions/[id]` updates `art_direction_prefix` and `reference_image_url`.
- New `POST /api/upload-reference` uploads to fal storage.
- `generate-image` now builds `finalPrompt = art_direction_prefix + prompt` when prefix exists.
- `generate-image` uses `openai/gpt-image-2/edit` with `image_urls` when session has `reference_image_url`; otherwise uses Cycle 1 text-to-image.
- Cost label shows `~$0.06-0.10` when a reference image is active; otherwise `$0.04`.

## Section D

No new dependency. Existing `@fal-ai/client` is used for both generation and storage upload.

## Section E

Verification completed:

- `npm run build` passed.
- Migration applied manually in Supabase SQL Editor and new columns are readable.
- `PATCH /api/sessions/[id]` smoke test passed for save and clear.
- `FAL_KEY` not found in `.next/static`.
- `reference_image_url` not found in `.next/static`.
- Dev server restarted on `http://localhost:3010` and returned HTTP 200.

Pending manual verification:

- Upload a real reference image through the UI.
- Save reference URL and verify thumbnail.
- Generate with reference and compare subject consistency.
- Clear reference and verify text-to-image fallback.

## Section F

Out of scope preserved:

- Image-to-video.
- Per-shot reference image.
- Exact token cost.
- Reference crop / resize UI.
- Multiple reference images.
- Batch style regenerate.
- Auth / login.

## Section G

IP boundary maintained:

- No Layer 2 framework data is codified.
- User-provided reference image is uploaded to fal storage and stored as session-level URL in Supabase.
- Secret `FAL_KEY` remains server-side.
- `reference_image_url` is not bundled into frontend static assets; UI receives session state at runtime only.
- No Layer 5 exposure.
