begin;
create table if not exists public.line_groups (
 group_id text primary key,
 display_name text,
 source_type text not null default 'group' check (source_type in ('group','room','user')),
 ingest_enabled boolean not null default false,
 report_enabled boolean not null default false,
 first_seen_at timestamptz not null default now()
);
create table if not exists public.line_messages (
 message_id text primary key,
 webhook_event_id text unique,
 group_id text not null references public.line_groups(group_id),
 sender_id text,
 message_text text,
 event_at timestamptz not null,
 received_at timestamptz not null default now(),
 unsent_at timestamptz
);
create index if not exists line_messages_group_date_idx on public.line_messages(group_id,event_at);
create table if not exists public.summary_deliveries (
 id uuid primary key default gen_random_uuid(),
 report_date date not null,
 target_group_id text not null references public.line_groups(group_id),
 status text not null default 'pending' check (status in ('pending','sending','sent','failed','uncertain')),
 retry_key uuid not null default gen_random_uuid() unique,
 summary_text text,
 message_count integer not null default 0 check (message_count >= 0),
 created_at timestamptz not null default now(),
 sent_at timestamptz,
 last_error_code text,
 unique (report_date,target_group_id)
);
alter table public.line_groups enable row level security;
alter table public.line_messages enable row level security;
alter table public.summary_deliveries enable row level security;
revoke all on public.line_groups,public.line_messages,public.summary_deliveries from anon,authenticated;
grant select,insert,update,delete on public.line_groups,public.line_messages,public.summary_deliveries to service_role;
commit;
