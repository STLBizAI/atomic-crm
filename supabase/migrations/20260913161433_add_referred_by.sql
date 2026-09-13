alter table "public"."contacts" add column "referred_by_id" bigint;

CREATE INDEX contacts_referred_by_id_idx ON public.contacts USING btree (referred_by_id);

alter table "public"."contacts" add constraint "contacts_referred_by_id_fkey" FOREIGN KEY (referred_by_id) REFERENCES public.contacts(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."contacts" validate constraint "contacts_referred_by_id_fkey";

alter table "public"."contacts" add constraint "contacts_referred_by_not_self" CHECK ((referred_by_id <> id)) not valid;

alter table "public"."contacts" validate constraint "contacts_referred_by_not_self";


