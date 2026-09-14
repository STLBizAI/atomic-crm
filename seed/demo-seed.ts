// Generates seed/demo-seed.sql: plain INSERT statements for demo data,
// built on top of the existing FakeRest data generators. Makes no database
// connection and never touches src/ or supabase/.
//
// Usage: npx tsx seed/demo-seed.ts <your-sales-email>
//
// `process` is declared locally because this standalone script lives outside
// the project's tsconfig and so doesn't pick up the global @types/node.
declare const process: {
  argv: string[];
  exit(code?: number): never;
};

import { writeFileSync } from "node:fs";
import { register } from "node:module";

import {
  sqlBigIntArray,
  sqlBoolean,
  sqlJson,
  sqlJsonb,
  sqlNumber,
  sqlRow,
  sqlString,
} from "./sql-helpers";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx seed/demo-seed.ts <your-sales-email>");
  process.exit(1);
}

// Registered here (rather than via a separate --import flag) so the plain
// `npx tsx seed/demo-seed.ts <email>` invocation just works: register()
// takes effect before the dynamic import below runs, which is what lets it
// see the generator tree's .svg and faker imports (both Vite-only/bundler
// assumptions the generators were never meant to run without — see
// svg-stub-hooks.mjs for why). A static top-level import of the generator
// would resolve too early for this to help.
register(new URL("./svg-stub-hooks.mjs", import.meta.url));

const { default: generateData } = await import(
  "../src/components/atomic-crm/providers/fakerest/dataGenerator"
);

const db = generateData();

// ============================== Overrides ===================================

// 1. deals.category / deals.stage — coupled pair, must satisfy
//    deals_stage_matches_category. Values from src/App.tsx's dealStages.
const DEAL_STAGES_BY_CATEGORY: Record<string, string[]> = {
  assessment: [
    "assessment-proposed",
    "assessment-booked",
    "assessment-interview-held",
    "assessment-report-delivered",
    "assessment-followup-held",
    "assessment-won",
    "assessment-lost",
  ],
  build: [
    "build-scoped",
    "build-deposit-paid",
    "build-in-build",
    "build-live",
    "build-retainer",
    "build-complete",
    "build-cancelled",
  ],
};
const DEAL_CATEGORIES = Object.keys(DEAL_STAGES_BY_CATEGORY);

function pickRandom<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

const dealCategoryById = new Map<number, string>();
const dealStageById = new Map<number, string>();
for (const deal of db.deals) {
  const category = pickRandom(DEAL_CATEGORIES);
  const stage = pickRandom(DEAL_STAGES_BY_CATEGORY[category]);
  dealCategoryById.set(deal.id as number, category);
  dealStageById.set(deal.id as number, stage);
}

// Recompute deals.index per the *new* stage grouping — the generator's own
// index was computed against its generic built-in stages and is now stale.
const dealIdsByStage = new Map<string, number[]>();
for (const deal of db.deals) {
  const stage = dealStageById.get(deal.id as number)!;
  const ids = dealIdsByStage.get(stage) ?? [];
  ids.push(deal.id as number);
  dealIdsByStage.set(stage, ids);
}
const dealIndexById = new Map<number, number>();
for (const ids of dealIdsByStage.values()) {
  ids.forEach((id, index) => dealIndexById.set(id, index));
}

// 2. contacts.lead_source — random, ~20% null.
const LEAD_SOURCES = ["bni", "referral", "friend", "event", "other"];
const leadSourceByContactId = new Map<number, string | null>();
for (const contact of db.contacts) {
  leadSourceByContactId.set(
    contact.id as number,
    Math.random() < 0.2 ? null : pickRandom(LEAD_SOURCES),
  );
}

// 3. companies.industry_id — random 1-30 (30 rows currently seeded), ~20% null.
const INDUSTRY_ID_MIN = 1;
const INDUSTRY_ID_MAX = 30;
const industryIdByCompanyId = new Map<number, number | null>();
for (const company of db.companies) {
  industryIdByCompanyId.set(
    company.id as number,
    Math.random() < 0.2
      ? null
      : INDUSTRY_ID_MIN +
          Math.floor(Math.random() * (INDUSTRY_ID_MAX - INDUSTRY_ID_MIN + 1)),
  );
}

