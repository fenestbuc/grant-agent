// app/(dashboard)/settings/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LogoUpload } from '@/components/settings/logo-upload';
import { DeleteAccountModal } from '@/components/settings/delete-account-modal';

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: startup } = await supabase
    .from('startups')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!startup) {
    redirect('/onboarding');
  }

  // Get document count
  const { count: docCount } = await supabase
    .from('kb_documents')
    .select('*', { count: 'exact', head: true })
    .eq('startup_id', startup.id);

  // Get application count
  const { count: appCount } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('startup_id', startup.id);

  const stageLabels: Record<string, string> = {
    idea: 'Idea Stage',
    prototype: 'Prototype',
    mvp: 'MVP',
    early_revenue: 'Early Revenue',
    growth: 'Growth',
    scaling: 'Scaling',
  };

  const entityLabels: Record<string, string> = {
    proprietorship: 'Proprietorship',
    partnership: 'Partnership',
    llp: 'LLP',
    private_limited: 'Private Limited',
    not_incorporated: 'Not Incorporated',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and startup profile.
        </p>
      </div>

      {/* Account Section */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your login information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Member since</p>
            <p className="font-medium">
              {new Date(user.created_at).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Startup Logo */}
      <Card>
        <CardHeader>
          <CardTitle>Startup Logo</CardTitle>
          <CardDescription>
            Upload a logo to represent your startup in the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUpload
            currentLogoUrl={startup.logo_url || null}
            startupName={startup.name}
          />
        </CardContent>
      </Card>

      {/* Startup Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Startup Profile</CardTitle>
              <CardDescription>Information about your startup</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/onboarding?edit=true">Edit Profile</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Startup Name</p>
              <p className="font-medium">{startup.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sector</p>
              <p className="font-medium capitalize">{startup.sector}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stage</p>
              <p className="font-medium">{stageLabels[startup.stage] || startup.stage}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Entity Type</p>
              <p className="font-medium">{entityLabels[startup.entity_type] || startup.entity_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">{startup.city}, {startup.state}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Team Size</p>
              <p className="font-medium">{startup.team_size} members</p>
            </div>
            <div className="flex gap-2">
              {startup.is_dpiit_registered && (
                <Badge variant="secondary">DPIIT Registered</Badge>
              )}
              {startup.is_women_led && (
                <Badge variant="secondary">Women-led</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>Your platform activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold">{docCount || 0}</p>
              <p className="text-sm text-muted-foreground">Documents Uploaded</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold">{appCount || 0}</p>
              <p className="text-sm text-muted-foreground">Applications Started</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sign Out</p>
              <p className="text-sm text-muted-foreground">Sign out of your account on this device</p>
            </div>
            <form action="/auth/signout" method="post">
              <Button variant="outline" type="submit">
                Sign Out
              </Button>
            </form>
          </div>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
              </div>
              <DeleteAccountModal />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
