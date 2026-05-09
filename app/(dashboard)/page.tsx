
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: startup } = await supabase
    .from('startups')
    .select('*')
    .eq('user_id', user?.id)
    .single();

  const { data: watchlist } = await supabase
    .from('watchlist')
    .select('*, grants(*)')
    .eq('startup_id', startup?.id)
    .limit(3);

  const { data: applications } = await supabase
    .from('applications')
    .select('*, grants(name)')
    .eq('startup_id', startup?.id)
    .limit(3);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {startup?.company_name || 'Founder'}</h1>
        <p className="text-muted-foreground mt-2">Here is your grant application overview.</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Watchlisted grants closing soon</CardDescription>
          </CardHeader>
          <CardContent>
            {watchlist && watchlist.length > 0 ? (
              <ul className="space-y-3">
                {watchlist.map((item: any) => (
                  <li key={item.id} className="flex justify-between items-center text-sm">
                    <span className="truncate mr-2 font-medium">{item.grants?.name}</span>
                    <span className="text-red-500 whitespace-nowrap">{new Date(item.grants?.deadline).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
            )}
            <Button asChild variant="outline" className="w-full mt-4" size="sm">
              <Link href="/watchlist">View Watchlist</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>Your draft and submitted applications</CardDescription>
          </CardHeader>
          <CardContent>
            {applications && applications.length > 0 ? (
              <ul className="space-y-3">
                {applications.map((app: any) => (
                  <li key={app.id} className="flex justify-between items-center text-sm">
                    <span className="truncate mr-2 font-medium">{app.grants?.name}</span>
                    <span className="capitalize text-muted-foreground">{app.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No applications started yet.</p>
            )}
            <Button asChild variant="outline" className="w-full mt-4" size="sm">
              <Link href="/applications">View Applications</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with Grant Agent</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild className="w-full justify-start" variant="secondary">
              <Link href="/grants">🔍 Browse New Grants</Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="secondary">
              <Link href="/kb">📄 Upload Documents</Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="secondary">
              <Link href="/settings">⚙️ Update Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
