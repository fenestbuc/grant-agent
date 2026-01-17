'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Grant, ApplicationQuestion } from '@/types';

interface PageProps {
  params: Promise<{ grantId: string }>;
}

export default function ApplicationPage({ params }: PageProps) {
  const { grantId } = use(params);
  const [grant, setGrant] = useState<Grant | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [generated, setGenerated] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const generateAllAnswers = async () => {
    if (!grant?.application_questions) return;

    for (const q of grant.application_questions) {
      if (!generated[q.id]) {
        await generateAnswer(q.id, q.question, q.max_length);
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
                      onClick={() => generateAnswer(q.id, q.question, q.max_length)}
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
