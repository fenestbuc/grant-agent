import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get startup profile
  const { data: startup } = await supabase
    .from('startups')
    .select('*')
    .eq('user_id', user?.id)
    .single();

  // Get counts
  const [
    { count: grantsCount },
    { count: applicationsCount },
    { count: watchlistCount },
    { count: documentsCount },
  ] = await Promise.all([
    supabase.from('grants').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('startup_id', startup?.id),
    supabase.from('watchlist').select('*', { count: 'exact', head: true }).eq('startup_id', startup?.id),
    supabase.from('kb_documents').select('*', { count: 'exact', head: true }).eq('startup_id', startup?.id),
  ]);

  // Get recent grants
  const { data: recentGrants } = await supabase
    .from('grants')
    .select('id, name, provider, amount_max, deadline, sectors')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {startup?.name}
        </h1>
        <p className="text-muted-foreground">
          Discover grants and build compelling applications with AI assistance.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Grants</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
              <path d="M12 18V6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{grantsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active grants to explore
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Applications</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applicationsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Applications in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Watchlist</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{watchlistCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Grants you&apos;re tracking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              In your knowledge base
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Get started with these common tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/grants">
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                Browse Available Grants
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/kb">
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
                Upload Documents to Knowledge Base
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/settings">
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Update Startup Profile
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Grants */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Grants</CardTitle>
            <CardDescription>
              Newly added grants you might be interested in
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentGrants && recentGrants.length > 0 ? (
              <div className="space-y-4">
                {recentGrants.map((grant) => (
                  <Link
                    key={grant.id}
                    href={`/grants/${grant.id}`}
                    className="block p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{grant.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {grant.provider}
                        </p>
                      </div>
                      {grant.amount_max && (
                        <Badge variant="secondary" className="shrink-0">
                          Up to {formatCurrency(grant.amount_max)}
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No grants available yet. Check back soon!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}
