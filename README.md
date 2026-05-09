# Grant Agent

An AI-powered platform helping Indian startup founders discover grants and auto-generate application answers.

## Architecture

- **Frontend:** Next.js 16 (App Router), TailwindCSS, shadcn/ui
- **Backend:** NestJS (port 4000) for API services
- **Database:** Supabase (PostgreSQL + pgvector)
- **Background Jobs:** Inngest
- **AI Models:** Claude 3.5 Sonnet (generation), OpenAI text-embedding-3-large (embeddings)
- **Scraper:** Python + Modal.com + Crawl4AI

## Setup

### 1. Frontend (Next.js)

```bash
npm install
cp .env.example .env.local
# Fill in Supabase, OpenAI, Resend, and Inngest keys
npm run dev
```

### 2. Backend (NestJS)

```bash
cd backend
npm install
cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
npm run start:dev
```

### 3. Scraper (Modal)

```bash
cd scraper
pip install modal
modal setup
modal deploy modal_app.py
```

## Features

- **Grant Portal:** Filter by sector, stage, amount, provider type
- **Relevance Scoring:** Grants are matched against your startup profile
- **Knowledge Base:** Upload pitch decks, financials, and company docs
- **AI Application Generator:** RAG-powered answer generation specific to each grant
- **Watchlist & Reminders:** Save grants and get notified before deadlines
