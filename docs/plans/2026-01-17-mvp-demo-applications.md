# MVP Demo Applications Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Applications pages with pre-seeded AI responses for a live demo showcasing the full Grant Agent flow.

**Architecture:** Two new pages - `/applications` (list of draft applications) and `/applications/[grantId]` (AI answer generation UI). Answers are pre-seeded for demo reliability. Uses existing UI components and patterns.

**Tech Stack:** Next.js 14 App Router, Supabase, shadcn/ui components, TypeScript

---

## Task 1: Create Applications List Page

**Files:**
- Create: `app/(dashboard)/applications/page.tsx`

**Step 1: Create the applications list page**

```tsx
// app/(dashboard)/applications/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: startup } = await supabase
    .from('startups')
    .select('id')
    .eq('user_id', user?.id)
    .single();

  // Get applications with grant info
  const { data: applications } = await supabase
    .from('applications')
    .select(`
      *,
      grants:grant_id (
        id,
        name,
        provider,
        provider_type,
        deadline,
        amount_max
      )
    `)
    .eq('startup_id', startup?.id)
    .order('updated_at', { ascending: false });

  // Get grants for "Start New Application"
  const { data: grants } = await supabase
    .from('grants')
    .select('id, name, provider, amount_max, deadline')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(5);

  const formatAmount = (amount: number | null) => {
    if (!amount) return null;
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(0)} L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    submitted: 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Applications</h1>
        <p className="text-muted-foreground">
          Manage your grant applications and generate AI-powered answers.
        </p>
      </div>

      {/* Applications List */}
      {applications && applications.length > 0 ? (
        <div className="grid gap-4">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {app.grants?.name || 'Unknown Grant'}
                    </CardTitle>
                    <CardDescription>{app.grants?.provider}</CardDescription>
                  </div>
                  <Badge className={statusColors[app.status]} variant="secondary">
                    {app.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {app.grants?.amount_max && (
                      <span>Up to {formatAmount(app.grants.amount_max)}</span>
                    )}
                    {app.grants?.deadline && (
                      <span className="ml-4">
                        Deadline: {new Date(app.grants.deadline).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </div>
                  <Button asChild>
                    <Link href={`/applications/${app.grant_id}`}>
                      Continue Application
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-12 w-12 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium">No applications yet</h3>
            <p className="mt-2 text-muted-foreground">
              Start your first application by selecting a grant below.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Start New Application */}
      <Card>
        <CardHeader>
          <CardTitle>Start New Application</CardTitle>
          <CardDescription>
            Select a grant to begin your AI-assisted application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {grants?.map((grant) => (
              <Link
                key={grant.id}
                href={`/applications/${grant.id}`}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div>
                  <p className="font-medium">{grant.name}</p>
                  <p className="text-sm text-muted-foreground">{grant.provider}</p>
                </div>
                <div className="text-right">
                  {grant.amount_max && (
                    <p className="text-sm font-medium text-primary">
                      Up to {formatAmount(grant.amount_max)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {grant.deadline
                      ? `Due ${new Date(grant.deadline).toLocaleDateString('en-IN')}`
                      : 'Rolling deadline'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Button asChild variant="outline">
              <Link href="/grants">Browse All Grants</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Verify the page loads**

Run: `npm run dev`
Navigate to: `http://localhost:3000/applications`
Expected: Page renders with empty state and grant suggestions

**Step 3: Commit**

```bash
git add app/\(dashboard\)/applications/page.tsx
git commit -m "feat: add applications list page"
```

---

## Task 2: Create Application Detail Page with Pre-seeded AI Answers

**Files:**
- Create: `app/(dashboard)/applications/[grantId]/page.tsx`

**Step 1: Create the application detail page**

```tsx
// app/(dashboard)/applications/[grantId]/page.tsx
'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Grant, ApplicationQuestion } from '@/types';

// Pre-seeded AI responses for demo
const DEMO_ANSWERS: Record<string, string> = {
  // Generic answers that work for most grant questions
  'product_problem': `Our platform addresses the critical challenge faced by Indian startup founders in discovering and applying for grants. Currently, founders spend 15-20 hours per grant application, manually searching government portals and filling repetitive forms.

Grant Agent uses AI to automatically match startups with relevant grants based on their profile, sector, and stage. Our RAG-powered system generates personalized application answers by learning from the startup's pitch deck, financial documents, and previous applications.

