create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  current_city text,
  gender text,
  interested_in text,
  relationship_intention text,
  relationship_structure text,
  children text,
  religion text,
  age_range text,
  max_distance text,
  nonnegotiables text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.birth_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  date_of_birth date,
  time_of_birth time,
  place_of_birth text,
  time_accuracy text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id integer not null,
  answer_index integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, question_id)
);

create table if not exists public.person_models (
  user_id uuid primary key references auth.users(id) on delete cascade,
  archetype text,
  scores jsonb not null default '{}'::jsonb,
  shadow_hypotheses jsonb not null default '[]'::jsonb,
  confidence jsonb not null default '{}'::jsonb,
  model_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mirror_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report jsonb not null,
  accuracy smallint check (accuracy between 1 and 7),
  correction text,
  created_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.photo_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  slot text not null check (slot in ('front','angle','smile','profile')),
  consented_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  matched_user_id uuid not null references auth.users(id) on delete cascade,
  score numeric,
  rationale jsonb not null default '{}'::jsonb,
  status text not null default 'suggested',
  created_at timestamptz not null default now(),
  unique(user_id, matched_user_id)
);

create table if not exists public.match_feedback (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.birth_data enable row level security;
alter table public.assessment_responses enable row level security;
alter table public.person_models enable row level security;
alter table public.mirror_reports enable row level security;
alter table public.journal_entries enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.photo_assets enable row level security;
alter table public.matches enable row level security;
alter table public.match_feedback enable row level security;

create policy "profiles own row" on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "birth own row" on public.birth_data for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "assessment own rows" on public.assessment_responses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "person model own row" on public.person_models for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mirror own rows" on public.mirror_reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "journal own rows" on public.journal_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "conversation own rows" on public.ai_conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "message own rows" on public.ai_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "photo own rows" on public.photo_assets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "matches visible to participant" on public.matches for select using (auth.uid() = user_id or auth.uid() = matched_user_id);
create policy "match feedback own rows" on public.match_feedback for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles(user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();