alter table "public"."deals" alter column "category" set not null;

alter table "public"."contacts" add constraint "contacts_lead_source_valid" CHECK (((lead_source IS NULL) OR (lead_source = ANY (ARRAY['bni'::text, 'referral'::text, 'friend'::text, 'event'::text, 'other'::text])))) not valid;

alter table "public"."contacts" validate constraint "contacts_lead_source_valid";

alter table "public"."deals" add constraint "deals_stage_matches_category" CHECK ((((category = 'assessment'::text) AND (stage ~~ 'assessment-%'::text)) OR ((category = 'build'::text) AND (stage ~~ 'build-%'::text)))) not valid;

alter table "public"."deals" validate constraint "deals_stage_matches_category";

alter table "public"."industries" add constraint "industries_segment_valid" CHECK ((segment = ANY (ARRAY['Trades & Home Services'::text, 'Professional Services'::text, 'Real Estate & Property'::text, 'Health & Personal Services'::text, 'Other'::text]))) not valid;

alter table "public"."industries" validate constraint "industries_segment_valid";


