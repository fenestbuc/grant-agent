# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Grant Agent is an AI-powered platform helping Indian startup founders discover grants and auto-generate application answers. Built with Next.js 14 (App Router), Supabase (PostgreSQL + pgvector), and deployed on Vercel.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build (also runs TypeScript check)
npm run lint     # Run ESLint
npm run start    # Start production server
```

## Architecture

### Route Groups
- `app/(auth)/` - Login, signup (magic link via Supabase Auth)
- `app/(dashboard)/` - Protected routes requiring authentication and startup profile
- `app/onboarding/` - Startup profile creation for new users
- `app/auth/callback/` - OAuth/magic link callback handler

### Key Libraries
- **Supabase** (`lib/supabase/`): `client.ts` for browser, `server.ts` for Server Components/API routes, `middleware.ts` for session refresh
- **Inngest** (`lib/inngest/`): Background job processing for document uploads and deadline reminders
- **LLM** (`lib/llm/`): Claude for answer generation (`claude.ts`), OpenAI for embeddings (`document-processor.ts`)

### Database (Supabase)
Schema in `supabase/migrations/`:
- `grants` - Grant listings with JSONB eligibility_criteria and array sectors/stages
- `startups` - User startup profiles (one per auth.users)
- `kb_documents` / `kb_chunks` - Knowledge base with pgvector embeddings (1536 dimensions)
- `applications` - Grant application drafts with generated answers
- `watchlist` / `notifications` - User tracking features

Row Level Security enforces user-scoped access. Grants are publicly readable.

### Authentication Flow
1. User enters email → magic link sent via Supabase Auth
2. Callback at `/auth/callback` exchanges code for session
3. If no startup profile exists → redirect to `/onboarding`
4. Dashboard layout checks auth + startup profile on every request

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
- Supabase (database, auth, storage)
- OpenAI (embeddings)
- Anthropic (Claude for answer generation)
- Resend (email notifications)
- Inngest (background jobs)

## Type Definitions

All database and API types in `types/index.ts`. Key types: `Grant`, `Startup`, `KBDocument`, `KBChunk`, `Application`, `EligibilityCriteria`.
