'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { UserSubmittedGrant } from '@/types';

export default function SubmitGrantPage() {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [isGoogleForm, setIsGoogleForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submissions, setSubmissions] = useState<UserSubmittedGrant[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);

  // Detect Google Forms URL
  useEffect(() => {
    const isGForm = url.includes('docs.google.com/forms') || url.includes('forms.gle');
    setIsGoogleForm(isGForm);
  }, [url]);

  // Fetch existing submissions
  useEffect(() => {
    async function fetchSubmissions() {
      try {
        const res = await fetch('/api/user-grants');
        if (res.ok) {
          const data = await res.json();
          setSubmissions(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch submissions:', err);
      } finally {
        setLoadingSubmissions(false);
      }
    }
    fetchSubmissions();
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!url) {
      setError('Please enter a grant URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/user-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          name: name || undefined,
          provider: provider || undefined,
          is_google_form: isGoogleForm,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit grant');
      }

      setSuccess(true);
      setUrl('');
      setName('');
      setProvider('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit grant');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Submit a Grant</h1>
        <p className="text-muted-foreground mt-1">
          Found a grant that&apos;s not in our database? Submit it here and we&apos;ll add it.
        </p>
      </div>

      {/* Submit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Grant Details</CardTitle>
          <CardDescription>
            Enter the grant URL and optional details. We&apos;ll review and add it to the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Grant URL *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/grant-application"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              {isGoogleForm && (
                <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  Google Form detected - questions may be scraped automatically in the future
                </p>
              )}
            </div>

            {!isGoogleForm && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Grant Name (optional)</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., Startup India Seed Fund"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider">Provider/Organization (optional)</Label>
                  <Input
                    id="provider"
                    type="text"
                    placeholder="e.g., Department of Industrial Policy"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                  />
                </div>
              </>
            )}

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            {success && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Grant submitted successfully! We&apos;ll review it and add it to the database.
                </p>
              </div>
            )}

            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit Grant'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Previous Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>Your Submissions</CardTitle>
          <CardDescription>
            Grants you&apos;ve submitted for review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSubmissions ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>You haven&apos;t submitted any grants yet.</p>
              <p className="text-sm mt-1">Submit a grant above to help expand our database!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {submission.name || 'Unnamed Grant'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {submission.url}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted {new Date(submission.created_at).toLocaleDateString()}
                      {submission.is_google_form && ' • Google Form'}
                    </p>
                  </div>
                  <div className="ml-4 shrink-0">
                    {getStatusBadge(submission.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Back Link */}
      <div className="pt-4">
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
      </div>
    </div>
  );
}
