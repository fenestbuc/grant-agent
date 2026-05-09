import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { statusColors } from '@/lib/utils/colors';

export default async function ApplicationsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: startup } = await supabase.from('startups').select('id').eq('user_id', user?.id).single();

  const { data: applications } = await supabase
    .from('applications')
    .select('*, grants(name, provider, deadline, questions)')
    .eq('startup_id', startup?.id)
    .order('updated_at', { ascending: false });

  if (!applications || applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-card rounded-lg border border-dashed">
        <h2 className="text-xl font-bold tracking-tight mb-2">No Applications Yet</h2>
        <p className="text-muted-foreground mb-6">Start applying to grants to see your progress here.</p>
        <Button asChild>
          <Link href="/grants">Browse Grants</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">My Applications</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {applications.map((app: { id: string; status: string; grant_id: string; answers: Record<string, string>; grants: { name: string; provider: string; questions: unknown[] } }) => {
          const totalQ = app.grants?.questions?.length || 0;
          const answeredQ = Object.values(app.answers || {}).filter((a: unknown) => a.trim().length > 0).length;
          const progress = totalQ > 0 ? Math.round((answeredQ / totalQ) * 100) : 0;
          
          return (
            <Card key={app.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <CardTitle className="line-clamp-1">{app.grants?.name}</CardTitle>
                    <CardDescription className="line-clamp-1 mt-1">{app.grants?.provider}</CardDescription>
                  </div>
                  <Badge variant="secondary" className={statusColors[app.status as keyof typeof statusColors] || 'bg-slate-100 text-slate-800'}>
                    {app.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <div className="space-y-2 mt-auto mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/applications/${app.grant_id}`}>Continue Application</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
