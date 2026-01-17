# Design: Replace Demo Code with Real AI Integration

**Date:** 2026-01-17
**Status:** Approved
**Author:** Claude

## Overview

Replace hardcoded demo answers in the application page with real AI-generated answers using the existing `/api/applications/generate` endpoint.

## Problem

The `app/(dashboard)/applications/[grantId]/page.tsx` file contains ~150 lines of hardcoded demo responses (`DEMO_ANSWERS`) that were used for a presentation demo. This needs to be replaced with real AI integration.

## Solution

### What Changes

**File:** `app/(dashboard)/applications/[grantId]/page.tsx`

**Remove:**
- `DEMO_ANSWERS` object (lines 12-151) - 8 hardcoded fake responses
- `getPreseededAnswer()` function (lines 153-184) - maps questions to fake answers

**Update:**
- `generateAnswer()` function to call `/api/applications/generate` API instead of using fake data
- Add error state and handling for API failures

**Keep:**
- Typing animation (characters stream in 3 at a time, 5ms delay)
- All UI components, layout, and styling
- "Generate All Answers" button functionality

### API Integration

```typescript
// Call real API
const res = await fetch('/api/applications/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question,
    grantName: grant?.name,
    maxLength: questionMaxLength
  }),
});

if (!res.ok) {
  throw new Error('Generation failed');
}

const { data } = await res.json();
const fullAnswer = data.answer;
```

### Error Handling

- Add `errors` state to track per-question errors
- Display inline error message under textarea on failure
- Allow retry by clicking "Generate with AI" again
- Don't block other questions from generating

### Existing Infrastructure (No Changes Needed)

- `/api/applications/generate` - Already implements full RAG pipeline:
  - Fetches user's startup profile
  - Searches KB documents using vector similarity
  - Calls Claude API with context
  - Returns answer with sources
- `lib/llm/claude.ts` - Claude client utilities
- KB upload flow - Already populates chunks for RAG

## Impact

- **Lines removed:** ~150 (demo code)
- **Lines added:** ~20 (API call + error handling)
- **Net change:** ~130 lines removed
- **Files affected:** 1

## Testing

1. Verify `ANTHROPIC_API_KEY` is set in `.env.local`
2. Upload a test document to Knowledge Base
3. Navigate to any grant → Start Application
4. Click "Generate with AI" on any question
5. Confirm real, contextual answer appears with typing animation
6. Test error handling by temporarily breaking API key
