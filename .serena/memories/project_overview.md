# Grant Agent Project Overview

## Purpose
AI-powered platform helping Indian startup founders discover grants and auto-generate application answers.

## Tech Stack
- Next.js 14 (App Router)
- Supabase (PostgreSQL + pgvector)
- TypeScript
- Tailwind CSS 4
- shadcn/ui components
- Claude for answer generation
- OpenAI for embeddings
- Inngest for background jobs
- Vercel deployment

## Key Directories
- `app/(auth)/` - Login, signup
- `app/(dashboard)/` - Protected routes
- `app/onboarding/` - Startup profile creation
- `app/api/` - API routes
- `components/ui/` - shadcn/ui components
- `components/` - Custom components
- `lib/` - Utility libraries
- `types/` - TypeScript type definitions

## Code Style
- Client components use 'use client' directive
- React hooks (useState, useEffect, useCallback)
- Optimistic updates for better UX
- Types from @/types
- Components from @/components/ui
