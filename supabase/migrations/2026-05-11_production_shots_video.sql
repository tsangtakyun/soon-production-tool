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
