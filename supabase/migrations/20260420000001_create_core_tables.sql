create table if not exists gmail_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table gmail_tokens enable row level security;

create policy "Users can manage their own gmail tokens"
  on gmail_tokens for all
  using (auth.uid() = user_id);

create table if not exists emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id text not null,
  message_id text not null,
  from_email text not null,
  to_emails text[] not null default '{}',
  subject text not null default '',
  snippet text not null default '',
  body text not null default '',
  internal_date bigint not null,
  is_incoming boolean not null default true,
  is_processed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, message_id)
);

alter table emails enable row level security;

create policy "Users can manage their own emails"
  on emails for all
  using (auth.uid() = user_id);

create index on emails (user_id, internal_date desc);

create table if not exists email_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id text not null,
  subject text not null default '',
  last_message_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, thread_id)
);

alter table email_threads enable row level security;

create policy "Users can manage their own email threads"
  on email_threads for all
  using (auth.uid() = user_id);

create index on email_threads (user_id, last_message_at desc);
