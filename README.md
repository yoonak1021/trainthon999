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

## Deploy (Vercel + GitHub)

The GitHub repo is already public: [yoonak1021/trainthon999](https://github.com/yoonak1021/trainthon999).

Vercel cannot be connected from this environment (no Vercel account token). After you link the repo once in the Vercel dashboard, every push deploys automatically.

### 1. Connect GitHub → Vercel

1. Open [vercel.com/new](https://vercel.com/new) and sign in with **Continue with GitHub**.
2. Grant access to `yoonak1021/trainthon999` (or the whole account).
3. **Import** `trainthon999`.
4. Confirm the detected settings (also stored in `vercel.json`):
   - Framework: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
5. Environment variables — **optional**. Leave them empty to run **demo mode** (`DEMO01`). To use a live Supabase project, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Deploy**.

### 2. Use this branch as Production (important)

`main` is still the initial commit. The working app lives on `cursor/survey-scale-builder-e78f` (this PR).

In the Vercel project: **Settings → Git → Production Branch** → set to `cursor/survey-scale-builder-e78f` → **Save**. Then **Deployments → Redeploy** the latest commit on that branch.

After you merge this PR into `main`, switch Production Branch back to `main`.

### 3. What you get

| URL | When |
|---|---|
| `https://<project>.vercel.app` | Production (the Production Branch above) |
| Preview URL per commit / PR | Every push to other branches |

Deep links such as `/p`, `/researcher`, and `/take/DEMO01` work because `vercel.json` rewrites unknown paths to `index.html`.

### 한국어 요약

1. [vercel.com/new](https://vercel.com/new)에서 GitHub으로 로그인
2. `trainthon999` 저장소 Import
3. 설정은 비워도 됨 (데모 모드로 바로 동작, 참가자 코드 `DEMO01`)
4. **Settings → Git → Production Branch**를 `cursor/survey-scale-builder-e78f`로 변경 후 Redeploy
5. 이후 GitHub에 푸시하면 자동으로 다시 배포됩니다

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