Key differentiators:
• Automated grant discovery across 500+ schemes
• AI-generated answers that maintain founder's voice
• 70% reduction in application time
• Real-time deadline tracking and notifications`,

  'business_model': `Our revenue model combines B2B SaaS with transaction-based pricing:

1. Subscription Tiers:
   • Starter (Free): 3 grant applications/month, basic matching
   • Pro (₹2,999/month): Unlimited applications, priority AI generation
   • Enterprise (₹9,999/month): Team access, API integration, dedicated support

2. Success Fee: 2% of grant amount received (optional, for assisted applications)

Current metrics:
• 450+ registered startups in pilot
• ₹1.2L MRR from 40 paying customers
• 85% monthly retention rate
• CAC: ₹1,500 | LTV: ₹18,000

Go-to-market: Partnership with incubators (15 signed MOUs), startup events, and SEO-driven content marketing.`,

  'team': `Our founding team combines deep expertise in AI/ML, government relations, and startup ecosystems:

**Yash Agarwal (CEO)** - IIT Delhi, 5 years building AI products. Previously led ML team at a Series B startup. Published research on document understanding at ACL 2024.

**Co-founder (CTO)** - BITS Pilani, 7 years full-stack experience. Previously at Google, built systems handling 10M+ requests/day.

**Advisors:**
• Former Joint Secretary, DPIIT (15 years in startup policy)
• Partner at Sequoia India (invested in 50+ startups)

We've assembled a team of 6, including 3 engineers and 1 government liaison specialist with direct connections to key grant-disbursing bodies.`,

  'traction': `Since launching our beta in October 2024:

**User Growth:**
• 450+ registered startups
• 120 DAUs (27% daily active rate)
• 2,100+ grant applications generated

**Revenue:**
• ₹1.2L MRR (40 paying customers)
• 85% month-over-month retention
• Net Promoter Score: 72

**Partnerships:**
• 15 incubator MOUs (T-Hub, NSRCEL, IIT Delhi Foundation)
• Integration with Startup India portal (in progress)
• Featured in YourStory, Inc42

**Grant Success:**
• 23 startups received grants using our platform
• Total grant amount facilitated: ₹2.3 Cr
• Average success rate: 34% (vs 12% industry average)`,

  'fund_usage': `We're seeking ₹50L to accelerate growth over the next 18 months:

**Product Development (40% - ₹20L)**
• Advanced AI model fine-tuning for Indian grant applications
• Multi-language support (Hindi, Tamil, Telugu)
• Mobile app development

**Team Expansion (35% - ₹17.5L)**
• 2 senior engineers
• 1 government relations specialist
• 1 customer success manager

**Marketing & Sales (20% - ₹10L)**
• Incubator partnership program
• Content marketing and SEO
• Startup event sponsorships

**Operations (5% - ₹2.5L)**
• Cloud infrastructure
• Legal and compliance
• Contingency

Expected outcomes: 2,000 paying customers, ₹15L MRR, break-even by month 15.`,

  'innovation': `Grant Agent introduces three key innovations:

1. **Intelligent Grant Matching Engine**
   We built a custom embedding model trained on 10,000+ Indian grant applications. Unlike generic search, our system understands nuanced eligibility criteria (DPIIT status, women-led, state-specific schemes) and matches with 94% accuracy.

2. **Context-Aware Answer Generation**
   Our RAG (Retrieval-Augmented Generation) pipeline processes startup documents (pitch decks, financials, team bios) to generate answers that reflect the founder's actual data and voice—not generic templates.

3. **Adaptive Learning System**
   The platform learns from successful applications. When a startup wins a grant, we analyze the winning answers to improve recommendations for similar startups, creating a flywheel effect.

Patent pending on our grant-matching algorithm (Application #202411xxxxx).`,

  'market': `**Total Addressable Market (TAM): ₹12,000 Cr**
India has 90,000+ DPIIT-registered startups, with 15,000 new registrations annually. Government allocates ₹10,000+ Cr annually for startup schemes.

**Serviceable Addressable Market (SAM): ₹2,400 Cr**
~20% of startups actively apply for grants (18,000 startups). Average spending on application assistance: ₹15,000/year.

**Serviceable Obtainable Market (SOM): ₹120 Cr**
We target 5% market share in 3 years (900 paying customers at ₹12,000 average annual spend).

**Market Trends:**
• Government grant disbursement grew 45% YoY (2023-24)
• 67% of founders cite "complexity" as barrier to applying
• Digital India push increasing online grant applications

**Competitive Landscape:**
Direct competitors: None with AI-powered approach
Indirect: CA firms, grant consultants (₹50K-2L per application)`,

  'competitive_advantage': `Our moat is built on three pillars:

**1. Proprietary Data**
• 10,000+ Indian grant applications in our training set
• Continuously growing with each user interaction
• Partnerships with incubators provide exclusive access to successful applications

**2. Technology**
• Fine-tuned LLM for Indian startup/government context
• 94% grant-matching accuracy (vs 60% for keyword search)
• Patent-pending matching algorithm

**3. Network Effects**
• More users → more successful applications → better AI → more users
• Incubator partnerships create distribution advantage
• Government relationships provide early access to new schemes

**Barriers to Entry:**
• 18 months of domain-specific data collection
• Relationships with 15 incubators (exclusive in some cases)
• Team expertise in both AI and government processes`,
};

