-- Migration: instruments library + bilingual survey_items fields
-- Apply after the base schema if upgrading an existing project.

create table if not exists public.instruments (
  scale_id          text primary key,
  name_kr           text not null,
  name_en           text not null,
  source            text,
  response_scale    jsonb not null,
  scoring_note      text,
  created_at        timestamptz not null default now()
);

create table if not exists public.instrument_items (
  id                  uuid primary key default gen_random_uuid(),
  scale_id            text not null references public.instruments (scale_id) on delete cascade,
  variable_name       text not null,
  position_in_scale   integer not null,
  subscale            text,
  reverse_scored      boolean not null default false,
  text_kr             text not null,
  text_en             text not null,
  created_at          timestamptz not null default now(),
  constraint instrument_items_scale_variable_unique unique (scale_id, variable_name),
  constraint instrument_items_scale_position_unique unique (scale_id, position_in_scale)
);

create index if not exists instrument_items_scale_id_idx
  on public.instrument_items (scale_id);

alter table public.survey_items
  add column if not exists item_text_kr text,
  add column if not exists item_text_en text,
  add column if not exists left_anchor_kr text,
  add column if not exists left_anchor_en text,
  add column if not exists right_anchor_kr text,
  add column if not exists right_anchor_en text,
  add column if not exists scale_name_kr text,
  add column if not exists scale_name_en text;

-- source_scale_id FK (ignore if already present / type mismatch)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'survey_items_source_scale_id_fkey'
      and table_name = 'survey_items'
  ) then
    begin
      alter table public.survey_items
        add constraint survey_items_source_scale_id_fkey
        foreign key (source_scale_id) references public.instruments (scale_id);
    exception when others then
      raise notice 'Could not add source_scale_id FK: %', SQLERRM;
    end;
  end if;
end $$;

alter table public.instruments enable row level security;
alter table public.instrument_items enable row level security;

drop policy if exists "Public read instruments" on public.instruments;
create policy "Public read instruments"
  on public.instruments for select using (true);

drop policy if exists "Public read instrument_items" on public.instrument_items;
create policy "Public read instrument_items"
  on public.instrument_items for select using (true);

-- Then run: supabase/seed/validated_scales_seed.sql
