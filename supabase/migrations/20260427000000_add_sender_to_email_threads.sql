alter table email_threads add column if not exists sender text not null default '';