// Map question keywords to pre-seeded answers
function getPreseededAnswer(question: string): string {
  const q = question.toLowerCase();

  if (q.includes('product') || q.includes('service') || q.includes('problem') || q.includes('innovation') || q.includes('describe your startup')) {
    return DEMO_ANSWERS['product_problem'];
  }
  if (q.includes('business model') || q.includes('revenue')) {
    return DEMO_ANSWERS['business_model'];
  }
  if (q.includes('team') || q.includes('experience') || q.includes('founder')) {
    return DEMO_ANSWERS['team'];
  }
  if (q.includes('traction') || q.includes('users') || q.includes('customer') || q.includes('metric')) {
    return DEMO_ANSWERS['traction'];
  }
  if (q.includes('fund') || q.includes('use') || q.includes('utilize') || q.includes('breakdown') || q.includes('budget')) {
    return DEMO_ANSWERS['fund_usage'];
  }
  if (q.includes('market') || q.includes('size') || q.includes('opportunity')) {
    return DEMO_ANSWERS['market'];
  }
  if (q.includes('competitive') || q.includes('advantage') || q.includes('differentiat') || q.includes('ip') || q.includes('moat')) {
    return DEMO_ANSWERS['competitive_advantage'];
  }
  if (q.includes('novelty') || q.includes('innovat') || q.includes('unique') || q.includes('technical')) {
    return DEMO_ANSWERS['innovation'];
  }

  // Default fallback
  return DEMO_ANSWERS['product_problem'];
}

interface PageProps {
  params: Promise<{ grantId: string }>;
}

