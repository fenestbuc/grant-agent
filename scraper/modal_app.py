"""
Grant Agent - Web Scraper
Uses Modal.com for serverless execution and Crawl4AI for scraping.
Extracts grant data from Indian government and CSR portals.
"""

import modal
import json
import os
from datetime import datetime, timedelta
from typing import Optional
import hashlib

# Define the Modal image with all dependencies
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "crawl4ai>=0.4.0",
    "anthropic>=0.39.0",
    "supabase>=2.0.0",
    "playwright>=1.40.0",
    "beautifulsoup4>=4.12.0",
    "httpx>=0.25.0",
)

# Create Modal app
app = modal.App("grant-agent-scraper", image=image)

# Grant sources to scrape
GRANT_SOURCES = [
    {
        "name": "Startup India Government Schemes",
        "url": "https://www.startupindia.gov.in/content/sih/en/government-schemes.html",
        "type": "government",
        "provider": "Startup India",
    },
    {
        "name": "SISFS Seed Fund",
        "url": "https://seedfund.startupindia.gov.in/",
        "type": "government",
        "provider": "Startup India",
    },
    {
        "name": "NIDHI Programs",
        "url": "https://nidhi.dst.gov.in/schemes-programmes/",
        "type": "government",
        "provider": "DST",
    },
    {
        "name": "BIRAC Funding Schemes",
        "url": "https://birac.nic.in/desc_new.php?id=89",
        "type": "government",
        "provider": "BIRAC",
    },
    {
        "name": "Startup Grants India Aggregator",
        "url": "https://startupgrantsindia.com/",
        "type": "aggregator",
        "provider": "StartupGrantsIndia",
    },
]


def generate_grant_id(name: str, provider: str) -> str:
    """Generate a deterministic ID for a grant based on name and provider."""
    content = f"{name.lower().strip()}-{provider.lower().strip()}"
    return hashlib.sha256(content.encode()).hexdigest()[:12]


EXTRACTION_PROMPT = """
Analyze this webpage content about Indian startup grants/funding schemes.
Extract ALL grants mentioned and return a JSON array of grant objects.

For each grant found, extract:
- name: Grant/scheme name (required)
- provider: Organization providing the grant (required)
- amount_min: Minimum funding amount in INR (number or null)
- amount_max: Maximum funding amount in INR (number or null)
- deadline: Application deadline as ISO date string (or null if ongoing)
- description: 2-3 sentence description
- sectors: Array of applicable sectors (e.g., ["healthtech", "fintech", "all"])
- stages: Array of applicable stages (e.g., ["ideation", "early", "growth"])
- eligibility_criteria: Object with:
  - min_age_months: Minimum company age in months (number or null)
  - max_age_months: Maximum company age in months (number or null)
  - incorporation_required: boolean
  - dpiit_required: boolean
  - women_led: boolean (true if women-led preference)
  - states: Array of eligible states (empty array if all states)
  - entity_types: Array of eligible entity types
- application_url: Direct application link (or null)
- is_active: boolean (true if currently accepting applications)

Return ONLY a valid JSON array. If no grants found, return empty array [].

Example output:
[
  {
    "name": "Startup India Seed Fund Scheme",
    "provider": "DPIIT",
    "amount_min": 2000000,
    "amount_max": 5000000,
    "deadline": null,
    "description": "Provides financial assistance to startups for proof of concept, prototype development, product trials, market entry, and commercialization.",
    "sectors": ["all"],
    "stages": ["ideation", "early"],
    "eligibility_criteria": {
      "min_age_months": null,
      "max_age_months": 24,
      "incorporation_required": true,
      "dpiit_required": true,
      "women_led": false,
      "states": [],
      "entity_types": ["private_limited", "llp", "partnership"]
    },
    "application_url": "https://seedfund.startupindia.gov.in/apply",
    "is_active": true
  }
]

Webpage content:
{content}
"""


@app.function(
    secrets=[
        modal.Secret.from_name("anthropic-api-key"),
        modal.Secret.from_name("supabase-credentials"),
    ],
    timeout=600,
)
async def scrape_and_extract(source: dict) -> list[dict]:
    """Scrape a grant source and extract structured data."""
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
    import anthropic

    print(f"Scraping: {source['name']} - {source['url']}")

    # Configure browser for JavaScript-heavy sites
    browser_config = BrowserConfig(
        headless=True,
        verbose=False,
    )

    crawler_config = CrawlerRunConfig(
        wait_until="networkidle",
        page_timeout=60000,
        delay_before_return_html=2.0,
    )

    try:
        async with AsyncWebCrawler(config=browser_config) as crawler:
            result = await crawler.arun(
                url=source["url"],
                config=crawler_config,
            )

            if not result.success:
                print(f"Failed to crawl {source['url']}: {result.error_message}")
                return []

            # Get markdown content (LLM-ready format)
            content = result.markdown_v2.raw_markdown if result.markdown_v2 else result.markdown

            if not content or len(content) < 100:
                print(f"No meaningful content extracted from {source['url']}")
                return []

            # Truncate if too long
            content = content[:50000]

            print(f"Extracted {len(content)} chars from {source['url']}")

    except Exception as e:
        print(f"Crawl error for {source['url']}: {e}")
        return []

    # Extract structured data using Claude
    try:
        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": EXTRACTION_PROMPT.format(content=content),
                }
            ],
        )

        response_text = response.content[0].text

        # Parse JSON from response
        # Handle potential markdown code blocks
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]

        grants = json.loads(response_text.strip())

        # Add source metadata
        for grant in grants:
            grant["source_url"] = source["url"]
            grant["source_name"] = source["name"]
            grant["source_type"] = source["type"]
            # Generate deterministic ID
            grant["external_id"] = generate_grant_id(grant["name"], grant["provider"])

        print(f"Extracted {len(grants)} grants from {source['name']}")
        return grants

    except json.JSONDecodeError as e:
        print(f"JSON parse error for {source['url']}: {e}")
        return []
    except Exception as e:
        print(f"Claude extraction error for {source['url']}: {e}")
        return []


