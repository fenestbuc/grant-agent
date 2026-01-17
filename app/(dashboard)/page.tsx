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

  // Calculate date 14 days from now for deadline filtering
  const fourteenDaysFromNow = new Date();
  fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
  const today = new Date().toISOString().split('T')[0];
  const futureDate = fourteenDaysFromNow.toISOString().split('T')[0];

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

  // Get upcoming deadlines from watchlist (next 14 days)
  const { data: upcomingDeadlines } = await supabase
    .from('watchlist')
    .select(`
      id,
      grants (
        id,
        name,
        provider,
        deadline,
        amount_max
      )
    `)
    .eq('startup_id', startup?.id)
    .not('grants.deadline', 'is', null)
    .gte('grants.deadline', today)
    .lte('grants.deadline', futureDate)
    .order('grants(deadline)', { ascending: true })
    .limit(5);

  // Get in-progress applications
  const { data: inProgressApps } = await supabase
    .from('applications')
    .select(`
      id,
      status,
      updated_at,
      grants:grant_id (
        id,
        name,
        provider,
        deadline,
        amount_max
      )
    `)
    .eq('startup_id', startup?.id)
    .in('status', ['draft', 'in_progress'])
    .order('updated_at', { ascending: false })
    .limit(5);

  // Get recent grants matching startup's sector
  let recentGrantsQuery = supabase
    .from('grants')
    .select('id, name, provider, amount_max, deadline, sectors')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // Filter by sector if startup has one
  if (startup?.sector) {
    recentGrantsQuery = recentGrantsQuery.contains('sectors', [startup.sector]);
  }

  const { data: recentGrants } = await recentGrantsQuery.limit(5);

  // Status badge colors
  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    submitted: 'bg-purple-100 text-purple-800',
  };

  // Calculate days until deadline
  const getDaysUntil = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

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

      {/* Upcoming Deadlines & Application Progress Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Upcoming Deadlines
            </CardTitle>
            <CardDescription>
              Watchlisted grants with deadlines in the next 14 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines && upcomingDeadlines.length > 0 ? (
              <div className="space-y-3">
                {upcomingDeadlines.map((item) => {
                  // Supabase returns the joined record, need to handle the type
                  const grant = item.grants as unknown as { id: string; name: string; provider: string; deadline: string | null; amount_max: number | null } | null;
                  if (!grant?.deadline) return null;
                  const daysUntil = getDaysUntil(grant.deadline);
                  const isUrgent = daysUntil <= 3;

                  return (
                    <Link
                      key={item.id}
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
                        <Badge
                          variant={isUrgent ? "destructive" : "secondary"}
                          className="shrink-0"
                        >
                          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
                <div className="pt-2">
                  <Button asChild variant="ghost" size="sm" className="w-full">
                    <Link href="/watchlist">View All Watchlist</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
                <p className="mt-2 text-sm text-muted-foreground">
                  No upcoming deadlines in the next 14 days
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href="/grants">Add Grants to Watchlist</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Application Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" x2="8" y1="13" y2="13" />
                <line x1="16" x2="8" y1="17" y2="17" />
              </svg>
              Application Progress
            </CardTitle>
            <CardDescription>
              Continue working on your applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {inProgressApps && inProgressApps.length > 0 ? (
              <div className="space-y-3">
                {inProgressApps.map((app) => {
                  // Supabase returns the joined record, need to handle the type
                  const grant = app.grants as unknown as { id: string; name: string; provider: string; deadline: string | null; amount_max: number | null } | null;
                  if (!grant) return null;

                  return (
                    <Link
                      key={app.id}
                      href={`/applications/${grant.id}`}
                      className="block p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{grant.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {grant.provider}
                          </p>
                        </div>
                        <Badge className={statusColors[app.status]} variant="secondary">
                          {app.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      {grant.deadline && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Due: {new Date(grant.deadline).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </Link>
                  );
                })}
                <div className="pt-2">
                  <Button asChild variant="ghost" size="sm" className="w-full">
                    <Link href="/applications">View All Applications</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <p className="mt-2 text-sm text-muted-foreground">
                  No applications in progress
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href="/grants">Start an Application</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Grants Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Quick Actions */}
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
              <Link href="/applications">
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" x2="12" y1="11" y2="17" />
                  <line x1="9" x2="15" y1="14" y2="14" />
                </svg>
                Start New Application
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

        {/* Recent Grants Matching Sector */}
        <Card>
          <CardHeader>
            <CardTitle>
              {startup?.sector ? `Grants for ${startup.sector}` : 'Recent Grants'}
            </CardTitle>
            <CardDescription>
              {startup?.sector
                ? 'Newly added grants matching your sector'
                : 'Newly added grants you might be interested in'}
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
                <div className="pt-2">
                  <Button asChild variant="ghost" size="sm" className="w-full">
                    <Link href="/grants">View All Grants</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                  <path d="M12 18V6" />
                </svg>
                <p className="mt-2 text-sm text-muted-foreground">
                  {startup?.sector
                    ? `No grants found for ${startup.sector} yet`
                    : 'No grants available yet'}
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href="/grants">Browse All Grants</Link>
                </Button>
              </div>
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