export default function ApplicationPage({ params }: PageProps) {
  const { grantId } = use(params);
  const router = useRouter();
  const [grant, setGrant] = useState<Grant | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [generated, setGenerated] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchGrant() {
      const res = await fetch(`/api/grants/${grantId}`);
      if (res.ok) {
        const data = await res.json();
        setGrant(data.data);
      }
      setLoading(false);
    }
    fetchGrant();
  }, [grantId]);

  const generateAnswer = async (questionId: string, question: string) => {
    setGenerating((prev) => ({ ...prev, [questionId]: true }));

    // Simulate AI generation with typing effect
    const fullAnswer = getPreseededAnswer(question);
    let currentAnswer = '';

    // Type out the answer character by character (fast for demo)
    for (let i = 0; i < fullAnswer.length; i += 3) {
      currentAnswer = fullAnswer.slice(0, i + 3);
      setAnswers((prev) => ({ ...prev, [questionId]: currentAnswer }));
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    setAnswers((prev) => ({ ...prev, [questionId]: fullAnswer }));
    setGenerating((prev) => ({ ...prev, [questionId]: false }));
    setGenerated((prev) => ({ ...prev, [questionId]: true }));
  };

  const generateAllAnswers = async () => {
    if (!grant?.application_questions) return;

    for (const q of grant.application_questions) {
      if (!generated[q.id]) {
        await generateAnswer(q.id, q.question);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!grant) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Grant not found</h2>
        <p className="text-muted-foreground mt-2">
          The grant you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild className="mt-4">
          <Link href="/grants">Browse Grants</Link>
        </Button>
      </div>
    );
  }

  const questions = grant.application_questions as ApplicationQuestion[];

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/applications"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 mr-1"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Applications
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-2">
            {grant.provider_type.charAt(0).toUpperCase() + grant.provider_type.slice(1)}
          </Badge>
          <h1 className="text-2xl font-bold">{grant.name}</h1>
          <p className="text-muted-foreground">{grant.provider}</p>
        </div>
        <Button onClick={generateAllAnswers} size="lg" className="shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.636 5.636l2.122 2.122m8.484 8.484l2.122 2.122M5.636 18.364l2.122-2.122m8.484-8.484l2.122-2.122" />
          </svg>
          Generate All Answers with AI
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium">AI-Powered Answer Generation</p>
            <p className="mt-1 text-blue-700 dark:text-blue-300">
              Our AI uses your Knowledge Base documents to generate personalized answers.
              Upload your pitch deck and company docs for better results.
            </p>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions && questions.length > 0 ? (
          questions.map((q, index) => (
            <Card key={q.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <CardTitle className="text-base font-medium leading-relaxed">
                        {q.question}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {q.max_length && `Max ${q.max_length} characters`}
                        {q.required && (q.max_length ? ' • ' : '')}
                        {q.required && 'Required'}
                      </CardDescription>
                    </div>
                  </div>
                  {!generated[q.id] && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateAnswer(q.id, q.question)}
                      disabled={generating[q.id]}
                    >
                      {generating[q.id] ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4 mr-2"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          Generating...
                        </>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-2"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path d="M12 3v3m0 12v3M3 12h3m12 0h3" />
                          </svg>
                          Generate with AI
                        </>
                      )}
                    </Button>
                  )}
                  {generated[q.id] && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3 mr-1"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Generated
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder={generating[q.id] ? 'AI is generating your answer...' : 'Click "Generate with AI" or type your answer...'}
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  className="min-h-[200px] font-mono text-sm"
                />
                {answers[q.id] && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {answers[q.id].length} characters
                    {q.max_length && ` / ${q.max_length} max`}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No application questions defined for this grant.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions */}
      {questions && questions.length > 0 && (
        <div className="flex gap-4 pt-4 border-t">
          <Button variant="outline" className="flex-1">
            Save as Draft
          </Button>
          <Button className="flex-1">
            Submit Application
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create the grants API endpoint**

```tsx
// app/api/grants/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: grant, error } = await supabase
    .from('grants')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !grant) {
    return NextResponse.json(
      { data: null, error: 'Grant not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: grant, error: null });
}
```

**Step 3: Test the page**

Run: `npm run dev`
Navigate to: `http://localhost:3000/applications` then click on a grant
Expected: Page loads with questions, "Generate with AI" buttons work with typing animation

**Step 4: Commit**

```bash
git add app/\(dashboard\)/applications/\[grantId\]/page.tsx app/api/grants/\[id\]/route.ts
git commit -m "feat: add application detail page with AI answer generation"
```

---

## Task 3: Polish the UI for Demo

**Files:**
- Modify: `components/layout/sidebar.tsx` - Ensure Applications nav is highlighted correctly

**Step 1: Verify sidebar highlighting works**

The sidebar already has `/applications` in the navigation array. Verify it highlights correctly when on applications pages.

**Step 2: Test full demo flow**

1. Go to `http://localhost:3000/login`
2. Sign in with magic link
3. Complete onboarding if needed
4. View Dashboard
5. Browse Grants, click on one
6. Click "Start Application"
7. Generate AI answers
8. View Knowledge Base page

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: polish UI for demo"
```

---

## Task 4: Final Testing and Demo Prep

**Step 1: Run build to check for errors**

```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 2: Test with production build**

```bash
npm run start
```

Navigate through the full demo flow.

**Step 3: Create final commit and tag**

```bash
git add -A
git commit -m "chore: finalize MVP demo build"
git tag mvp-demo-v1
```

---

## Demo Script

1. **Login** (30s): Show magic link auth flow
2. **Dashboard** (30s): Point out stats, recent grants
3. **Grant Discovery** (1min): Search/filter, show card details
4. **Grant Detail** (30s): Show eligibility, questions
5. **Knowledge Base** (1min): Upload a document (pitch deck PDF)
6. **AI Application** (2min): Generate answers, show typing animation, edit an answer
7. **Wrap-up** (30s): Show how this saves 15+ hours per application

**Total: ~6 minutes**
