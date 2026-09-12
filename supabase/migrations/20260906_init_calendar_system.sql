-- Calendar and Reminders System Initialization
-- Creates all tables needed for calendar events and notification reminders

-- Drop existing tables if conflict
drop table if exists public.event_reminders cascade;
drop table if exists public.notification_preferences cascade;
drop table if exists public.calendar_events cascade;

-- Create calendar_events table
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  event_type text not null default 'custom' check (event_type in ('reminder', 'goal_deadline', 'study_session', 'event', 'custom')),
  start_time timestamptz not null,
  end_time timestamptz not null,
  all_day boolean not null default false,
  location text,
  color text,
  area_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create event_reminders table
create table public.event_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  title text not null,
  description text,
  minutes_before integer not null,
  notification_type text not null check (notification_type in ('email', 'notification')),
  scheduled_time timestamptz not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create notification_preferences table
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  enable_push_notifications boolean not null default true,
  enable_in_app_notifications boolean not null default true,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.calendar_events enable row level security;
alter table public.event_reminders enable row level security;
alter table public.notification_preferences enable row level security;

-- RLS Policies
create policy "Users can manage their calendar events"
  on public.calendar_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their event reminders"
  on public.event_reminders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their notification preferences"
  on public.notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes
create index idx_calendar_events_user_id on public.calendar_events(user_id);
create index idx_calendar_events_start_time on public.calendar_events(start_time);
create index idx_event_reminders_user_id on public.event_reminders(user_id);
create index idx_event_reminders_event_id on public.event_reminders(event_id);
create index idx_event_reminders_scheduled_time on public.event_reminders(scheduled_time);
create index idx_notification_preferences_user_id on public.notification_preferences(user_id);
