-- =============================================================================
-- Longitudinal Survey Platform — Proposed Database Schema
-- =============================================================================
-- Design goals:
--   1. Persistent participant identity within a study (stable participant_code),
--      kept separate from any PII so response exports can stay anonymized.
--   2. Repeated-measures support: the same survey can be delivered many times
--      via prompts/occasions; each response is tied to one occasion.
--   3. Research-ready item metadata (variable_name, scale, reverse scoring,
--      subscale, numeric coding) so exports join cleanly across time.
--   4. Validated-scale items and custom items share one survey_items shape;
--      they differ only by source metadata.
-- =============================================================================

-- Enable UUID generation (available by default on Supabase).
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- studies
-- A research project owned by a researcher (auth.users). One study can have
-- many surveys, participants, and longitudinal prompts.
-- ---------------------------------------------------------------------------
create table public.studies (
  id            uuid primary key default gen_random_uuid(),
  -- Researcher who owns this study (Supabase Auth user).
  owner_id      uuid not null references auth.users (id) on delete cascade,
  title         text not null,
  description   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index studies_owner_id_idx on public.studies (owner_id);

comment on table public.studies is
  'Research study container. Owns surveys, participants, and schedules.';

-- ---------------------------------------------------------------------------
-- participants
-- Persistent identity WITHIN a study. participant_code is the only handle
-- participants use (via magic links / QR / SMS). No name, email, or other
-- identifying columns live here — keep a separate consent/roster table if
-- you ever need to map codes to people, and never join it into response
-- exports by default.
-- ---------------------------------------------------------------------------
create table public.participants (
  id                uuid primary key default gen_random_uuid(),
  study_id          uuid not null references public.studies (id) on delete cascade,
  -- Stable, human-readable code unique within the study (e.g. P001, A7K2).
  -- Used for entry links and for joining responses across occasions.
  participant_code  text not null,
  -- Optional metadata that is NOT identifying (e.g. assigned condition arm).
  condition_label   text,
  active            boolean not null default true,
  enrolled_at       timestamptz not null default now(),
  created_at        timestamptz not null default now(),

  constraint participants_study_code_unique unique (study_id, participant_code)
);

create index participants_study_id_idx on public.participants (study_id);
create index participants_code_idx on public.participants (participant_code);

comment on table public.participants is
  'Anonymized persistent participant identity within a study.';
comment on column public.participants.participant_code is
  'Stable code used across all survey occasions; not PII.';

-- ---------------------------------------------------------------------------
-- surveys
-- A questionnaire belonging to a study. The same survey row can be delivered
-- many times via prompts (daily diary, weekly follow-up, etc.).
-- ---------------------------------------------------------------------------
create table public.surveys (
  id              uuid primary key default gen_random_uuid(),
  study_id        uuid not null references public.studies (id) on delete cascade,
  title           text not null,
  description     text,
  -- Shown once at the start of a session (scale instructions, etc.).
  instructions    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index surveys_study_id_idx on public.surveys (study_id);

comment on table public.surveys is
  'Survey instrument belonging to a study; may be administered repeatedly.';

-- ---------------------------------------------------------------------------
-- Item type enum
-- Covers the response UIs the participant app renders.
-- ---------------------------------------------------------------------------
create type public.item_type as enum (
  'single_choice',   -- one option from a coded list
  'multiple_choice', -- one or more options from a coded list
  'likert',          -- ordered anchors (classic Likert / rating scale)
  'slider',          -- discrete or continuous slider with labeled anchors
  'visual_analog',   -- continuous VAS (stored 0–100 by default)
  'open_text'        -- free-text response
);

create type public.item_source as enum (
  'validated_scale', -- pre-filled from a known instrument (e.g. SWLS)
  'custom'           -- created manually by the researcher
);

-- ---------------------------------------------------------------------------
-- instruments (validated scale library)
-- Reference catalog of published instruments. Researchers pick from this
-- library; items are then *copied* into survey_items for a specific survey.
-- Seeded from supabase/seed/validated_scales_seed.sql.
-- ---------------------------------------------------------------------------
create table public.instruments (
  -- Stable machine id (e.g. 'swls', 'tipi'). Also used as source_scale_id.
  scale_id          text primary key,
  name_kr           text not null,
  name_en           text not null,
  source            text,            -- citation / origin
  -- e.g. {"type":"likert","points":7,"anchors_proposed_en":"...","verified":false}
  response_scale    jsonb not null,
  scoring_note      text,
  created_at        timestamptz not null default now()
);

comment on table public.instruments is
  'Validated psychology scale catalog (library). Not survey-specific.';

-- ---------------------------------------------------------------------------
-- instrument_items
-- Library item rows. Preserves every field from the seed JSON. When a
-- researcher adds a scale to a survey, these rows are copied into
-- survey_items (same research metadata + bilingual text).
-- ---------------------------------------------------------------------------
create table public.instrument_items (
  id                  uuid primary key default gen_random_uuid(),
  scale_id            text not null references public.instruments (scale_id) on delete cascade,
  variable_name       text not null,
  position_in_scale   integer not null,
  subscale            text,
  reverse_scored      boolean not null default false,
  -- Korean is the validated administered wording; English is the source wording.
  text_kr             text not null,
  text_en             text not null,
  created_at          timestamptz not null default now(),

  constraint instrument_items_scale_variable_unique unique (scale_id, variable_name),
  constraint instrument_items_scale_position_unique unique (scale_id, position_in_scale)
);

create index instrument_items_scale_id_idx on public.instrument_items (scale_id);

comment on table public.instrument_items is
  'Template items for a validated instrument; copied into survey_items on pick.';

-- ---------------------------------------------------------------------------
-- survey_items
-- One question within a survey. Validated-scale and custom items share this
-- table so export logic is identical. Research metadata (variable_name,
-- scale_name, position_in_scale, reverse_scored, subscale) is first-class.
-- ---------------------------------------------------------------------------
create table public.survey_items (
  id                  uuid primary key default gen_random_uuid(),
  survey_id           uuid not null references public.surveys (id) on delete cascade,

  -- Presentation / response modality
  item_type           public.item_type not null,
  -- Administered text (defaults to Korean for validated scales).
  item_text           text not null,
  -- Bilingual wording. Korean is default for participants; English available.
  item_text_kr        text,
  item_text_en        text,
  -- Display order within the survey session (1-based).
  display_order       integer not null,

  -- Response options with numeric coding, e.g.
  -- [{"label":"Never","label_kr":"전혀 아니다","label_en":"Never","value":0}, ...]
  -- Null for open_text / visual_analog (VAS uses min/max instead).
  response_options    jsonb,

  -- Continuous controls (slider / VAS)
  min_value           numeric,
  max_value           numeric,
  step_value          numeric,
  left_anchor         text,   -- e.g. "Not at all" (legacy / current locale)
  right_anchor        text,
  left_anchor_kr      text,
  left_anchor_en      text,
  right_anchor_kr     text,
  right_anchor_en     text,

  -- ---- Research export fields (critical for longitudinal analysis) ----
  -- Column name in a wide export (e.g. swls_1). Unique within a survey.
  variable_name       text not null,
  -- Scale this item belongs to (e.g. 'SWLS'). Null for one-off custom items.
  scale_name          text,
  scale_name_kr       text,
  scale_name_en       text,
  -- 1-based position within that scale (for reverse-scoring & scoring scripts).
  position_in_scale   integer,
  -- When true, invert the coded value before summing.
  reverse_scored      boolean not null default false,
  -- Optional subscale label within a multi-factor instrument.
  subscale            text,

  -- Provenance: same shape whether from a validated library or hand-built.
  source              public.item_source not null default 'custom',
  -- e.g. 'swls' when source = validated_scale; null for custom.
  source_scale_id     text references public.instruments (scale_id),

  created_at          timestamptz not null default now(),

  constraint survey_items_survey_variable_unique unique (survey_id, variable_name),
  constraint survey_items_survey_order_unique unique (survey_id, display_order)
);

create index survey_items_survey_id_idx on public.survey_items (survey_id);
create index survey_items_scale_name_idx on public.survey_items (scale_name);
create index survey_items_source_scale_id_idx on public.survey_items (source_scale_id);

comment on table public.survey_items is
  'Survey questions with response coding and research export metadata.';
comment on column public.survey_items.variable_name is
  'Stable export column name; unique per survey.';
comment on column public.survey_items.reverse_scored is
  'If true, invert numeric coding before scale scoring.';
comment on column public.survey_items.item_text_kr is
  'Korean item wording (default administered language).';
comment on column public.survey_items.item_text_en is
  'English item wording (original / alternate language).';

-- ---------------------------------------------------------------------------
-- prompts (scheduled administrations)
-- Links a survey to a repeating schedule so participants are re-prompted over
-- time (e.g. daily for 14 days). Individual delivery moments are rows in
-- prompt_occasions.
-- ---------------------------------------------------------------------------
create table public.prompts (
  id                      uuid primary key default gen_random_uuid(),
  survey_id               uuid not null references public.surveys (id) on delete cascade,
  -- Human label shown to researchers (e.g. "Daily diary — Week 1", "EMA 3x/day").
  label                   text not null,
  -- Free-text schedule description for now (extensible to rrule later).
  -- Examples: "daily for 14 days", "weekly on Monday for 8 weeks", "3x daily EMA".
  schedule_summary        text,
  -- Structured cadence hints: 'daily_diary' | 'ema_momentary' | 'weekly_wave' | 'pre_post' | 'custom'
  cadence                 text,
  times_per_day           integer default 1,
  delivery_times          jsonb,               -- e.g. ["09:00", "14:00", "20:00"]
  response_window_minutes integer default 1440, -- e.g. 60 (1 hr EMA), 1440 (24 hrs)
  duration_days           integer,
  starts_at               timestamptz,
  ends_at                 timestamptz,
  active                  boolean not null default true,
  created_at              timestamptz not null default now()
);

create index prompts_survey_id_idx on public.prompts (survey_id);

comment on table public.prompts is
  'Schedule definition that generates repeated survey administrations.';

-- ---------------------------------------------------------------------------
-- prompt_occasions
-- One concrete "wave" / timepoint when participants should (or did) answer.
-- Responses join here so you can compare the same person across occasions.
-- ---------------------------------------------------------------------------
create table public.prompt_occasions (
  id                uuid primary key default gen_random_uuid(),
  prompt_id         uuid not null references public.prompts (id) on delete cascade,
  -- 1-based index within the prompt (Day 1, Day 2, … Wave 3, …).
  occasion_index    integer not null,
  -- Optional human label (e.g. "Day 3", "T2 — Post", "Day 1 (09:00)").
  label             text,
  -- When this occasion was (or is) scheduled; used for adherence metrics.
  scheduled_for     timestamptz,
  -- When the response window for this wave expires.
  window_closes_at  timestamptz,
  created_at        timestamptz not null default now(),

  constraint prompt_occasions_prompt_index_unique unique (prompt_id, occasion_index)
);

create index prompt_occasions_prompt_id_idx on public.prompt_occasions (prompt_id);

comment on table public.prompt_occasions is
  'Concrete administration timepoint; responses attach here for longitudinal joins.';

-- ---------------------------------------------------------------------------
-- responses
-- One participant's answer to one item at one occasion. Timestamped so you
-- can reconstruct session timing. Unique on (participant, item, occasion)
-- so re-answers upsert rather than duplicate.
-- ---------------------------------------------------------------------------
create table public.responses (
  id                  uuid primary key default gen_random_uuid(),
  participant_id      uuid not null references public.participants (id) on delete cascade,
  survey_item_id      uuid not null references public.survey_items (id) on delete cascade,
  prompt_occasion_id  uuid not null references public.prompt_occasions (id) on delete cascade,

  -- Numeric coding (Likert value, slider position, VAS 0–100, single-choice value).
  numeric_value       numeric,
  -- Free text for open_text items (or optional comment fields later).
  text_value          text,
  -- For multiple_choice: array of selected option values, e.g. [0, 2, 3].
  selected_values     jsonb,

  -- Client-reported answer time (may differ slightly from created_at).
  answered_at         timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint responses_participant_item_occasion_unique
    unique (participant_id, survey_item_id, prompt_occasion_id)
);

create index responses_participant_id_idx on public.responses (participant_id);
create index responses_occasion_id_idx on public.responses (prompt_occasion_id);
create index responses_item_id_idx on public.responses (survey_item_id);
create index responses_answered_at_idx on public.responses (answered_at);

comment on table public.responses is
  'Single item answer for one participant at one prompt occasion.';
comment on column public.responses.numeric_value is
  'Coded numeric response used for scoring and longitudinal analysis.';

-- ---------------------------------------------------------------------------
-- Helpful view: wide-ready longitudinal join
-- Researchers can select from this for CSV export pipelines.
-- ---------------------------------------------------------------------------
create or replace view public.response_export as
select
  st.id                         as study_id,
  st.title                      as study_title,
  p.participant_code,
  p.condition_label,
  s.id                          as survey_id,
  s.title                       as survey_title,
  pr.id                         as prompt_id,
  pr.label                      as prompt_label,
  po.occasion_index,
  po.label                      as occasion_label,
  po.scheduled_for,
  si.variable_name,
  si.scale_name,
  si.position_in_scale,
  si.subscale,
  si.reverse_scored,
  si.item_type,
  r.numeric_value,
  r.text_value,
  r.selected_values,
  r.answered_at
from public.responses r
join public.participants p       on p.id = r.participant_id
join public.survey_items si      on si.id = r.survey_item_id
join public.prompt_occasions po  on po.id = r.prompt_occasion_id
join public.prompts pr           on pr.id = po.prompt_id
join public.surveys s            on s.id = si.survey_id
join public.studies st           on st.id = s.study_id;

comment on view public.response_export is
  'Denormalized longitudinal export: participant × occasion × variable.';

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger studies_set_updated_at
  before update on public.studies
  for each row execute function public.set_updated_at();

create trigger surveys_set_updated_at
  before update on public.surveys
  for each row execute function public.set_updated_at();

create trigger responses_set_updated_at
  before update on public.responses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (proposed policies — enable once Auth is wired)
-- Researchers: full CRUD on their own studies' rows.
-- Participants: insert/update only their own responses, read their items.
-- ---------------------------------------------------------------------------
alter table public.studies enable row level security;
alter table public.participants enable row level security;
alter table public.surveys enable row level security;
alter table public.survey_items enable row level security;
alter table public.prompts enable row level security;
alter table public.prompt_occasions enable row level security;
alter table public.responses enable row level security;
alter table public.instruments enable row level security;
alter table public.instrument_items enable row level security;

-- Validated scale library is readable by everyone (needed for researcher picker
-- and for documenting administered wording). Writes happen via seed/SQL only.
create policy "Public read instruments"
  on public.instruments for select using (true);

create policy "Public read instrument_items"
  on public.instrument_items for select using (true);

-- Owner can manage their studies.
create policy "Owners manage studies"
  on public.studies
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Owner can manage child rows via study ownership.
create policy "Owners manage participants"
  on public.participants for all
  using (exists (
    select 1 from public.studies st
    where st.id = study_id and st.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.studies st
    where st.id = study_id and st.owner_id = auth.uid()
  ));

create policy "Owners manage surveys"
  on public.surveys for all
  using (exists (
    select 1 from public.studies st
    where st.id = study_id and st.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.studies st
    where st.id = study_id and st.owner_id = auth.uid()
  ));

create policy "Owners manage survey_items"
  on public.survey_items for all
  using (exists (
    select 1 from public.surveys s
    join public.studies st on st.id = s.study_id
    where s.id = survey_id and st.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.surveys s
    join public.studies st on st.id = s.study_id
    where s.id = survey_id and st.owner_id = auth.uid()
  ));

create policy "Owners manage prompts"
  on public.prompts for all
  using (exists (
    select 1 from public.surveys s
    join public.studies st on st.id = s.study_id
    where s.id = survey_id and st.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.surveys s
    join public.studies st on st.id = s.study_id
    where s.id = survey_id and st.owner_id = auth.uid()
  ));

create policy "Owners manage prompt_occasions"
  on public.prompt_occasions for all
  using (exists (
    select 1 from public.prompts pr
    join public.surveys s on s.id = pr.survey_id
    join public.studies st on st.id = s.study_id
    where pr.id = prompt_id and st.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.prompts pr
    join public.surveys s on s.id = pr.survey_id
    join public.studies st on st.id = s.study_id
    where pr.id = prompt_id and st.owner_id = auth.uid()
  ));

create policy "Owners read responses"
  on public.responses for select
  using (exists (
    select 1 from public.participants p
    join public.studies st on st.id = p.study_id
    where p.id = participant_id and st.owner_id = auth.uid()
  ));

-- Public read of survey structure for participant sessions (tighten later
-- with signed tokens / anon policies scoped by participant code).
create policy "Public can read surveys for participation"
  on public.surveys for select
  using (true);

create policy "Public can read survey_items for participation"
  on public.survey_items for select
  using (true);

create policy "Public can read prompt_occasions for participation"
  on public.prompt_occasions for select
  using (true);

create policy "Public can read prompts for participation"
  on public.prompts for select
  using (true);

-- Participants submit responses via the anon key + participant code flow.
-- In production, gate this with a short-lived session token; for the foundation
-- we allow insert/update when the participant row exists and is active.
create policy "Active participants can write responses"
  on public.responses for insert
  with check (exists (
    select 1 from public.participants p
    where p.id = participant_id and p.active = true
  ));

create policy "Active participants can update own responses"
  on public.responses for update
  using (exists (
    select 1 from public.participants p
    where p.id = participant_id and p.active = true
  ))
  with check (exists (
    select 1 from public.participants p
    where p.id = participant_id and p.active = true
  ));
