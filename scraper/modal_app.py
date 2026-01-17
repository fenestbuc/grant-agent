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
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(
        # Playwright dependencies
        "libnss3",
        "libnspr4",
        "libatk1.0-0",
        "libatk-bridge2.0-0",
        "libcups2",
        "libdrm2",
        "libxkbcommon0",
        "libxcomposite1",
        "libxdamage1",
        "libxfixes3",
        "libxrandr2",
        "libgbm1",
        "libasound2",
        "libpango-1.0-0",
        "libcairo2",
    )
    .pip_install(
        "crawl4ai>=0.4.0",
        "anthropic>=0.39.0",
        "supabase>=2.0.0",
        "playwright>=1.40.0",
        "beautifulsoup4>=4.12.0",
        "httpx>=0.25.0",
        "fastapi>=0.109.0",
    )
    .run_commands("playwright install chromium")
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


async def validate_grant_urls(grants: list[dict], timeout: float = 10.0) -> tuple[list[dict], list[dict]]:
    """
    Validate grant URLs and filter out grants with broken (404) URLs.

    Returns:
        tuple: (valid_grants, filtered_grants)
    """
    import httpx

    valid_grants = []
    filtered_grants = []

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=timeout,
        headers={"User-Agent": "Mozilla/5.0 (compatible; GrantAgent/1.0)"}
    ) as client:
        for grant in grants:
            url = grant.get("application_url") or grant.get("source_url", "")

            if not url:
                # No URL to validate, include the grant
                valid_grants.append(grant)
                continue

            try:
                # Use HEAD request for efficiency, fall back to GET if HEAD fails
                try:
                    response = await client.head(url)
                except httpx.HTTPStatusError:
                    response = await client.get(url)

                if response.status_code == 404:
                    print(f"Filtering out grant '{grant['name']}' - URL returns 404: {url}")
                    filtered_grants.append({
                        "name": grant["name"],
                        "provider": grant["provider"],
                        "url": url,
                        "reason": "404 Not Found"
                    })
                else:
                    valid_grants.append(grant)

            except httpx.TimeoutException:
                # Timeout - include the grant (might be slow server)
                print(f"URL timeout for '{grant['name']}': {url} - including anyway")
                valid_grants.append(grant)
            except Exception as e:
                # Other errors (connection refused, DNS, etc.) - include the grant
                print(f"URL check error for '{grant['name']}': {url} - {str(e)[:50]} - including anyway")
                valid_grants.append(grant)

    return valid_grants, filtered_grants


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
- contact_email: Email address for inquiries/POC (or null if not found). Look for email addresses mentioned in contact sections, helpdesk info, or application guidelines.
- is_active: boolean (true if currently accepting applications)

Return ONLY a valid JSON array. If no grants found, return empty array [].

