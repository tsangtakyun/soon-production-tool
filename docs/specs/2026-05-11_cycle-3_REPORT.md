# SOON Production Tool Cycle 3 Report

> Date: 2026-05-11
> Repo: `soon-production-tool`
> Branch: `codex/cycle-1-production-tool`
> Depends on: Cycle 1 and Cycle 2

## Section A

Files changed:

| Area | Files |
|---|---|
| Shot UI | `components/ShotCard.tsx`, `components/VideoSection.tsx`, `components/ShotList.tsx` |
| API | `app/api/upload-shot-image/route.ts`, `app/api/generate-video/route.ts`, `app/api/shots/[id]/route.ts` |
| Types | `types/storyboard.ts` |
| Supabase | `supabase/migrations/2026-05-11_production_shots_video.sql` |

Migration:

```sql
alter table public.production_shots
  add column if not exists manual_image_url text,
  add column if not exists video_source_image_url text,
  add column if not exists motion_prompt text,
  add column if not exists video_status text default 'idle',
  add column if not exists video_url text,
  add column if not exists video_duration int,
  add column if not exists video_cost_usd numeric(8,4),
  add column if not exists video_error_message text,
  add column if not exists video_fal_request_id text;

notify pgrst, 'reload schema';
```

## Section B

B.1 Kling endpoint discovery confirmed:

- Endpoint ID: `fal-ai/kling-video/v2.6/pro/image-to-video`.
- Required inputs in fal docs: `image_url`, `prompt`.
- Current `@fal-ai/client` generated TypeScript type uses `start_image_url` for this endpoint, so implementation uses `start_image_url`.
- Duration enum: `5` or `10`.
- Aspect ratio: `16:9`, `9:16`, `1:1`; implementation uses `16:9`.
- Output schema: `video.url`.

B.2 Pattern decision:

- Implemented `fal.queue.submit -> fal.queue.status polling -> fal.queue.result`.
- Route `maxDuration = 600`.
- Reason: Kling video generation can take several minutes; queue polling avoids relying on a long `fal.subscribe` HTTP connection and gives clearer request ID tracking.

B.3 Existing `ShotCard.tsx` was read before extension. The component was then cleaned up because previous manual patches left mojibake strings; behavior was extended without changing the Cycle 1/2 image path.

Sources:

- https://fal.ai/models/fal-ai/kling-video/v2.6/pro/image-to-video/api
- https://fal.ai/docs/reference/client-libraries/javascript/queue

## Section C

Implemented:

- Per-shot manual image upload via `POST /api/upload-shot-image`.
- Manual image upload validates type and 10MB size, uploads to fal storage, updates `manual_image_url`, and sets `status = done`.
- Done shots show image source label: `AI 生成圖片` or `自己上傳嘅圖片`.
- `VideoSection` appears for any done shot with an image.
- Per-shot `motion_prompt` textarea persists through `PATCH /api/shots/[id]`.
- Duration toggle supports 5s / 10s.
- Presets insert documentary motion prompts: Slow push in, Gentle overhead, Rack focus.
- `POST /api/generate-video` chooses `manual_image_url ?? generated_image_url`, sets `video_status = generating`, calls Kling, then stores `video_url`, duration, cost, and fal request ID.
- Video preview uses HTML5 `<video controls>`.
- MP4 download implemented.
- Regenerate resets `video_status` to `idle` so user can edit motion prompt first.
- Session header now shows Images / Videos / Total.

## Section D

No new dependency. Existing `@fal-ai/client` queue API is used.

## Section E

Verification completed:

- `npm run build` passed.
- Migration applied manually in Supabase SQL Editor.
- New video columns readable from `production_shots`.
- Manual upload route invalid-file validation returned 400 with expected message.
- Motion prompt save through `PATCH /api/shots/[id]` succeeded.
- Real Kling 2.6 Pro image-to-video generation succeeded on `鏡頭 24`.
- Generated video URL stored in DB.
- Video cost stored as `$0.35` for 5 seconds.
- `FAL_KEY` not found in `.next/static`.
- Video field names not found in `.next/static`.
- Dev server restarted on `http://localhost:3010` and returned HTTP 200.

Generated video smoke result:

- Shot: `鏡頭 24`
- Request ID: `019e16e0-64fd-76d1-9b6d-923218a12452`
- URL: `https://v3b.fal.media/files/b/0a99c6b0/OZF-h6pdDy79_-274RApc_output.mp4`
- Cost: `$0.35`

Pending manual verification:

- Browser playback in UI.
- Browser MP4 download.
- Manual upload image -> video full path.
- Preset click behavior in UI.

## Section F

Out of scope preserved:

- Audio generation.
- Batch video generation.
- Video trimming / editing.
- Session-level motion preset.
- Kling 3.0 upgrade.
- Export all videos as zip.

## Section G

IP boundary maintained:

- Manual uploaded image is user content and stored through fal storage.
- Kling video output is stored as URL in Supabase.
- No Layer 2 framework data codified.
- No Layer 5 exposure.
