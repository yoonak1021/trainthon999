# Survey Scale Builder

Client-side web app that turns validated psychological scales into a Qualtrics-importable survey.

## Features

- Search by scale name (e.g. `PSS-10`, `PHQ-9`) or plain-English constructs (e.g. “perceived stress”, “depression”)
- Build an editable survey preview with items, Likert anchors, and reverse-scored flags
- Export a downloadable `.txt` file in Qualtrics Advanced Format (Simple TXT)

## Included scales (hardcoded for now)

- **PSS-10** — Perceived Stress Scale (Cohen & Williamson, 1988)
- **PHQ-9** — Patient Health Questionnaire-9 (Kroenke et al., 2001)

## Stack

- React + Vite + TypeScript
- Tailwind CSS v4

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```