Example output:
[
  {{
    "name": "Startup India Seed Fund Scheme",
    "provider": "DPIIT",
    "amount_min": 2000000,
    "amount_max": 5000000,
    "deadline": null,
    "description": "Provides financial assistance to startups for proof of concept, prototype development, product trials, market entry, and commercialization.",
    "sectors": ["all"],
    "stages": ["ideation", "early"],
    "eligibility_criteria": {{
      "min_age_months": null,
      "max_age_months": 24,
      "incorporation_required": true,
      "dpiit_required": true,
      "women_led": false,
      "states": [],
      "entity_types": ["private_limited", "llp", "partnership"]
    }},
    "application_url": "https://seedfund.startupindia.gov.in/apply",
    "contact_email": "seedfund@startupindia.gov.in",
    "is_active": true
  }}
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
async def scrape_and_extract(source: dict) -> dict:
    """Scrape a grant source and extract structured data."""
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
    import anthropic

    debug_info = {"url": source["url"], "content_length": 0, "crawl_success": False}
    print(f"Scraping: {source['name']} - {source['url']}")

    # Configure browser for JavaScript-heavy sites
    browser_config = BrowserConfig(
        headless=True,
        verbose=True,
    )

    crawler_config = CrawlerRunConfig(
        wait_until="networkidle",
        page_timeout=60000,
        delay_before_return_html=3.0,
    )

    try:
        async with AsyncWebCrawler(config=browser_config) as crawler:
            result = await crawler.arun(
                url=source["url"],
                config=crawler_config,
            )

            debug_info["crawl_success"] = result.success
            if not result.success:
                debug_info["error"] = result.error_message
                print(f"Failed to crawl {source['url']}: {result.error_message}")
                return {"grants": [], "debug": debug_info}

            # Get markdown content (LLM-ready format)
            # Crawl4AI 0.8+ returns MarkdownGenerationResult with raw_markdown property
            if hasattr(result, 'markdown') and result.markdown:
                if hasattr(result.markdown, 'raw_markdown'):
                    content = result.markdown.raw_markdown
                else:
                    content = str(result.markdown)
            else:
                content = ""

            # Fallback to html if markdown is empty
            if not content or len(content) < 100:
                content = result.html[:50000] if result.html else ""
                debug_info["used_html_fallback"] = True

            debug_info["content_length"] = len(content) if content else 0
            debug_info["content_preview"] = content[:500] if content else ""

            if not content or len(content) < 100:
                print(f"No meaningful content extracted from {source['url']}")
                return {"grants": [], "debug": debug_info}

            # Truncate if too long
            content = content[:50000]

            print(f"Extracted {len(content)} chars from {source['url']}")

    except Exception as e:
        debug_info["error"] = str(e)
        print(f"Crawl error for {source['url']}: {e}")
        return {"grants": [], "debug": debug_info}

    # Extract structured data using Claude
    response_text = None
    json_text = None
    try:
        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": EXTRACTION_PROMPT.format(content=content),
                }
            ],
        )

        response_text = response.content[0].text
        debug_info["claude_response_preview"] = response_text[:1000]

        # Parse JSON from response
        # Handle potential markdown code blocks
        json_text = response_text
        if "```json" in json_text:
            json_text = json_text.split("```json")[1].split("```")[0]
        elif "```" in json_text:
            json_text = json_text.split("```")[1].split("```")[0]

        # Try to find JSON array in response
        json_text = json_text.strip()
        if not json_text.startswith("["):
            # Try to find array start
            start_idx = json_text.find("[")
            if start_idx != -1:
                json_text = json_text[start_idx:]

        # Find matching end bracket
        if json_text.startswith("["):
            bracket_count = 0
            end_idx = 0
            for i, c in enumerate(json_text):
                if c == "[":
                    bracket_count += 1
                elif c == "]":
                    bracket_count -= 1
                    if bracket_count == 0:
                        end_idx = i + 1
                        break
            if end_idx > 0:
                json_text = json_text[:end_idx]

        debug_info["json_text_preview"] = json_text[:500] if json_text else "N/A"
        parsed = json.loads(json_text)
        debug_info["parsed_type"] = str(type(parsed))

        # Ensure we have a list
        if isinstance(parsed, dict):
            # Check if it's wrapped in a "grants" key
            if "grants" in parsed and isinstance(parsed["grants"], list):
                grants = parsed["grants"]
            else:
                grants = [parsed]
        elif isinstance(parsed, list):
            grants = parsed
        else:
            debug_info["parse_type_error"] = f"Unexpected type: {type(parsed)}"
            return {"grants": [], "debug": debug_info}

        debug_info["grants_count_before_validation"] = len(grants)

        # Validate and add source metadata
        valid_grants = []
        for i, grant in enumerate(grants):
            if not isinstance(grant, dict):
                debug_info[f"grant_{i}_skip_reason"] = f"Not a dict: {type(grant)}"
                continue
            if "name" not in grant:
                debug_info[f"grant_{i}_skip_reason"] = "Missing name"
                continue
            if "provider" not in grant:
                debug_info[f"grant_{i}_skip_reason"] = "Missing provider"
                continue

            # Validate that name and provider are strings
            if not isinstance(grant.get("name"), str):
                debug_info[f"grant_{i}_skip_reason"] = f"Name not string: {type(grant.get('name'))}"
                continue
            if not isinstance(grant.get("provider"), str):
                debug_info[f"grant_{i}_skip_reason"] = f"Provider not string: {type(grant.get('provider'))}"
                continue

            grant["source_url"] = source["url"]
            grant["source_name"] = source["name"]
            grant["source_type"] = source["type"]
            # Generate deterministic ID
            grant["external_id"] = generate_grant_id(grant["name"], grant["provider"])
            valid_grants.append(grant)

        print(f"Extracted {len(valid_grants)} grants from {source['name']}")
        return {"grants": valid_grants, "debug": debug_info}

    except json.JSONDecodeError as e:
        debug_info["json_error"] = str(e)
        debug_info["json_text_preview"] = json_text[:500] if json_text else "N/A"
        debug_info["response_text_preview"] = response_text[:1000] if response_text else "N/A"
        print(f"JSON parse error for {source['url']}: {e}")
        return {"grants": [], "debug": debug_info}
    except Exception as e:
        import traceback
        debug_info["claude_error"] = str(e)
        debug_info["error_traceback"] = traceback.format_exc()
        debug_info["response_text_preview"] = response_text[:1000] if response_text else "N/A"
        debug_info["json_text_preview"] = json_text[:500] if json_text else "N/A"
        print(f"Claude extraction error for {source['url']}: {e}")
        print(traceback.format_exc())
        return {"grants": [], "debug": debug_info}


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
            # Check if grant exists by name + provider combination
            existing = (
                client.table("grants")
                .select("id")
                .eq("name", grant["name"])
                .eq("provider", grant["provider"])
                .execute()
            )

            # Prepare grant data for database (matching actual schema)
            # Map source_type to provider_type
            source_type = grant.get("source_type", "government")
            provider_type_map = {
                "government": "government",
                "csr": "csr",
                "aggregator": "private",  # aggregator sources mapped to private
                "private": "private",
                "ngo": "ngo",
            }
            provider_type = provider_type_map.get(source_type, "government")

            grant_data = {
                "name": grant["name"],
                "provider": grant["provider"],
                "provider_type": provider_type,
                "amount_min": grant.get("amount_min"),
                "amount_max": grant.get("amount_max"),
                "deadline": grant.get("deadline"),
                "description": grant.get("description", "") or "No description available",
                "sectors": grant.get("sectors", []),
                "stages": grant.get("stages", []),
                "eligibility_criteria": grant.get("eligibility_criteria", {}),
                "url": grant.get("application_url") or grant.get("source_url", ""),
                "contact_email": grant.get("contact_email"),
                "is_active": grant.get("is_active", True),
                "updated_at": datetime.utcnow().isoformat(),
            }

            if existing.data and len(existing.data) > 0:
                # Update existing grant
                client.table("grants").update(grant_data).eq(
                    "name", grant["name"]
                ).eq("provider", grant["provider"]).execute()
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
            result = await scrape_and_extract.remote.aio(source)
            grants = result.get("grants", [])
            debug = result.get("debug", {})
            all_grants.extend(grants)
            source_results[source["name"]] = {
                "grants_found": len(grants),
                "status": "success",
                "debug": debug,
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

    # Validate URLs and filter out grants with broken (404) URLs
    print("Validating grant URLs...")
    valid_grants, filtered_grants = await validate_grant_urls(unique_grants)
    print(f"Valid grants: {len(valid_grants)}, Filtered out (404): {len(filtered_grants)}")

    # Upsert only valid grants to database
    db_results = upsert_grants.remote(valid_grants)

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "total_grants_found": len(unique_grants),
        "valid_grants": len(valid_grants),
        "filtered_grants": filtered_grants,
        "sources": source_results,
        "database": db_results,
    }


@app.function(schedule=modal.Cron("0 0 * * *"))  # Every day at midnight UTC (5:30 AM IST)
async def scheduled_scrape():
    """Scheduled nightly scrape."""
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
@modal.fastapi_endpoint(method="POST")
async def trigger_scrape():
    """HTTP endpoint to trigger scrape manually."""
    result = await run_full_scrape.remote.aio()
    return result
