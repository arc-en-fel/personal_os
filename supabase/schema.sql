create extension if not exists "pgcrypto";
create extension if not exists "vector";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  type text not null default 'general',
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active',
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  title text not null,
  description text,
  target_value numeric,
  current_value numeric not null default 0,
  target_date date,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.transaction_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  unique (user_id, name)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  transaction_type text not null check (transaction_type in ('income', 'expense')),
  merchant text,
  description text,
  category_id uuid references public.transaction_categories(id) on delete set null,
  transaction_date date not null default current_date,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.areas enable row level security;
alter table public.activities enable row level security;
alter table public.projects enable row level security;
alter table public.goals enable row level security;
alter table public.transaction_categories enable row level security;
alter table public.transactions enable row level security;
alter table public.notes enable row level security;

drop policy if exists "Users can manage their profile" on public.profiles;
drop policy if exists "Users can manage their areas" on public.areas;
drop policy if exists "Users can manage their activities" on public.activities;
drop policy if exists "Users can manage their projects" on public.projects;
drop policy if exists "Users can manage their goals" on public.goals;

create policy "Users can manage their profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users can manage their areas" on public.areas for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their activities" on public.activities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their projects" on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their goals" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can manage their transaction categories" on public.transaction_categories;
drop policy if exists "Users can manage their transactions" on public.transactions;
create policy "Users can manage their transaction categories" on public.transaction_categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their transactions" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can manage their notes" on public.notes;
create policy "Users can manage their notes" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists activities_user_started_at_idx on public.activities(user_id, started_at desc);
create index if not exists projects_user_updated_at_idx on public.projects(user_id, updated_at desc);
create index if not exists goals_user_status_idx on public.goals(user_id, status);
create index if not exists transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
create index if not exists notes_user_updated_at_idx on public.notes(user_id, updated_at desc);

create or replace function public.match_notes(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  requesting_user_id uuid
)
returns table (id uuid, title text, content text, similarity float)
language sql stable security invoker set search_path = public
as $$
  select notes.id, notes.title, notes.content,
    1 - (notes.embedding <=> query_embedding) as similarity
  from public.notes
  where notes.user_id = requesting_user_id
    and notes.embedding is not null
    and 1 - (notes.embedding <=> query_embedding) >= match_threshold
  order by notes.embedding <=> query_embedding
  limit least(match_count, 20);
$$;

create table if not exists public.assistant_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  tools_used text[] not null default '{}',
  response_time_ms integer,
  success boolean not null default true,
  error_message text,
  tokens_used integer,
  created_at timestamptz not null default now()
);

create table if not exists public.query_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pattern text not null,
  pattern_type text not null check (pattern_type in ('topic', 'tool', 'time', 'trend')),
  frequency integer not null default 1,
  last_seen timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, pattern, pattern_type),
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_type text not null check (metric_type in ('top_topics', 'tool_usage', 'response_times', 'success_rate', 'query_count', 'trending')),
  metric_data jsonb not null,
  period_days integer not null default 30,
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (user_id, metric_type, period_days),
  created_at timestamptz not null default now()
);

alter table public.assistant_queries enable row level security;
alter table public.query_patterns enable row level security;
alter table public.analytics_cache enable row level security;

drop policy if exists "Users can manage their queries" on public.assistant_queries;
drop policy if exists "Users can manage their patterns" on public.query_patterns;
drop policy if exists "Users can manage their cache" on public.analytics_cache;

create policy "Users can manage their queries" on public.assistant_queries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their patterns" on public.query_patterns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their cache" on public.analytics_cache for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists assistant_queries_user_created_idx on public.assistant_queries(user_id, created_at desc);
create index if not exists assistant_queries_user_success_idx on public.assistant_queries(user_id, success);
create index if not exists query_patterns_user_type_idx on public.query_patterns(user_id, pattern_type);
create index if not exists query_patterns_user_frequency_idx on public.query_patterns(user_id, frequency desc);
create index if not exists analytics_cache_user_type_idx on public.analytics_cache(user_id, metric_type);
create index if not exists analytics_cache_expires_idx on public.analytics_cache(expires_at);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$ begin insert into public.profiles (id) values (new.id); return new; end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();


