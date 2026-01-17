# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Grant Agent is an AI-powered platform helping Indian startup founders discover grants and auto-generate application answers. Built with Next.js 16 (App Router), Supabase (PostgreSQL + pgvector), and deployed on Vercel.

## Commands

```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build (also runs TypeScript check)
npm run lint         # Run ESLint
npm run test         # Run all tests (vitest)
npm run test:unit    # Run unit/integration tests once
npm run test:e2e     # Run Playwright E2E tests
npm run test:e2e:ui  # Run E2E tests with Playwright UI
npm run test:ci      # Run unit + E2E tests (CI)
```

### Testing

Tests are in `tests/` with this structure:
- `tests/unit/` - Unit tests for components and utilities
- `tests/integration/` - API route integration tests (uses MSW for mocking)
- `tests/e2e/` - Playwright end-to-end tests
- `tests/mocks/` - MSW request handlers
- `tests/fixtures/` - Test data fixtures

Run a single test file:
```bash
npx vitest run tests/integration/api/grants.test.ts
npx playwright test tests/e2e/some-test.spec.ts --project=chromium
```

### Database Migrations

```bash
supabase db push                    # Push migrations to remote Supabase
supabase migration new <name>       # Create new migration
supabase db reset                   # Reset local database
```

Note: Use `gen_random_uuid()` instead of `uuid_generate_v4()` in migrations (built into PostgreSQL 13+).

## Architecture

### Route Groups
- `app/(auth)/` - Login, signup (magic link via Supabase Auth)
- `app/(dashboard)/` - Protected routes requiring authentication and startup profile
- `app/onboarding/` - Startup profile creation for new users
- `app/auth/callback/` - OAuth/magic link callback handler

### Key Libraries
- **Supabase** (`lib/supabase/`): `client.ts` for browser, `server.ts` for Server Components/API routes, `middleware.ts` for session refresh and auth callback handling
- **Inngest** (`lib/inngest/`): Background job processing for document uploads and deadline reminders
- **LLM** (`lib/llm/`): GPT-4o-mini for answer generation (`answer-generator.ts`), OpenAI for embeddings (`document-processor.ts`)
- **Sentry** (`sentry.*.config.ts`): Error tracking with replay integration

### Database (Supabase)
Schema in `supabase/migrations/`:
- `grants` - Grant listings with JSONB eligibility_criteria and array sectors/stages
- `startups` - User startup profiles (one per auth.users), includes usage tracking fields
- `kb_documents` / `kb_chunks` - Knowledge base with pgvector embeddings (1536 dimensions)
- `applications` - Grant application drafts with generated answers
- `watchlist` / `notifications` - User tracking features
- `user_submitted_grants` - User-submitted grant URLs pending review
- `answer_edits` - Tracks user edits to generated answers

Row Level Security enforces user-scoped access. Grants are publicly readable.

### Usage Limits
- Lifetime answer generation limit tracked in `startups.answers_generated`
- Daily application limit tracked in `startups.applications_today` (resets at midnight IST)
- RPC functions: `increment_answers_generated`, `reset_daily_applications`

### Authentication Flow
1. User enters email → magic link sent via Supabase Auth (PKCE flow)
2. Magic link redirects to configured `site_url` (must include `/auth/callback` path)
3. Middleware at `lib/supabase/middleware.ts` intercepts `/auth/callback`, exchanges code for session
4. Session cookies are set on the response, user redirected to `/grants` or `/onboarding`
5. Dashboard layout checks auth + startup profile on every request

**Critical**: Supabase project's `site_url` must be set to `https://your-domain.com/auth/callback` (not just base URL) for magic links to work correctly.

### Document Processing Pipeline (Inngest)
1. File uploaded to Supabase Storage
2. `kb/document.uploaded` event triggers `processDocument` function
3. Text extracted (PDF via pdf-parse, DOCX via mammoth)
4. Metadata extracted via Claude
5. Text chunked (500 chars, 50 overlap)
6. Embeddings generated via OpenAI text-embedding-3-large
7. Chunks stored in kb_chunks with vector column

### UI Components
Uses shadcn/ui (`components/ui/`). Custom components in `components/grants/`, `components/kb/`, `components/applications/`, `components/layout/`.

## Environment Variables

Copy `.env.example` to `.env.local`. Required services:
- Supabase (database, auth, storage): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- OpenAI (embeddings + answer generation): `OPENAI_API_KEY`
- Resend (email notifications): `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- Inngest (background jobs): `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- Sentry (error tracking): `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
- App URL: `NEXT_PUBLIC_APP_URL` (used for auth redirects)

For Vercel deployment, ensure all env vars are added via `vercel env add`.

## Type Definitions

All database and API types in `types/index.ts`. Key types: `Grant`, `Startup`, `KBDocument`, `KBChunk`, `Application`, `EligibilityCriteria`.

## Scraper (Modal + Crawl4AI)

Python serverless scraper in `scraper/`:
- `modal_app.py` - Main scraper using Crawl4AI and Claude for extraction
- Deploys to Modal.com (scales to zero)
- Triggered weekly via Vercel Cron or manually via `/api/cron/trigger-scrape`

Setup: See `scraper/README.md` for Modal secrets configuration.

## Database Seeding

- `supabase/seed.sql` - Initial 12 grants (government schemes)
- `supabase/seed_additional_grants.sql` - Additional 15 grants (state + CSR)

Run via Supabase SQL Editor or CLI after migrations.

## Deployment

Production is on Vercel (https://grant-agent-sigma.vercel.app) with remote Supabase.

Deploy commands:
```bash
vercel --prod                       # Deploy to production
vercel env add <VAR_NAME>           # Add environment variable
```

After database schema changes:
1. Update migration file in `supabase/migrations/`
2. Run `supabase db push` with Supabase access token
3. Redeploy to Vercel if code changes required

## API Routes

All API routes in `app/api/`:
- `grants/` - Grant listing and filtering
- `applications/` - Application CRUD and answer generation
- `kb/` - Knowledge base document management
- `watchlist/` - User grant watchlist
- `notifications/` - User notifications
- `user-grants/` - User-submitted grants
- `usage/` - Usage limit status
- `inngest/` - Inngest webhook handler
