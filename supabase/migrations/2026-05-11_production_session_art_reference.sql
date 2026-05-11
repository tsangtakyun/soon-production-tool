alter table public.production_sessions
  add column if not exists art_direction_prefix text,
  add column if not exists reference_image_url text;

notify pgrst, 'reload schema';
