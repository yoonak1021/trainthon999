# Wave

Mobile-first longitudinal survey platform for psychology research — an alternative to Qualtrics / Google Forms focused on **repeated-measures** studies where the same participants answer over time.

## Stack

- React + Vite + TypeScript
- Tailwind CSS v4
- React Router
- Supabase (Postgres + Auth) — with a local demo store when env vars are unset

## Features

### Participant view
- Enter via persistent participant code
- One-item-at-a-time mobile flow with large touch targets, progress, and smooth transitions
- Polished Likert controls; slider / VAS / open text supported
- Responses saved per participant × item × prompt occasion

### Researcher view
- Create studies and surveys
- Add items from **8 validated scales** (bilingual KR/EN) or as custom items with export fields
- View collected data with `scoreAll()` scored table
- Export **Raw data**, **Scored data**, and **codebook** CSVs
- Edit per-scale protocol settings: response min/max, aggregation, missing-data rule

## Database

Full proposed schema with comments: [`supabase/schema.sql`](supabase/schema.sql)

Tables: `studies`, `participants`, `surveys`, `survey_items`, `prompts`, `prompt_occasions`, `responses`, plus library tables `instruments` / `instrument_items` (+ `response_export` view).

### Validated scales seed

Bilingual catalog (8 scales): [`supabase/seed/validated_scales.json`](supabase/seed/validated_scales.json)

```bash
# Apply schema, then:
psql "$DATABASE_URL" -f supabase/seed/validated_scales_seed.sql
# Or regenerate SQL after editing the JSON:
python3 scripts/generate_validated_scales_seed.py
```

In the researcher survey editor, **Choose from validated scales** lists these instruments and copies all items into the current survey (custom items can still be mixed in). Item text defaults to Korean with English available.

## Setup

```bash
npm install
cp .env.example .env   # fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
# Apply supabase/schema.sql in your Supabase SQL editor
npm run dev
```

Without Supabase credentials the app runs in **local demo mode** (browser `localStorage`) with a seeded study and participant code `DEMO01`.

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Routes

| Path | Role |
|------|------|
| `/` | Landing |
| `/p` | Participant code entry |
| `/take/:code` | Survey session |
| `/researcher` | Studies list |
| `/researcher/studies/:id` | Study detail |
| `/researcher/surveys/:id` | Survey item editor |
| `/researcher/studies/:id/responses` | Response table + CSV |
