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
