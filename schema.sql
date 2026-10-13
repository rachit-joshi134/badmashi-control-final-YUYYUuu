-- Run in the Supabase SQL Editor. Review policies and test with a non-admin account before launch.
create extension if not exists pgcrypto;

create type public.app_role as enum ('super_admin','racing_admin','application_reviewer','medical_reviewer','content_editor','read_only_admin');
create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'read_only_admin',
  created_at timestamptz not null default now()
);
create or replace function public.has_role(allowed public.app_role[])
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.admin_roles where user_id=auth.uid() and role=any(allowed)); $$;

create table if not exists public.driver_categories (
 id uuid primary key default gen_random_uuid(), name text unique not null, slug text unique not null,
 active boolean not null default true, created_at timestamptz not null default now()
);
insert into public.driver_categories(name,slug) values
 ('Under 19','under-19'),('F1 Trainee','f1-trainee'),('Non-F1 Trainee','non-f1-trainee'),
 ('Go-Karting','go-karting'),('NASCAR','nascar'),('Rally','rally')
on conflict(name) do nothing;

create table if not exists public.drivers (
 id uuid primary key default gen_random_uuid(),
 public_id text unique not null, full_name text not null, nickname text, profile_photo_url text,
 date_of_birth date, nationality text, city text, country text, category text not null,
 discipline text, slug text unique not null, biography text, racing_since date, experience text,
 team text, racing_number text, vehicle_info text, last_competition text,
 race_starts integer not null default 0 check(race_starts>=0), wins integer not null default 0 check(wins>=0),
 podiums integer not null default 0 check(podiums>=0), leaderboard_points integer not null default 0 check(leaderboard_points>=0),
 strengths text[] not null default '{}', development_areas text[] not null default '{}',
 achievements text[] not null default '{}', clearance_status text not null default 'Not Submitted'
 check(clearance_status in ('Pending','Cleared','Expired','Not Submitted')),
 clearance_date date, clearance_expiry date, clearance_reviewer uuid references auth.users(id),
 medical_internal_notes text, published boolean not null default false, featured boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists drivers_public_idx on public.drivers(published,leaderboard_points desc);
create index if not exists drivers_category_idx on public.drivers(category);

create or replace view public.drivers_public as
select id,public_id,full_name,nickname,profile_photo_url,nationality,category,discipline,slug,biography,
       team,racing_since,race_starts,wins,podiums,leaderboard_points,strengths,development_areas,achievements,featured
from public.drivers where published=true;

create table if not exists public.driver_applications (
 id uuid primary key default gen_random_uuid(), reference text unique not null,
 full_name text not null, email text not null, nationality text, category text not null, discipline text, team text,
 date_of_birth date, experience text, guardian_consent boolean not null default false,
 consent_at timestamptz, status text not null default 'Submitted'
 check(status in ('Draft','Submitted','Under Review','More Information Required','Approved','Rejected','Withdrawn')),
 review_notes text, reviewed_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists applications_status_idx on public.driver_applications(status,created_at desc);

create table if not exists public.application_documents (
 id uuid primary key default gen_random_uuid(), application_id uuid not null references public.driver_applications(id) on delete cascade,
 storage_path text not null, original_name text not null, mime_type text not null, size_bytes bigint not null,
 uploaded_at timestamptz not null default now()
);
create table if not exists public.events (
 id uuid primary key default gen_random_uuid(), title text not null, slug text unique not null, description text,
 category text, venue text, event_date timestamptz, status text not null default 'Draft' check(status in ('Draft','Scheduled','Completed','Cancelled')),
 published boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.event_participants (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
 driver_id uuid not null references public.drivers(id) on delete cascade, status text not null default 'Registered',
 unique(event_id,driver_id)
);
create table if not exists public.race_results (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
 driver_id uuid not null references public.drivers(id) on delete cascade, position integer not null check(position>0),
 points integer not null default 0 check(points>=0), published boolean not null default false,
 created_at timestamptz not null default now(), unique(event_id,driver_id), unique(event_id,position)
);
create table if not exists public.news_articles (
 id uuid primary key default gen_random_uuid(), title text not null, slug text unique not null, summary text, body text not null,
 category text, author_id uuid references auth.users(id), status text not null default 'Draft' check(status in ('Draft','Published','Archived')),
 featured_image_url text, published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.certificates (
 id uuid primary key default gen_random_uuid(), certificate_id text unique not null, driver_id uuid references public.drivers(id),
 driver_name text not null, certificate_type text not null, issue_date date not null default current_date,
 expiry_date date, issuing_authority text, event_reference text, status text not null default 'Valid' check(status in ('Valid','Revoked','Expired')),
 created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.enquiries (
 id uuid primary key default gen_random_uuid(), reference text unique not null, name text not null, email text not null,
 service text not null, budget text, message text not null, status text not null default 'New',
 internal_notes text, created_at timestamptz not null default now()
);
create table if not exists public.offline_payments (
 id uuid primary key default gen_random_uuid(), application_id uuid references public.driver_applications(id),
 status text not null default 'Pending' check(status in ('Pending','Received In Person','Refunded/Cancelled')),
 amount numeric(12,2), currency text not null default 'INR', receipt_reference text, received_at timestamptz,
 received_by uuid references auth.users(id), notes text, created_at timestamptz not null default now()
);
create table if not exists public.media_records (
 id uuid primary key default gen_random_uuid(), storage_path text not null, public_url text, original_name text,
 mime_type text, size_bytes bigint, is_public boolean not null default false, uploaded_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id), action text not null,
 entity_type text not null, entity_id text, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table if not exists public.driver_votes (
 id uuid primary key default gen_random_uuid(), driver_id uuid not null references public.drivers(id) on delete cascade,
 voter_hash text not null, created_at timestamptz not null default now(), unique(driver_id,voter_hash)
);
create table if not exists public.driver_reports (
 id uuid primary key default gen_random_uuid(), driver_id uuid not null references public.drivers(id) on delete cascade,
 reason text not null, contact_email text, status text not null default 'New', created_at timestamptz not null default now()
);
create table if not exists public.site_settings (
 key text primary key, value jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);

-- RLS on all tables. Anonymous visitors can read only approved public views/records.
alter table public.admin_roles enable row level security;
alter table public.drivers enable row level security;
alter table public.driver_categories enable row level security;
alter table public.driver_applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.race_results enable row level security;
alter table public.news_articles enable row level security;
alter table public.certificates enable row level security;
alter table public.enquiries enable row level security;
alter table public.offline_payments enable row level security;
alter table public.media_records enable row level security;
alter table public.audit_logs enable row level security;
alter table public.driver_votes enable row level security;
alter table public.driver_reports enable row level security;
alter table public.site_settings enable row level security;

create policy "admins can read own role" on public.admin_roles for select to authenticated using(user_id=auth.uid());
create policy "racing staff manage drivers" on public.drivers for all to authenticated using(public.has_role(array['super_admin','racing_admin']::public.app_role[])) with check(public.has_role(array['super_admin','racing_admin']::public.app_role[]));
create policy "public can read active categories" on public.driver_categories for select to anon,authenticated using(active=true);
create policy "admins manage categories" on public.driver_categories for all to authenticated using(public.has_role(array['super_admin','racing_admin']::public.app_role[])) with check(public.has_role(array['super_admin','racing_admin']::public.app_role[]));
create policy "reviewers manage applications" on public.driver_applications for all to authenticated using(public.has_role(array['super_admin','racing_admin','application_reviewer']::public.app_role[])) with check(public.has_role(array['super_admin','racing_admin','application_reviewer']::public.app_role[]));
create policy "reviewers manage private documents" on public.application_documents for all to authenticated using(public.has_role(array['super_admin','application_reviewer']::public.app_role[])) with check(public.has_role(array['super_admin','application_reviewer']::public.app_role[]));
create policy "admins manage events" on public.events for all to authenticated using(public.has_role(array['super_admin','racing_admin','content_editor']::public.app_role[])) with check(public.has_role(array['super_admin','racing_admin','content_editor']::public.app_role[]));
create policy "admins manage participants" on public.event_participants for all to authenticated using(public.has_role(array['super_admin','racing_admin']::public.app_role[])) with check(public.has_role(array['super_admin','racing_admin']::public.app_role[]));
create policy "admins manage results" on public.race_results for all to authenticated using(public.has_role(array['super_admin','racing_admin']::public.app_role[])) with check(public.has_role(array['super_admin','racing_admin']::public.app_role[]));
create policy "public read published news" on public.news_articles for select to anon,authenticated using(status='Published');
create policy "editors manage news" on public.news_articles for all to authenticated using(public.has_role(array['super_admin','content_editor']::public.app_role[])) with check(public.has_role(array['super_admin','content_editor']::public.app_role[]));
create policy "public read certificate verification fields" on public.certificates for select to anon,authenticated using(true);
create policy "admins manage certificates" on public.certificates for all to authenticated using(public.has_role(array['super_admin','racing_admin']::public.app_role[])) with check(public.has_role(array['super_admin','racing_admin']::public.app_role[]));
create policy "admins read enquiries" on public.enquiries for select to authenticated using(public.has_role(array['super_admin','racing_admin','content_editor','read_only_admin']::public.app_role[]));
create policy "admins update enquiries" on public.enquiries for update to authenticated using(public.has_role(array['super_admin','racing_admin','content_editor']::public.app_role[])) with check(public.has_role(array['super_admin','racing_admin','content_editor']::public.app_role[]));
create policy "super admins manage payments" on public.offline_payments for all to authenticated using(public.has_role(array['super_admin']::public.app_role[])) with check(public.has_role(array['super_admin']::public.app_role[]));
create policy "admins manage media" on public.media_records for all to authenticated using(public.has_role(array['super_admin','racing_admin','content_editor']::public.app_role[])) with check(public.has_role(array['super_admin','racing_admin','content_editor']::public.app_role[]));
create policy "admins read audit" on public.audit_logs for select to authenticated using(public.has_role(array['super_admin','racing_admin','application_reviewer','medical_reviewer','content_editor','read_only_admin']::public.app_role[]));
create policy "medical reviewers manage clearance" on public.drivers for update to authenticated using(public.has_role(array['super_admin','medical_reviewer']::public.app_role[])) with check(public.has_role(array['super_admin','medical_reviewer']::public.app_role[]));
create policy "admins manage settings" on public.site_settings for all to authenticated using(public.has_role(array['super_admin']::public.app_role[])) with check(public.has_role(array['super_admin']::public.app_role[]));

grant select on public.drivers_public to anon,authenticated;
grant select on public.driver_categories to anon,authenticated;
grant select on public.certificates to anon,authenticated;
grant select on public.news_articles to anon,authenticated;
grant select,insert,update,delete on public.drivers,public.driver_categories,public.driver_applications,public.application_documents,public.events,public.event_participants,public.race_results,public.news_articles,public.certificates,public.enquiries,public.offline_payments,public.media_records,public.audit_logs,public.site_settings to authenticated;
grant select on public.admin_roles to authenticated;
