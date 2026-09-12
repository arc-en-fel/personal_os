-- Create study_sessions table for tracking Pomodoro and study activities
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null,
  technique text not null default 'pomodoro', -- 'pomodoro', 'deep_work', 'spaced_repetition', etc.
  total_duration_minutes integer not null,
  focused_cycles integer default 0,
  breaks_taken integer default 0,
  interruptions integer default 0,
  subject text,
  notes text,
  tags text[] default array[]::text[],
  metadata jsonb default '{}'::jsonb,
  started_at timestamp with time zone not null default now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Enable RLS
alter table public.study_sessions enable row level security;

-- Create RLS policy
drop policy if exists "Users can manage their study sessions" on public.study_sessions;
create policy "Users can manage their study sessions" on public.study_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create indexes
create index if not exists study_sessions_user_date_idx on public.study_sessions(user_id, started_at desc);
create index if not exists study_sessions_technique_idx on public.study_sessions(user_id, technique);
create index if not exists study_sessions_activity_idx on public.study_sessions(activity_id);

-- Create study_statistics table for daily aggregates
create table if not exists public.study_statistics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_date date not null,
  total_study_time_minutes integer default 0,
  sessions_completed integer default 0,
  total_cycles integer default 0,
  techniques_used text[] default array[]::text[],
  subjects_studied text[] default array[]::text[],
  average_focus_score numeric default 0,
  interruption_count integer default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(user_id, study_date)
);

-- Enable RLS
alter table public.study_statistics enable row level security;

-- Create RLS policy
drop policy if exists "Users can manage their study statistics" on public.study_statistics;
create policy "Users can manage their study statistics" on public.study_statistics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create index
create index if not exists study_statistics_user_date_idx on public.study_statistics(user_id, study_date desc);