// 6. tasks.type — this app's real taskTypes (src/App.tsx), not the
//    generator's generic defaultTaskTypes.
const TASK_TYPES = [
  "none",
  "call",
  "email",
  "one-to-one",
  "meeting",
  "follow-up",
  "thank-you",
];
const taskTypeByTaskId = new Map<number, string>();
for (const task of db.tasks) {
  taskTypeByTaskId.set(task.id as number, pickRandom(TASK_TYPES));
}

// referred_by_id — ~1/3 of contacts, pointing at another contact, never self.
const allContactIds = db.contacts.map((c) => c.id as number);
const referredByUpdates: Array<{ id: number; refId: number }> = [];
for (const id of allContactIds) {
  if (Math.random() < 1 / 3) {
    let other: number;
    do {
      other = pickRandom(allContactIds);
    } while (other === id);
    referredByUpdates.push({ id, refId: other });
  }
}

// 4. Every sales_id resolves to the caller's own sales row at execution
//    time. The guard block aborts before any INSERT if it doesn't resolve.
const salesIdExpr = `(SELECT id FROM public.sales WHERE email = ${sqlString(email)})`;

// ============================== SQL emission ================================

const lines: string[] = [];

lines.push("-- Generated by seed/demo-seed.ts — do not edit by hand.");
lines.push("BEGIN;");
lines.push("");
lines.push("DO $guard$");
lines.push("BEGIN");
lines.push("  IF EXISTS (SELECT 1 FROM public.companies)");
lines.push("     OR EXISTS (SELECT 1 FROM public.contacts)");
lines.push("     OR EXISTS (SELECT 1 FROM public.deals) THEN");
lines.push(
  "    RAISE EXCEPTION 'demo-seed: companies, contacts, or deals already contain rows; refusing to seed a non-empty database';",
);
lines.push("  END IF;");
lines.push("");
lines.push(
  `  IF NOT EXISTS (SELECT 1 FROM public.sales WHERE email = ${sqlString(email)}) THEN`,
);
lines.push(
  `    RAISE EXCEPTION 'demo-seed: no sales row found for email %', ${sqlString(email)};`,
);
lines.push("  END IF;");
lines.push("END");
lines.push("$guard$;");
lines.push("");

// companies
lines.push(
  "INSERT INTO public.companies (id, created_at, name, sector, size, linkedin_url, website, phone_number, address, zipcode, city, state_abbr, sales_id, context_links, country, description, revenue, tax_identifier, logo, industry_id) VALUES",
);
lines.push(
  db.companies
    .map((c) =>
      sqlRow([
        sqlNumber(c.id as number),
        sqlString(c.created_at),
        sqlString(c.name),
        sqlString(c.sector),
        sqlNumber(c.size),
        sqlString(c.linkedin_url),
        sqlString(c.website),
        sqlString(c.phone_number),
        sqlString(c.address),
        sqlString(c.zipcode),
        sqlString(c.city),
        sqlString(c.state_abbr),
        salesIdExpr,
        sqlJson(c.context_links ?? []),
        sqlString(c.country),
        sqlString(c.description),
        sqlString(c.revenue),
        sqlString(c.tax_identifier),
        sqlJsonb(c.logo),
        sqlNumber(industryIdByCompanyId.get(c.id as number) ?? null),
      ]),
    )
    .join(",\n") + ";",
);
lines.push("");

// contacts
lines.push(
  "INSERT INTO public.contacts (id, first_name, last_name, gender, title, background, avatar, first_seen, last_seen, has_newsletter, status, tags, company_id, sales_id, linkedin_url, email_jsonb, phone_jsonb, lead_source) VALUES",
);
lines.push(
  db.contacts
    .map((contact) =>
      sqlRow([
        sqlNumber(contact.id as number),
        sqlString(contact.first_name),
        sqlString(contact.last_name),
        sqlString(contact.gender),
        sqlString(contact.title),
        sqlString(contact.background),
        sqlJsonb(contact.avatar),
        sqlString(contact.first_seen),
        sqlString(contact.last_seen),
        sqlBoolean(contact.has_newsletter),
        sqlString(contact.status),
        sqlBigIntArray([]),
        sqlNumber(contact.company_id as number),
        salesIdExpr,
        sqlString(contact.linkedin_url ?? null),
        sqlJsonb(contact.email_jsonb),
        sqlJsonb(contact.phone_jsonb),
        sqlString(leadSourceByContactId.get(contact.id as number) ?? null),
      ]),
    )
    .join(",\n") + ";",
);
lines.push("");

