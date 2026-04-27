-- Labels users create to categorize their email
create table if not exists user_labels (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  name         text        not null,
  color        text,
  description  text,
  created_at   timestamptz not null default now(),
  unique (user_id, name)
);

alter table user_labels enable row level security;

create policy "Users can manage their own labels"
  on user_labels for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists user_labels_user_id_idx
  on user_labels (user_id);

-- AI classification results per thread
create table if not exists email_classifications (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  thread_id      text        not null,
  labels         text[]      not null default '{}',
  importance     text        check (importance in ('high', 'med', 'low')),
  classified_at  timestamptz not null default now(),
  unique (user_id, thread_id)
);

alter table email_classifications enable row level security;

create policy "Users can read their own classifications"
  on email_classifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists email_classifications_user_id_idx
  on email_classifications (user_id);

create index if not exists email_classifications_user_thread_idx
  on email_classifications (user_id, thread_id);
