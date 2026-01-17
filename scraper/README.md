# Grant Agent - Web Scraper

Serverless grant scraper using Modal.com and Crawl4AI.

## Overview

This scraper:
1. Crawls Indian government and CSR grant portals
2. Extracts structured grant data using Claude
3. Upserts data to Supabase

## Setup

### 1. Install Modal CLI

```bash
pip install modal
modal setup  # Authenticate with Modal
```

### 2. Create Modal Secrets

Create these secrets in the Modal dashboard (https://modal.com/secrets):

**anthropic-api-key**:
```
ANTHROPIC_API_KEY=sk-ant-...
```

**supabase-credentials**:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3. Deploy

```bash
cd scraper
modal deploy modal_app.py
```

## Usage

### Run Manually (Local Test)

```bash
modal run modal_app.py
```

### Trigger via HTTP

After deployment, you'll get a webhook URL:
```bash
curl -X POST https://your-app--trigger-scrape.modal.run
```

### Scheduled Runs

The scraper runs automatically every Monday at 6 AM UTC via the `scheduled_scrape` function.

## Grant Sources

| Source | URL | Type |
|--------|-----|------|
| Startup India Schemes | startupindia.gov.in | Government |
| SISFS Seed Fund | seedfund.startupindia.gov.in | Government |
| NIDHI Programs | nidhi.dst.gov.in | Government |
| BIRAC Funding | birac.nic.in | Government |
| StartupGrantsIndia | startupgrantsindia.com | Aggregator |

## Adding New Sources

Edit `GRANT_SOURCES` in `modal_app.py`:

```python
GRANT_SOURCES = [
    {
        "name": "Source Name",
        "url": "https://example.com/grants",
        "type": "government",  # or "csr", "aggregator"
        "provider": "Provider Name",
    },
    # ...
]
```

## Architecture

```
                   ┌─────────────────┐
                   │   Modal.com     │
                   │   (Serverless)  │
                   └────────┬────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         v                  v                  v
   ┌───────────┐     ┌───────────┐     ┌───────────┐
   │ Crawl4AI  │     │  Claude   │     │ Supabase  │
   │ (Scrape)  │────>│ (Extract) │────>│ (Store)   │
   └───────────┘     └───────────┘     └───────────┘
```

## Cost

- **Modal**: Free tier includes 30 hours/month of compute
- **Claude API**: ~$0.003 per source scraped
- **Total**: ~$1-2/month for weekly scraping
