# Replace Demo Code with Real AI Integration - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hardcoded demo answers in the application page with real AI-generated answers using the existing `/api/applications/generate` endpoint.

**Architecture:** Remove ~150 lines of `DEMO_ANSWERS` object and `getPreseededAnswer()` function. Update `generateAnswer()` to call the real API. Keep typing animation UX. Add error handling.

**Tech Stack:** Next.js 14 (App Router), React hooks, existing Claude API endpoint

---

### Task 1: Add Error State

**Files:**
- Modify: `app/(dashboard)/applications/[grantId]/page.tsx:194-196`

**Step 1: Add errors state to component**

Find the existing state declarations (around line 194-196):
```typescript
const [answers, setAnswers] = useState<Record<string, string>>({});
const [generating, setGenerating] = useState<Record<string, boolean>>({});
const [generated, setGenerated] = useState<Record<string, boolean>>({});
```

Add after them:
```typescript
const [errors, setErrors] = useState<Record<string, string>>({});
```

**Step 2: Verify no TypeScript errors**

Run: `cd /home/yash/grant-agent && npx tsc --noEmit`
Expected: No errors (or only pre-existing ones)

**Step 3: Commit**

```bash
git add app/\(dashboard\)/applications/\[grantId\]/page.tsx
git commit -m "feat(applications): add error state for AI generation"
```

---

### Task 2: Update generateAnswer to Use Real API

**Files:**
- Modify: `app/(dashboard)/applications/[grantId]/page.tsx:210-227`

**Step 1: Replace generateAnswer function body**

Find the current `generateAnswer` function (around line 210-227):
```typescript
const generateAnswer = async (questionId: string, question: string) => {
  setGenerating((prev) => ({ ...prev, [questionId]: true }));

  // Simulate AI generation with typing effect
  const fullAnswer = getPreseededAnswer(question);
  // ... typing animation code
};
```

Replace with:
```typescript
const generateAnswer = async (questionId: string, question: string, maxLength?: number) => {
  setGenerating((prev) => ({ ...prev, [questionId]: true }));
  setErrors((prev) => ({ ...prev, [questionId]: '' }));

  try {
    // Call real AI generation API
    const res = await fetch('/api/applications/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        grantName: grant?.name,
        maxLength,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Generation failed');
    }

    const { data } = await res.json();
    const fullAnswer = data.answer;

    // Type out the answer character by character
    let currentAnswer = '';
    for (let i = 0; i < fullAnswer.length; i += 3) {
      currentAnswer = fullAnswer.slice(0, i + 3);
      setAnswers((prev) => ({ ...prev, [questionId]: currentAnswer }));
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    setAnswers((prev) => ({ ...prev, [questionId]: fullAnswer }));
    setGenerated((prev) => ({ ...prev, [questionId]: true }));
  } catch (error) {
    console.error('Generation error:', error);
    setErrors((prev) => ({
      ...prev,
      [questionId]: error instanceof Error ? error.message : 'Generation failed',
    }));
  } finally {
    setGenerating((prev) => ({ ...prev, [questionId]: false }));
  }
};
```

**Step 2: Update generateAllAnswers to pass maxLength**

Find `generateAllAnswers` (around line 229-237) and update to:
```typescript
const generateAllAnswers = async () => {
  if (!grant?.application_questions) return;

  for (const q of grant.application_questions) {
    if (!generated[q.id]) {
      await generateAnswer(q.id, q.question, q.max_length);
    }
  }
};
```

**Step 3: Update individual generate button onClick**

Find the onClick handler (around line 363) and update:
```typescript
onClick={() => generateAnswer(q.id, q.question, q.max_length)}
```

**Step 4: Verify no TypeScript errors**

Run: `cd /home/yash/grant-agent && npx tsc --noEmit`
Expected: No errors related to generateAnswer

**Step 5: Commit**

