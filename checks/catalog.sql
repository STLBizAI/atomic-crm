-- ============================================================
-- Catalog verification queries — atomic-crm / STL Biz AI
--
-- Run these in Supabase Studio after every migration.
-- The CLI's summary is not the database's state. Ask Postgres.
--
-- RULE: queries live here, results never. Never paste query
-- output into this repo — it is public, and git history is
-- permanent. Deleting it in a later commit does not remove it.
--
-- Legend
--   contype : p = primary key, f = foreign key,
--             c = check, u = unique
--   polcmd  : r = select, a = insert, w = update,
--             d = delete, * = all
-- ============================================================


-- 1. VIEWS: is security_invoker still on?
-- Every generated migration that recreates a view silently drops
-- it. Two for two so far. Expect security_invoker=on for both
-- contacts_summary and companies_summary. An empty reloptions
-- means the view now runs as its owner and RLS is bypassed.

select relname, reloptions
from pg_class
where relkind = 'v'
  and relnamespace = 'public'::regnamespace
order by relname;


-- 2. CONSTRAINTS on one table.
-- Change the table name as needed. convalidated = false means a
-- constraint that only polices NEW rows — existing bad data sits
-- untouched beneath it.
-- Expect 6 rows on contacts after referred_by lands.

select conname, contype, convalidated
from pg_constraint
where conrelid = 'public.contacts'::regclass
order by contype, conname;


-- 3. CONSTRAINTS across every public table, checks and keys only.

select conrelid::regclass as table_name,
       conname,
       contype,
       convalidated
from pg_constraint
where connamespace = 'public'::regnamespace
  and contype in ('c', 'f', 'u')
order by table_name, conname;


-- 4. RLS: is it actually on?
-- relrowsecurity = false means the table is wide open regardless
-- of what policies exist. New table -> always check this.

select relname, relrowsecurity
from pg_class
where relkind = 'r'
  and relnamespace = 'public'::regnamespace
order by relname;


-- 5. POLICIES. A table with RLS on and zero policies denies
-- everything — and Studio bypasses RLS, so "I can see the rows"
-- proves nothing about what the app can see.

select polrelid::regclass as table_name,
       polname,
       polcmd
from pg_policy
order by table_name, polname;


-- 5b. Same thing, more readable, with roles. Use this one when
-- you care WHO a policy applies to.

select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;


-- 6. GRANTS to anon and authenticated.
-- Grants and RLS are two independent gates. The session-3
-- industries migration grants DELETE to anon — safe only because
-- every policy on it is authenticated. Review all of these
-- before the Phase 5 deploy.

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;


-- 7. MIGRATION HISTORY.
-- "Local database is up to date" can mean the version was
-- recorded while the DDL rolled back. This is the only place
-- that says what actually applied.

select version, name
from supabase_migrations.schema_migrations
order by version desc
limit 10;


-- ============================================================
-- VIOLATION FINDERS
--
-- When a constraint refuses to apply, it is describing your
-- data. Run the constraint's own predicate to find out how many
-- rows and which, before deciding how to fix them.
--
-- Run all three against staged data BEFORE the Phase 3 import.
-- A violation aborts the whole transaction.
-- ============================================================


-- deals_stage_matches_category

select id, name, category, stage
from deals
where not (
    (category = 'assessment' and stage like 'assessment-%')
    or (category = 'build' and stage like 'build-%')
);


-- contacts_lead_source_valid

select id, first_name, last_name, lead_source
from contacts
where not (
    lead_source is null
    or lead_source in ('bni', 'referral', 'friend', 'event', 'other')
);


-- contacts_referred_by_not_self

select id, first_name, last_name
from contacts
where referred_by_id = id;