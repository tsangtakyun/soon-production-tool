# SOON Production Tool — Cycle 5 Report

Date: 2026-05-11
Repo: soon-production-tool
Status: Implemented locally

## Section A — File Changes

Modified:
- `components/VideoSection.tsx`
- `components/ShotCard.tsx`

Added:
- `lib/filename.ts`

## Section B — Discovery

### B.1 Cross-origin download

fal.media returns `access-control-allow-origin: *` for generated MP4 URLs, so client-side `fetch(video_url)` + Blob download works.

Decision: Option B, client-side Blob download.

Reason: direct `<a download>` is unreliable for cross-origin URLs, while Blob download gives us full filename control without adding a server-side video streaming route.

### B.2 Vercel timeout

Current Vercel docs split limits between Fluid Compute and older/non-fluid function limits.

With Fluid Compute:
- Hobby default/max: 300s
- Pro default: 300s, max: 800s

Without Fluid Compute / legacy limit:
- Hobby max: 60s
- Pro max: 300s

Recommendation: Plan B revised for 2026 docs — deploy on Vercel with Fluid Compute enabled. Hobby can work for up to 300s, but Kling can take 3-8 minutes, so Pro is recommended if Tommy wants reliable video generation beyond 5 minutes. If staying Hobby, keep image generation and short video tests only, and expect timeout risk for slower Kling jobs.

Edge Functions are not suitable because this route needs long-running Node.js queue polling.

### B.3 shot_index vs displayOrder

Storyboard `displayOrder` is 0-based in raw JSON. Import parser stores `shot_index = displayOrder + 1`, so DB `shot_index` is the human-facing storyboard order.

Decision: filename uses `production_shots.shot_index`.

## Section C — Vercel Deployment Checklist

### Step 1: Plan
- [ ] Confirm Vercel plan
- Recommendation: Vercel with Fluid Compute enabled. Pro is recommended for reliable Kling video generation because observed jobs can exceed 300s.

### Step 2: Repo Connect
- [ ] Push branch to GitHub
- [ ] Connect repo in Vercel dashboard
- [ ] Set framework preset: Next.js

### Step 3: Env Vars
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `FAL_KEY`

### Step 4: Deploy
- [ ] Trigger deploy
- [ ] Confirm build log has no error
- [ ] Confirm `soon-production-tool.vercel.app` is accessible

### Step 5: Post-deploy Smoke Test
- [ ] Home page loads
- [ ] JSON import works
- [ ] Generate image for 1 shot
- [ ] Generate video for 1 shot
- [ ] Download video with correct filename

## Section D — Verification

Passed:
- `npm run build`
- `generateVideoFilename(3, '鏡頭3')` -> `shot-03_鏡頭3.mp4`
- `generateVideoFilename(12, '鏡頭12')` -> `shot-12_鏡頭12.mp4`
- Filename sanitize replaces `/ \ : * ? " < > |` with `-`
- fal.media CORS supports Blob download

Not completed:
- Browser download dialog manual confirmation
- Actual Vercel deploy, because this local environment has no linked Vercel project / CLI session

## Section E — Out of Scope

Kept out:
- Session history page
- Auth/login
- Image download filename
- Batch rename existing downloads

## Section F — IP Boundary

No Layer 2 framework data added.
No Layer 5 exposure.
Download remains client-side Blob fetch from fal.media and does not store video.