// contact_notes
lines.push(
  "INSERT INTO public.contact_notes (id, contact_id, text, date, sales_id, status, attachments) VALUES",
);
lines.push(
  db.contact_notes
    .map((note) =>
      sqlRow([
        sqlNumber(note.id as number),
        sqlNumber(note.contact_id as number),
        sqlString(note.text),
        sqlString(note.date),
        salesIdExpr,
        sqlString(note.status ?? null),
        "NULL",
      ]),
    )
    .join(",\n") + ";",
);
lines.push("");

// deals
lines.push(
  "INSERT INTO public.deals (id, name, company_id, contact_ids, category, stage, description, amount, created_at, updated_at, archived_at, expected_closing_date, sales_id, index) VALUES",
);
lines.push(
  db.deals
    .map((deal) =>
      sqlRow([
        sqlNumber(deal.id as number),
        sqlString(deal.name),
        sqlNumber(deal.company_id as number),
        sqlBigIntArray(deal.contact_ids as number[]),
        sqlString(dealCategoryById.get(deal.id as number)!),
        sqlString(dealStageById.get(deal.id as number)!),
        sqlString(deal.description),
        sqlNumber(deal.amount),
        sqlString(deal.created_at),
        sqlString(deal.updated_at),
        "NULL",
        sqlString(deal.expected_closing_date),
        salesIdExpr,
        sqlNumber(dealIndexById.get(deal.id as number)!),
      ]),
    )
    .join(",\n") + ";",
);
lines.push("");

// deal_notes
lines.push(
  "INSERT INTO public.deal_notes (id, deal_id, type, text, date, sales_id, attachments) VALUES",
);
lines.push(
  db.deal_notes
    .map((note) =>
      sqlRow([
        sqlNumber(note.id as number),
        sqlNumber(note.deal_id as number),
        "NULL",
        sqlString(note.text),
        sqlString(note.date),
        salesIdExpr,
        "NULL",
      ]),
    )
    .join(",\n") + ";",
);
lines.push("");

// tasks
lines.push(
  "INSERT INTO public.tasks (id, contact_id, type, text, due_date, done_date, sales_id) VALUES",
);
lines.push(
  db.tasks
    .map((task) =>
      sqlRow([
        sqlNumber(task.id as number),
        sqlNumber(task.contact_id as number),
        sqlString(taskTypeByTaskId.get(task.id as number)!),
        sqlString(task.text),
        sqlString(task.due_date),
        "NULL",
        salesIdExpr,
      ]),
    )
    .join(",\n") + ";",
);
lines.push("");

// referred_by_id — ~1/3 of contacts, computed above (never self).
if (referredByUpdates.length > 0) {
  lines.push("UPDATE public.contacts AS c SET referred_by_id = v.ref_id");
  lines.push("FROM (VALUES");
  lines.push(
    referredByUpdates.map((u) => `  (${u.id}, ${u.refId})`).join(",\n"),
  );
  lines.push(") AS v(id, ref_id)");
  lines.push("WHERE c.id = v.id;");
  lines.push("");
}

// Bump every sequence past the highest id we just inserted.
for (const table of [
  "companies",
  "contacts",
  "contact_notes",
  "deals",
  "deal_notes",
  "tasks",
]) {
  lines.push(
    `SELECT setval(pg_get_serial_sequence('public.${table}', 'id'), (SELECT max(id) FROM public.${table}));`,
  );
}
lines.push("");
lines.push("COMMIT;");
lines.push("");

const outputUrl = new URL("./demo-seed.sql", import.meta.url);
writeFileSync(outputUrl, lines.join("\n"));

//eslint-disable-next-line no-console
console.log(
  `Wrote seed/demo-seed.sql: ${db.companies.length} companies, ${db.contacts.length} contacts, ` +
    `${db.contact_notes.length} contact_notes, ${db.deals.length} deals, ${db.deal_notes.length} deal_notes, ` +
    `${db.tasks.length} tasks, ${referredByUpdates.length} referred_by_id updates.`,
);
