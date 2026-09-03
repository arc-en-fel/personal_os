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

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$ begin insert into public.profiles (id) values (new.id); return new; end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
