-- Analytics and insights tracking tables

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