```bash
git add app/\(dashboard\)/applications/\[grantId\]/page.tsx
git commit -m "feat(applications): integrate real AI generation API

- Call /api/applications/generate instead of demo data
- Add error handling with try/catch
- Pass maxLength to API for character limits
- Keep typing animation UX"
```

---

### Task 3: Add Error Display in UI

**Files:**
- Modify: `app/(dashboard)/applications/[grantId]/page.tsx:431-436`

**Step 1: Add error message display**

Find the character count display (around line 431-436):
```typescript
{answers[q.id] && (
  <p className="text-xs text-muted-foreground mt-2">
    {answers[q.id].length} characters
    {q.max_length && ` / ${q.max_length} max`}
  </p>
)}
```

Add error display BEFORE the character count:
```typescript
{errors[q.id] && (
  <p className="text-sm text-red-600 mt-2">
    {errors[q.id]} - Click &quot;Generate with AI&quot; to retry
  </p>
)}
{answers[q.id] && (
  <p className="text-xs text-muted-foreground mt-2">
    {answers[q.id].length} characters
    {q.max_length && ` / ${q.max_length} max`}
  </p>
)}
```

**Step 2: Verify no TypeScript errors**

Run: `cd /home/yash/grant-agent && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/\(dashboard\)/applications/\[grantId\]/page.tsx
git commit -m "feat(applications): add error display for failed generation"
```

---

### Task 4: Remove Demo Code

**Files:**
- Modify: `app/(dashboard)/applications/[grantId]/page.tsx:12-184`

**Step 1: Remove DEMO_ANSWERS object**

Delete lines 12-151 (the entire `DEMO_ANSWERS` object):
```typescript
// Pre-seeded AI responses for demo
const DEMO_ANSWERS: Record<string, string> = {
  'product_problem': `Our platform...`,
  // ... all the hardcoded answers
};
```

**Step 2: Remove getPreseededAnswer function**

Delete lines 153-184 (the `getPreseededAnswer` function):
```typescript
// Map question keywords to pre-seeded answers
function getPreseededAnswer(question: string): string {
  // ... all the mapping logic
}
```

**Step 3: Verify no TypeScript errors**

Run: `cd /home/yash/grant-agent && npx tsc --noEmit`
Expected: No errors (DEMO_ANSWERS and getPreseededAnswer should no longer be referenced)

**Step 4: Commit**

```bash
git add app/\(dashboard\)/applications/\[grantId\]/page.tsx
git commit -m "refactor(applications): remove demo code

- Remove DEMO_ANSWERS object (~140 lines)
- Remove getPreseededAnswer function (~30 lines)
- Real AI generation now active"
```

---

### Task 5: Manual Testing

**Step 1: Start dev server**

Run: `cd /home/yash/grant-agent && npm run dev`
Expected: Server starts on localhost:3000

**Step 2: Verify environment**

Check that `ANTHROPIC_API_KEY` is set in `.env.local`

**Step 3: Test single question generation**

1. Log in to the app
2. Navigate to Grants → click any grant → Start Application
3. Click "Generate with AI" on one question
4. Verify: Real answer appears with typing animation
5. Verify: Answer is contextual (mentions startup name if KB docs exist)

**Step 4: Test "Generate All" button**

1. Click "Generate All Answers with AI"
2. Verify: All questions get answered sequentially with typing animation

**Step 5: Test error handling**

1. Temporarily set invalid API key in `.env.local`
2. Restart dev server
3. Try generating an answer
4. Verify: Error message appears under textarea
5. Restore valid API key

**Step 6: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(applications): address issues found in testing"
```

---

## Summary

| Task | Description | Lines Changed |
|------|-------------|---------------|
| 1 | Add error state | +1 |
| 2 | Integrate real API | +35, -15 |
| 3 | Add error display | +5 |
| 4 | Remove demo code | -170 |
| 5 | Manual testing | 0 |

**Total: ~130 lines removed (net)**
