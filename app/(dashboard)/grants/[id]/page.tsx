// app/(dashboard)/grants/[id]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { WatchlistButton } from '@/components/watchlist';
import type { Grant, ApplicationQuestion } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GrantDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: grant, error } = await supabase
    .from('grants')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !grant) {
    notFound();
  }

  const formatAmount = (amount: number | null) => {
    if (!amount) return null;
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Crore`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(0)} Lakhs`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const providerTypeColors: Record<string, string> = {
    government: 'bg-blue-100 text-blue-800',
    csr: 'bg-green-100 text-green-800',
    private: 'bg-purple-100 text-purple-800',
    ngo: 'bg-orange-100 text-orange-800',
  };

  const eligibility = grant.eligibility_criteria as Grant['eligibility_criteria'];
  const questions = grant.application_questions as ApplicationQuestion[];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back Link */}
      <Link
        href="/grants"
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
        Back to Grants
      </Link>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={providerTypeColors[grant.provider_type]} variant="secondary">
            {grant.provider_type.charAt(0).toUpperCase() + grant.provider_type.slice(1)}
          </Badge>
          {grant.deadline && (
            <Badge variant="outline">
              Deadline: {new Date(grant.deadline).toLocaleDateString('en-IN')}
            </Badge>
          )}
        </div>

        <h1 className="text-3xl font-bold">{grant.name}</h1>
        <p className="text-lg text-muted-foreground">{grant.provider}</p>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Funding Amount</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-primary">
              {grant.amount_min && grant.amount_max
                ? `${formatAmount(grant.amount_min)} - ${formatAmount(grant.amount_max)}`
                : grant.amount_max
                ? `Up to ${formatAmount(grant.amount_max)}`
                : 'Contact for details'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Application Deadline</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {grant.deadline
                ? new Date(grant.deadline).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Rolling'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Eligible Stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {grant.stages.length > 0
                ? grant.stages.map((stage: string) => (
                    <Badge key={stage} variant="outline" className="text-xs">
                      {stage.replace('_', ' ')}
                    </Badge>
                  ))
                : 'All stages'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>About this Grant</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{grant.description}</p>
        </CardContent>
      </Card>

      {/* Sectors */}
      {grant.sectors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Eligible Sectors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {grant.sectors.map((sector: string) => (
                <Badge key={sector} variant="secondary">
                  {sector.replace('_', ' ').charAt(0).toUpperCase() +
                    sector.replace('_', ' ').slice(1)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Eligibility Criteria */}
      {Object.keys(eligibility).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Eligibility Criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {eligibility.incorporation_required && (
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Must be incorporated
                </li>
              )}
              {eligibility.dpiit_required && (
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  DPIIT registration required
                </li>
              )}
              {eligibility.max_age_months && (
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Company age: Max {eligibility.max_age_months} months
                </li>
              )}
              {eligibility.women_led && (
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Women-led startup only
                </li>
              )}
              {eligibility.states && eligibility.states.length > 0 && (
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 text-orange-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>
                    Location: {eligibility.states.join(', ')}
                  </span>
                </li>
              )}
              {eligibility.entity_types && eligibility.entity_types.length > 0 && (
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 text-purple-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>
                    Entity types: {eligibility.entity_types.join(', ')}
                  </span>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Application Questions */}
      {questions && questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Application Questions</CardTitle>
            <CardDescription>
              These are the questions you&apos;ll need to answer. Our AI can help generate answers based on your knowledge base.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {questions.map((q, index) => (
                <li key={q.id} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{q.question}</p>
                    {q.max_length && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Max {q.max_length} characters
                        {q.required && ' • Required'}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild size="lg" className="flex-1">
          <Link href={`/applications/${grant.id}`}>
            Start Application
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="ml-2 h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </Button>

        <WatchlistButton
          grantId={grant.id}
          grantName={grant.name}
          variant="button"
        />

        {grant.url && (
          <Button asChild variant="outline" size="lg">
            <a href={grant.url} target="_blank" rel="noopener noreferrer">
              Visit Official Website
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="ml-2 h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </Button>
        )}
      </div>

      {/* Contact */}
      {grant.contact_email && (
        <p className="text-sm text-muted-foreground text-center">
          Questions? Contact:{' '}
          <a href={`mailto:${grant.contact_email}`} className="text-primary hover:underline">
            {grant.contact_email}
          </a>
        </p>
      )}
    </div>
  );
}
