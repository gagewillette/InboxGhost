alter table emails add column if not exists attachments jsonb not null default '[]';
alter table email_threads add column if not exists attachments jsonb not null default '[]';
