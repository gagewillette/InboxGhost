alter table emails add column if not exists content_type text not null default 'text/plain';
