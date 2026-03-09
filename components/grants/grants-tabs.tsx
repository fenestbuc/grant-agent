'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecommendedGrants } from './recommended-grants';

interface GrantsTabsProps {
  children: React.ReactNode;
}

export function GrantsTabs({ children }: GrantsTabsProps) {
  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="all">All Grants</TabsTrigger>
        <TabsTrigger value="recommended">Recommended for You</TabsTrigger>
      </TabsList>
      <TabsContent value="all">
        {children}
      </TabsContent>
      <TabsContent value="recommended">
        <RecommendedGrants />
      </TabsContent>
    </Tabs>
  );
}
