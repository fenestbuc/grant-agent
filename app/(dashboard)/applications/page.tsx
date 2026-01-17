// app/(dashboard)/applications/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Application, Grant } from '@/types';

interface ApplicationWithGrant extends Application {
  grants: Pick<Grant, 'id' | 'name' | 'provider' | 'deadline' | 'amount_max'>;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationWithGrant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchApplications() {
      const response = await fetch('/api/applications');
      const result = await response.json();
      if (response.ok) {
        setApplications(result.data || []);
      }
      setLoading(false);
    }
    fetchApplications();
  }, []);

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    submitted: 'bg-purple-100 text-purple-800',
  };

  const formatAmount = (amount: number | null) => {
    if (!amount) return null;
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(0)} L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Applications</h1>
          <p className="text-muted-foreground">
            Track and manage your grant applications.
          </p>
        </div>
        <Button asChild>
          <Link href="/grants">Find Grants</Link>
        </Button>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-12 w-12 text-muted-foreground mb-4"
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
            <h3 className="text-lg font-medium">No applications yet</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Start applying to grants to track your progress here.
            </p>
            <Button asChild>
              <Link href="/grants">Browse Grants</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applications.map((app) => (
            <Card key={app.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{app.grants.name}</CardTitle>
                    <CardDescription>{app.grants.provider}</CardDescription>
                  </div>
                  <Badge className={statusColors[app.status]} variant="secondary">
                    {app.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {app.grants.amount_max && (
                      <span>Up to {formatAmount(app.grants.amount_max)}</span>
                    )}
                    {app.grants.deadline && (
                      <span>
                        Deadline: {new Date(app.grants.deadline).toLocaleDateString('en-IN')}
                      </span>
                    )}
                    <span>
                      {app.answers.filter((a) => a.generated_answer || a.edited_answer).length} / {app.answers.length} questions answered
                    </span>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/applications/${app.id}`}>
                      {app.status === 'draft' ? 'Continue' : 'View'}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
