alter table public.production_shots
  add column if not exists audio_prompt text,
  add column if not exists audio_enabled boolean default false;

notify pgrst, 'reload schema';
