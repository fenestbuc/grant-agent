'use client';

import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Grant, ApplicationQuestion, UsageStatus } from '@/types';

interface PageProps {
  params: Promise<{ grantId: string }>;
}

export default function ApplicationPage({ params }: PageProps) {
  const { grantId } = use(params);
  const [grant, setGrant] = useState<Grant | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [originalAnswers, setOriginalAnswers] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [generated, setGenerated] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch usage status
  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/usage');
      if (res.ok) {
        const data = await res.json();
        setUsage(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    }
  }, []);

  useEffect(() => {
    async function fetchGrant() {
      const res = await fetch(`/api/grants/${grantId}`);
      if (res.ok) {
        const data = await res.json();
        setGrant(data.data);

        // Initialize empty answers for each question
        const initialAnswers: Record<string, string> = {};
        data.data.questions?.forEach((q: ApplicationQuestion) => {
          initialAnswers[q.id] = '';
        });
        setAnswers(initialAnswers);
        setOriginalAnswers(initialAnswers);
      }
      setLoading(false);
    }

    fetchGrant();
    fetchUsage();
  }, [grantId, fetchUsage]);

  // Load existing application if available
  useEffect(() => {
    async function loadApplication() {
      if (!grant) return;
      try {
        const res = await fetch(`/api/applications?grantId=${grantId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.data && data.data.length > 0) {
            const app = data.data[0];
            setApplicationId(app.id);
            const loadedAnswers: Record<string, string> = {};
            Object.entries(app.answers || {}).forEach(([key, value]) => {
              loadedAnswers[key] = value as string;
            });
            if (Object.keys(loadedAnswers).length > 0) {
              setAnswers(loadedAnswers);
              setOriginalAnswers(loadedAnswers);
              // Mark questions with answers as generated
              const generatedState: Record<string, boolean> = {};
              Object.keys(loadedAnswers).forEach(key => {
                if (loadedAnswers[key]) generatedState[key] = true;
              });
              setGenerated(generatedState);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load application:', error);
      }
    }
    loadApplication();
  }, [grant, grantId]);

  const handleGenerate = async (questionId: string) => {
    if (!grant) return;

    // Check usage limit before generating
    if (usage && usage.used >= usage.limit) {
      setErrors(prev => ({
        ...prev,
        [questionId]: 'Monthly generation limit reached. Please upgrade your plan.',
      }));
      return;
    }

    setGenerating(prev => ({ ...prev, [questionId]: true }));
    setErrors(prev => ({ ...prev, [questionId]: '' }));

    try {
      const res = await fetch('/api/applications/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantId, questionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors(prev => ({
          ...prev,
          [questionId]: data.error || 'Failed to generate answer',
        }));
      } else {
        setAnswers(prev => ({ ...prev, [questionId]: data.answer }));
        setGenerated(prev => ({ ...prev, [questionId]: true }));
        // Refresh usage after generation
        fetchUsage();
      }
    } catch {
      setErrors(prev => ({
        ...prev,
        [questionId]: 'Network error. Please try again.',
      }));
    } finally {
      setGenerating(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleSaveAnswer = async (questionId: string) => {
    if (!grant) return;
    const currentAnswer = answers[questionId];
    if (currentAnswer === originalAnswers[questionId]) return;

    try {
      const res = await fetch('/api/applications', {
        method: applicationId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(applicationId && { id: applicationId }),
          grantId,
          answers: { ...answers, [questionId]: currentAnswer },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (!applicationId) setApplicationId(data.data.id);
        setOriginalAnswers(prev => ({ ...prev, [questionId]: currentAnswer }));
      }
    } catch (error) {
      console.error('Failed to save answer:', error);
    }
  };

  const handleSaveAsDraft = async () => {
    if (!grant) return;
    setSaving(true);
    try {
      const res = await fetch('/api/applications', {
        method: applicationId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(applicationId && { id: applicationId }),
          grantId,
          answers,
          status: 'draft',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (!applicationId) setApplicationId(data.data.id);
        setOriginalAnswers(answers);
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyAnswer = async (questionId: string) => {
    const answer = answers[questionId];
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer);
      setCopied(prev => ({ ...prev, [questionId]: true }));
      setTimeout(() => setCopied(prev => ({ ...prev, [questionId]: false })), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!grant) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-muted-foreground">Grant not found.</p>
        <Link href="/grants">
          <Button variant="outline" className="mt-4">Back to Grants</Button>
        </Link>
      </div>
    );
  }

  const totalQuestions = grant.questions?.length || 0;
  const answeredQuestions = Object.values(answers).filter(a => a.trim()).length;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/grants">
            <Button variant="ghost" size="sm" className="mb-2">← Back to Grants</Button>
          </Link>
          <h1 className="text-2xl font-bold">{grant.name}</h1>
          <p className="text-muted-foreground">{grant.organization}</p>
        </div>
        <div className="flex items-center gap-3">
          {usage && (
            <div className="text-sm text-right">
              <p className="font-medium">{usage.used} / {usage.limit} generations</p>
              <p className="text-muted-foreground text-xs">this month</p>
            </div>
          )}
          <Button
            variant="outline"
            onClick={handleSaveAsDraft}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save as Draft'}
          </Button>
        </div>
      </div>

      {/* Grant Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{grant.name}</CardTitle>
              <CardDescription>{grant.organization}</CardDescription>
            </div>
            <Badge variant="secondary">{grant.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{grant.description}</p>
          {grant.amount && (
            <p className="mt-2 font-medium">Amount: {grant.amount}</p>
          )}
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
        <div className="text-sm">
          <span className="font-medium">{answeredQuestions}</span> of{' '}
          <span className="font-medium">{totalQuestions}</span> questions answered
        </div>
        <div className="flex-1 bg-background rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all"
            style={{ width: totalQuestions > 0 ? `${(answeredQuestions / totalQuestions) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {grant.questions?.map((question: ApplicationQuestion) => (
          <Card key={question.id}>
            <CardHeader>
              <CardTitle className="text-base">{question.question}</CardTitle>
              {question.guidance && (
                <CardDescription>{question.guidance}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={answers[question.id] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                onBlur={() => handleSaveAnswer(question.id)}
                placeholder="Generate an answer or type your own..."
                className="min-h-[120px]"
              />

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleGenerate(question.id)}
                  disabled={generating[question.id] || (usage?.used !== undefined && usage.used >= usage.limit)}
                  size="sm"
                >
                  {generating[question.id] ? 'Generating...' : generated[question.id] ? 'Regenerate' : 'Generate'}
                </Button>

                {answers[question.id] && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyAnswer(question.id)}
                  >
                    {copied[question.id] ? 'Copied!' : 'Copy'}
                  </Button>
                )}

                {errors[question.id] && (
                  <p className="text-sm text-destructive">{errors[question.id]}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
