import { NextRequest, NextResponse } from 'next/server';

/**
 * Trigger the Modal scraper via webhook.
 * This can be called by Vercel Cron or manually.
 *
 * Vercel Cron config in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/trigger-scrape",
 *     "schedule": "0 6 * * 1"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Skip auth check in development
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const webhookUrl = process.env.SCRAPER_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json(
      { error: 'SCRAPER_WEBHOOK_URL not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.SCRAPER_SECRET && {
          Authorization: `Bearer ${process.env.SCRAPER_SECRET}`,
        }),
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Scraper webhook error:', error);
      return NextResponse.json(
        { error: 'Scraper webhook failed', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('Scraper triggered successfully:', result);

    return NextResponse.json({
      success: true,
      message: 'Scraper triggered',
      result,
    });
  } catch (error) {
    console.error('Failed to trigger scraper:', error);
    return NextResponse.json(
      { error: 'Failed to trigger scraper', details: String(error) },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
