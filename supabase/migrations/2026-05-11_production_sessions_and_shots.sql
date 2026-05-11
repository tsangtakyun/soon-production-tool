create table if not exists public.production_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  title text,
  raw_json jsonb not null,
  shot_count int,
  ai_shot_count int
);

notify pgrst, 'reload schema';

create table if not exists public.production_shots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.production_sessions(id) on delete cascade,
  shot_index int not null,
  shot_label text,
  production_prompt text not null,
  edited_prompt text,
  status text default 'pending',
  generated_image_url text,
  fal_request_id text,
  cost_usd numeric(8,4),
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

notify pgrst, 'reload schema';