-- Phase 7: Reminders and Study Techniques

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  reminder_type text not null check (reminder_type in ('goal', 'learning', 'fitness', 'finance', 'custom')),
  trigger_type text not null check (trigger_type in ('time', 'goal_progress', 'daily', 'weekly', 'custom')),
  scheduled_time time,
  scheduled_day_of_week integer check (scheduled_day_of_week between 0 and 6),
  goal_id uuid references public.goals(id) on delete set null,
  notification_enabled boolean not null default true,
  notification_channels text[] not null default '{"in_app"}',
  repeat_interval integer,
  repeat_unit text check (repeat_unit in ('minutes', 'hours', 'days', 'weeks')),
  last_triggered_at timestamptz,
  next_trigger_at timestamptz,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null,
  technique text not null check (technique in ('pomodoro', 'spaced_repetition', 'active_recall', 'time_blocking', 'deep_work')),
  total_duration_minutes integer not null,
  focused_cycles integer not null default 0,
  breaks_taken integer not null default 0,
  interruptions integer not null default 0,
  subject text,
  notes text,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.study_statistics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_date date not null,
  total_minutes integer not null default 0,
  sessions_completed integer not null default 0,
  pomodoro_cycles integer not null default 0,
  subjects_studied text[] not null default '{}',
  average_focus_score numeric,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, study_date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reminders enable row level security;
alter table public.study_sessions enable row level security;
alter table public.study_statistics enable row level security;

drop policy if exists "Users can manage their reminders" on public.reminders;
drop policy if exists "Users can manage their study sessions" on public.study_sessions;
drop policy if exists "Users can manage their study statistics" on public.study_statistics;

create policy "Users can manage their reminders" on public.reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their study sessions" on public.study_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their study statistics" on public.study_statistics for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists reminders_user_active_idx on public.reminders(user_id, is_active);
create index if not exists reminders_user_next_trigger_idx on public.reminders(user_id, next_trigger_at);
create index if not exists reminders_user_type_idx on public.reminders(user_id, reminder_type);
create index if not exists study_sessions_user_date_idx on public.study_sessions(user_id, started_at desc);
create index if not exists study_sessions_technique_idx on public.study_sessions(user_id, technique);
create index if not exists study_statistics_user_date_idx on public.study_statistics(user_id, study_date desc);


create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_id uuid references public.reminders(id) on delete set null,
  title text not null,
  message text not null,
  type text not null,
  read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Users can manage their notifications" on public.notifications;

create policy "Users can manage their notifications" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_read_idx on public.notifications(user_id, read);


-- Phase 11: Calendar Integration

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_id uuid references public.reminders(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete cascade,
  title text not null,
  description text,
  event_type text not null check (event_type in ('reminder', 'goal_deadline', 'study_session', 'event', 'custom')),
  start_time timestamptz not null,
  end_time timestamptz not null,
  all_day boolean not null default false,
  location text,
  color text,
  recurrence_rule text,
  recurrence_end_date date,
  is_recurring boolean not null default false,
  attendees text[] not null default '{}',
  notifications text[] not null default '{"15_minutes_before", "at_time"}',
  is_synced_to_device boolean not null default false,
  device_calendar_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.calendar_events(id) on delete cascade,
  sync_direction text not null check (sync_direction in ('push', 'pull')),
  sync_status text not null check (sync_status in ('pending', 'success', 'failed')),
  source text not null check (source in ('reminder', 'goal', 'activity', 'device')),
  error_message text,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.calendar_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  auto_sync_enabled boolean not null default true,
  sync_reminders_to_calendar boolean not null default true,
  sync_goals_to_calendar boolean not null default true,
  sync_study_sessions_to_calendar boolean not null default true,
  device_calendar_name text default 'Personal Tracker',
  default_event_color text default '#3B82F6',
  default_event_duration_minutes integer default 60,
  week_start_day integer not null default 0 check (week_start_day between 0 and 6),
  time_format text not null default '24h' check (time_format in ('12h', '24h')),
  timezone text not null default 'UTC',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calendar_events enable row level security;
alter table public.calendar_sync_log enable row level security;
alter table public.calendar_settings enable row level security;

drop policy if exists "Users can manage their calendar events" on public.calendar_events;
drop policy if exists "Users can manage their sync logs" on public.calendar_sync_log;
drop policy if exists "Users can manage their calendar settings" on public.calendar_settings;

create policy "Users can manage their calendar events" on public.calendar_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their sync logs" on public.calendar_sync_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their calendar settings" on public.calendar_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists calendar_events_user_start_idx on public.calendar_events(user_id, start_time desc);
create index if not exists calendar_events_user_type_idx on public.calendar_events(user_id, event_type);
create index if not exists calendar_events_reminder_idx on public.calendar_events(reminder_id);
create index if not exists calendar_events_goal_idx on public.calendar_events(goal_id);
create index if not exists calendar_events_activity_idx on public.calendar_events(activity_id);
create index if not exists calendar_sync_log_user_idx on public.calendar_sync_log(user_id, created_at desc);
create index if not exists calendar_sync_log_event_idx on public.calendar_sync_log(event_id);
create index if not exists calendar_settings_user_idx on public.calendar_settings(user_id);
