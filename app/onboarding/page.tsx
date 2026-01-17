'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const SECTORS = [
  { value: 'technology', label: 'Technology' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'healthtech', label: 'Healthcare / HealthTech' },
  { value: 'edtech', label: 'Education / EdTech' },
  { value: 'agriculture', label: 'Agriculture / AgriTech' },
  { value: 'cleantech', label: 'CleanTech / Sustainability' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'ecommerce', label: 'E-commerce / D2C' },
  { value: 'social_impact', label: 'Social Impact' },
  { value: 'food', label: 'Food & Beverage' },
  { value: 'logistics', label: 'Logistics / Supply Chain' },
  { value: 'media', label: 'Media & Entertainment' },
  { value: 'other', label: 'Other' },
];

const STAGES = [
  { value: 'idea', label: 'Idea Stage' },
  { value: 'prototype', label: 'Prototype / POC' },
  { value: 'mvp', label: 'MVP / Early Product' },
  { value: 'early_revenue', label: 'Early Revenue' },
  { value: 'growth', label: 'Growth Stage' },
  { value: 'scaling', label: 'Scaling' },
];

const ENTITY_TYPES = [
  { value: 'not_incorporated', label: 'Not Incorporated Yet' },
  { value: 'proprietorship', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'llp', label: 'LLP' },
  { value: 'private_limited', label: 'Private Limited' },
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Chandigarh', 'Puducherry',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sector: '',
    stage: '',
    entity_type: 'not_incorporated',
    state: '',
    city: '',
    founded_date: '',
    is_dpiit_registered: false,
    is_women_led: false,
    team_size: 1,
    website: '',
  });

  const updateField = (field: string, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('You must be logged in to create a profile');
      setIsLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('startups').insert({
      user_id: user.id,
      name: formData.name,
      description: formData.description || null,
      sector: formData.sector,
      stage: formData.stage,
      entity_type: formData.entity_type,
      state: formData.state,
      city: formData.city || null,
      founded_date: formData.founded_date || null,
      is_dpiit_registered: formData.is_dpiit_registered,
      is_women_led: formData.is_women_led,
      team_size: formData.team_size,
      website: formData.website || null,
    });

    if (insertError) {
      setError(insertError.message);
      setIsLoading(false);
      return;
    }

    router.push('/grants');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to Grant Agent</h1>
          <p className="text-muted-foreground">
            Tell us about your startup to get personalized grant recommendations
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Startup Profile</CardTitle>
            <CardDescription>
              This information helps us match you with relevant grants
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Startup Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Acme Technologies"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">One-line Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="We help small businesses manage their finances with AI"
                    rows={2}
                  />
                </div>
              </div>

              {/* Sector and Stage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sector *</Label>
                  <Select
                    value={formData.sector}
                    onValueChange={(value) => updateField('sector', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTORS.map((sector) => (
                        <SelectItem key={sector.value} value={sector.value}>
                          {sector.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Stage *</Label>
                  <Select
                    value={formData.stage}
                    onValueChange={(value) => updateField('stage', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Entity Type and Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Entity Type *</Label>
                  <Select
                    value={formData.entity_type}
                    onValueChange={(value) => updateField('entity_type', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select entity type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>State *</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => updateField('state', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="Mumbai"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="founded_date">Founded Date</Label>
                  <Input
                    id="founded_date"
                    type="date"
                    value={formData.founded_date}
                    onChange={(e) => updateField('founded_date', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="team_size">Team Size</Label>
                  <Input
                    id="team_size"
                    type="number"
                    min={1}
                    value={formData.team_size}
                    onChange={(e) => updateField('team_size', parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder="https://acme.com"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dpiit"
                    checked={formData.is_dpiit_registered}
                    onCheckedChange={(checked) =>
                      updateField('is_dpiit_registered', checked === true)
                    }
                  />
                  <Label htmlFor="dpiit" className="font-normal cursor-pointer">
                    Registered with DPIIT (Startup India)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="women_led"
                    checked={formData.is_women_led}
                    onCheckedChange={(checked) =>
                      updateField('is_women_led', checked === true)
                    }
                  />
                  <Label htmlFor="women_led" className="font-normal cursor-pointer">
                    Women-led startup (51%+ women ownership or women founder/CEO)
                  </Label>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-md text-sm bg-red-50 text-red-700 border border-red-200">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating Profile...' : 'Create Profile & Continue'}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