@app.function(
    secrets=[modal.Secret.from_name("supabase-credentials")],
    timeout=300,
)
def upsert_grants(grants: list[dict]) -> dict:
    """Upsert extracted grants to Supabase."""
    from supabase import create_client

    if not grants:
        return {"inserted": 0, "updated": 0, "errors": 0}

    supabase_url = os.environ["SUPABASE_URL"]
    supabase_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

    client = create_client(supabase_url, supabase_key)

    inserted = 0
    updated = 0
    errors = 0

    for grant in grants:
        try:
            # Check if grant exists by external_id
            existing = (
                client.table("grants")
                .select("id")
                .eq("external_id", grant["external_id"])
                .execute()
            )

            # Prepare grant data for database
            grant_data = {
                "external_id": grant["external_id"],
                "name": grant["name"],
                "provider": grant["provider"],
                "amount_min": grant.get("amount_min"),
                "amount_max": grant.get("amount_max"),
                "deadline": grant.get("deadline"),
                "description": grant.get("description", ""),
                "sectors": grant.get("sectors", []),
                "stages": grant.get("stages", []),
                "eligibility_criteria": grant.get("eligibility_criteria", {}),
                "application_url": grant.get("application_url"),
                "source_url": grant.get("source_url"),
                "is_active": grant.get("is_active", True),
                "updated_at": datetime.utcnow().isoformat(),
            }

            if existing.data and len(existing.data) > 0:
                # Update existing grant
                client.table("grants").update(grant_data).eq(
                    "external_id", grant["external_id"]
                ).execute()
                updated += 1
            else:
                # Insert new grant
                grant_data["created_at"] = datetime.utcnow().isoformat()
                client.table("grants").insert(grant_data).execute()
                inserted += 1

        except Exception as e:
            print(f"Error upserting grant {grant.get('name', 'unknown')}: {e}")
            errors += 1

    return {"inserted": inserted, "updated": updated, "errors": errors}


@app.function(
    secrets=[
        modal.Secret.from_name("anthropic-api-key"),
        modal.Secret.from_name("supabase-credentials"),
    ],
    timeout=1800,
)
async def run_full_scrape() -> dict:
    """Run a full scrape of all grant sources."""
    print(f"Starting full scrape at {datetime.utcnow().isoformat()}")

    all_grants = []
    source_results = {}

    # Scrape all sources
    for source in GRANT_SOURCES:
        try:
            grants = await scrape_and_extract.remote.aio(source)
            all_grants.extend(grants)
            source_results[source["name"]] = {
                "grants_found": len(grants),
                "status": "success",
            }
        except Exception as e:
            print(f"Error scraping {source['name']}: {e}")
            source_results[source["name"]] = {
                "grants_found": 0,
                "status": "error",
                "error": str(e),
            }

    # Deduplicate by external_id
    seen_ids = set()
    unique_grants = []
    for grant in all_grants:
        if grant["external_id"] not in seen_ids:
            seen_ids.add(grant["external_id"])
            unique_grants.append(grant)

    print(f"Total unique grants found: {len(unique_grants)}")

    # Upsert to database
    db_results = upsert_grants.remote(unique_grants)

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "total_grants_found": len(unique_grants),
        "sources": source_results,
        "database": db_results,
    }


@app.function(schedule=modal.Cron("0 6 * * 1"))  # Every Monday at 6 AM UTC
async def scheduled_scrape():
    """Scheduled weekly scrape."""
    result = await run_full_scrape.remote.aio()
    print(f"Scheduled scrape completed: {json.dumps(result, indent=2)}")
    return result


@app.local_entrypoint()
async def main():
    """Local entrypoint for testing."""
    print("Running grant scraper...")
    result = await run_full_scrape.remote.aio()
    print(json.dumps(result, indent=2))


# For manual triggering via HTTP
@app.function(
    secrets=[
        modal.Secret.from_name("anthropic-api-key"),
        modal.Secret.from_name("supabase-credentials"),
    ],
)
@modal.web_endpoint(method="POST")
async def trigger_scrape():
    """HTTP endpoint to trigger scrape manually."""
    result = await run_full_scrape.remote.aio()
    return result
