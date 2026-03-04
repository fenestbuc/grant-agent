// app/(dashboard)/settings/page.tsx
import { createClient } from '@/lib/supabase/server';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SignOutButton } from '@/components/auth/sign-out-button';
import type { UsageStatus } from '@/types';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch startup profile
  const { data: startup } = await supabase
    .from('startups')
    .select('*')
    .eq('user_id', user?.id)
    .single();

  // Fetch usage from our API
  let usage: UsageStatus | null = null;
  try {
    const usageRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/usage`, {
      headers: { cookie: '' },
      cache: 'no-store',
    });
    if (usageRes.ok) {
      const usageData = await usageRes.json();
      usage = usageData.data;
    }
  } catch {
    // ignore
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="text-sm text-muted-foreground">Email</span>
            <p className="font-medium">{user?.email}</p>
          </div>
          {startup && (
            <>
              <div>
                <span className="text-sm text-muted-foreground">Company</span>
                <p className="font-medium">{startup.name}</p>
              </div>
              {startup.logo_url && (
                <div>
                  <span className="text-sm text-muted-foreground">Logo</span>
                  <img
                    src={startup.logo_url}
                    alt="Company logo"
                    className="mt-1 h-12 w-12 object-contain rounded"
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Usage */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>Your AI generation usage this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Generations used</span>
              <Badge variant={usage.used >= usage.limit ? 'destructive' : 'secondary'}>
                {usage.used} / {usage.limit}
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Resets on {new Date(usage.resetDate).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your account</CardDescription>
        </CardHeader>
        <CardContent>
          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  );
}
