// app/(dashboard)/applications/[id]/page.tsx
'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Application, Grant, ApplicationAnswer } from '@/types';

interface ApplicationWithGrant extends Application {
  grants: Grant;
}

export default function ApplicationBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [application, setApplication] = useState<ApplicationWithGrant | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchApplication() {
      const response = await fetch(`/api/applications/${id}`);
      const result = await response.json();
      if (response.ok) {
        setApplication(result.data);
      } else {
        router.push('/grants');
      }
      setLoading(false);
    }
    fetchApplication();
  }, [id, router]);

  const handleGenerateAnswer = async (questionId: string, question: string) => {
    if (!application) return;
    setGenerating(questionId);

    try {
      const questionData = application.grants.application_questions?.find(
        (q) => q.id === questionId
      );

      const response = await fetch('/api/applications/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          grantName: application.grants.name,
          maxLength: questionData?.max_length,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        const updatedAnswers = application.answers.map((a) =>
          a.question_id === questionId
            ? { ...a, generated_answer: result.data.answer, sources: result.data.sources }
            : a
        );

        setApplication({ ...application, answers: updatedAnswers });
        await saveAnswers(updatedAnswers);
      }
    } finally {
      setGenerating(null);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    if (!application) return;

    const updatedAnswers = application.answers.map((a) =>
      a.question_id === questionId
        ? { ...a, edited_answer: value, is_edited: true }
        : a
    );

    setApplication({ ...application, answers: updatedAnswers });
  };

  const saveAnswers = async (answers: ApplicationAnswer[]) => {
    setSaving(true);
    await fetch(`/api/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, status: 'in_progress' }),
    });
    setSaving(false);
  };

  const handleSave = () => {
    if (application) {
      saveAnswers(application.answers);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!application) return null;

  const grant = application.grants;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={`/grants/${grant.id}`}
            className="text-sm text-muted-foreground hover:text-primary mb-2 inline-block"
          >
            ← Back to Grant
          </Link>
          <h1 className="text-2xl font-bold">{grant.name}</h1>
          <p className="text-muted-foreground">{grant.provider}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={application.status === 'draft' ? 'secondary' : 'default'}>
            {application.status}
          </Badge>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {application.answers.map((answer, index) => {
          const questionData = grant.application_questions?.find(
            (q) => q.id === answer.question_id
          );
          const currentAnswer = answer.edited_answer || answer.generated_answer || '';
          const charCount = currentAnswer.length;
          const maxLength = questionData?.max_length;

          return (
            <Card key={answer.question_id}>
              <CardHeader>
                <CardTitle className="text-lg flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">
                    {index + 1}
                  </span>
                  {answer.question}
                </CardTitle>
                {questionData && (
                  <CardDescription>
                    {questionData.required && <span className="text-destructive">Required</span>}
                    {maxLength && ` • Max ${maxLength} characters`}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={currentAnswer}
                  onChange={(e) => handleAnswerChange(answer.question_id, e.target.value)}
                  placeholder="Your answer..."
                  className="min-h-[150px]"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateAnswer(answer.question_id, answer.question)}
                      disabled={generating === answer.question_id}
                    >
                      {generating === answer.question_id ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Generating...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          {answer.generated_answer ? 'Regenerate' : 'Generate with AI'}
                        </>
                      )}
                    </Button>

                    {answer.sources && answer.sources.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Based on {answer.sources.length} source{answer.sources.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <span className={`text-sm ${maxLength && charCount > maxLength ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {charCount}{maxLength && ` / ${maxLength}`}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" asChild>
          <Link href="/applications">View All Applications</Link>
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Draft'}
        </Button>
      </div>
    </div>
  );
}
