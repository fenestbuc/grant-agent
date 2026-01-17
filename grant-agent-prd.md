# Product Requirements Document (PRD)
## Startup Grants AI Agent Platform

**Version:** 1.0  
**Date:** January 17, 2025  
**Status:** Planning Phase  
**Owner:** Kubar Labs  

---

## 1. Executive Summary

**Problem:** Indian startup founders spend 10-40 hours/week applying for grants (5-10 applications at 2-4 hours each). Each grant has different application forms, eligibility criteria, required documents, and question sets. Founders manually tailor answers to each grant.

**Solution:** A unified platform that:
1. Aggregates 100+ Indian startup grants in one portal
2. Builds AI-powered knowledge base from founder's startup data
3. Auto-generates customized answers for each grant's specific questions
4. Enables founders to apply for 5-10 grants/week in 2-3 hours instead of 10-40 hours
5. Provides grant discovery, filtering, and smart recommendations

**Market Size:** 50,000+ registered startups in India, 80%+ actively seeking grants. Addressable market: 40,000+ TAM, potential revenue ₹5-10 crore annually at 20-30% adoption.

---

## 2. Product Vision & Goals

### Vision
"Make startup grant applications 10x faster by combining intelligent data aggregation with AI-powered personalization."

### Primary Goals (12-month roadmap)
- **Discovery:** Index 150+ grants with real-time updates
- **Efficiency:** Reduce per-application time from 2-4 hours to 15-30 minutes
- **Adoption:** 5,000 active founders using platform in Year 1
- **Revenue:** MRR ₹20-30 lakhs by end of Year 1

---

## 3. Core Features (MVP Phase 1)

### 3.1 Grant Discovery & Exploration
**Feature:** Unified Grant Portal

**Functionality:**
- Display 100+ grants in clean, minimal UI
- Real-time data from government portals + CSR schemes
- Search by: grant name, provider, amount, sector
- Filter by:
  - Grant amount (₹5L-₹50L range sliders)
  - Sector (30+ categories: AgriTech, EdTech, HealthTech, etc.)
  - Incorporation status (Pre-incorporated idea, LLC, Pvt Ltd)
  - Revenue eligibility (Turnover: 0-100Cr)
  - Age of startup (0-10 years)
  - Stage (Idea, MVP, Growth)

**UI Components:**
- Grant cards with: name, amount, deadline, 3-line description, "View Details" CTA
- Detail modal: full description, eligibility, docs needed, contact info, "Apply Now" button
- Sorting: by deadline, amount, sector, match score

**Data Requirements:**
- 100+ grants structured in database
- Weekly refresh from government APIs + Crawl4AI scraping

---

### 3.2 Knowledge Base Creation (KBC)
**Feature:** Startup Data Ingestion

**Functionality:**
- Multi-format upload: PDF, DOCX, PPTX, CSV, TXT, Chat exports (ChatGPT, Claude)
- Bulk upload: 20+ files simultaneously
- Progress tracking: % complete, file status
- File preview: See what was extracted
- Auto-extraction of metadata:
  - Company name, sector, stage, revenue
  - Team size, founder names, key achievements
  - Product description, market size
  - Compliance status (incorporation date, registration)

**Supported Document Types:**
- Pitch decks (extract slides as sections)
- Product docs (feature lists, roadmap)
- Compliance docs (MOA, CoA, GST certificates)
- Chat transcripts (extract Q&A pairs)
- Business plans (extract sections)
- Financial documents (revenue, burn rate)

**Processing:**
1. Parse files → Extract text/metadata
2. Clean & chunk text (semantic chunking: 500-1000 char per chunk)
3. Generate embeddings (OpenAI ada-002 or Sentence Transformers)
4. Store in pgvector + metadata in PostgreSQL
5. Index created in real-time

**UI:**
- Drag-and-drop upload area
- File list with checkboxes (select/deselect for processing)
- Progress bar during extraction
- "View Knowledge Base Summary" button → shows extracted metadata
- Ability to edit extracted info (company name, sector, etc.)

---

### 3.3 Grant Application Assistant
**Feature:** AI-Powered Answer Generation

**Functionality:**
- User selects a grant → "Start Application"
- Platform fetches grant form (from database or scrapes if new)
- Parses grant form to extract questions/fields
- For each question:
  1. Query knowledge base for relevant context
  2. Generate answer via Claude API with context
  3. Display [Generated Answer | Edit | Regenerate | Copy to Clipboard]

**Answer Generation Logic:**
```
Question: "Describe your startup's problem and solution"

KB Query: Search for problem statement, market need, solution description
Retrieved Docs: Pitch deck (3 chunks), product doc (2 chunks)

Prompt Template:
"Based on the startup information provided, answer this grant question concisely (200 words max): {question}"

Generated Answer:
"Our startup [company name] addresses [problem] by [solution]. 
We've identified a market opportunity of [market size] and are serving [target customers]..."

User can: Edit, Regenerate, Copy directly to grant form
```

**Features:**
- Bulk generation: Generate all answers at once
- Answer reuse: Save answers for similar questions across grants
- Citation tracking: Show which docs contributed to each answer
- Length control: Adjust word count per answer
- Tone adjustment: Professional, casual, technical

**UI:**
- Step-by-step form wizard
- Left panel: Questions list with completion status
- Right panel: Question + Generated Answer + Action buttons
- Progress bar: X of Y questions completed

---

### 3.4 Email Draft Generator
**Feature:** Pre-Application Email Template

**Functionality:**
- User has completed application
- Platform generates professional email to grant provider
- Email includes:
  - Personal greeting
  - Brief company intro
  - Why applying for this specific grant
  - Key differentiator/traction
  - Call to action
  - Founder contact info

**Example Output:**
```
Subject: [Startup Name] - Application Submission for [Grant Name]

Dear [Grant Manager Name],

I hope this email finds you well. I'm [Founder Name], 
founder of [Startup Name], a [sector] startup addressing [problem].

We're excited to submit our application for [Grant Name]. 
Our startup has [traction/achievement] and we believe we're an ideal fit because [reason].

I've attached our complete application and supporting documents. 
Feel free to reach out if you need any additional information.

Best regards,
[Founder Name]
```

**Customization:** Edit before sending, manually send or integrate with Gmail/Outlook

---

### 3.5 Watchlist & Notifications
**Feature:** Grant Alert System

**Functionality:**
- Users add grants to watchlist
- Get notified when:
  - Application window opens (1 week before, 1 day before)
  - Deadline approaching (1 week, 3 days, 1 day before)
  - Grant details change (amount, eligibility, docs)
  - New grants added in user's sectors

**Notification Channels:**
- Email (preferred)
- In-app notifications (dashboard banner)
- SMS (premium feature, Phase 2)

**UI:**
- "Add to Watchlist" button on grant card
- Watchlist dashboard: table of 50+ watched grants with next deadline
- Notification preferences: toggle by grant, notification type, channel

---

### 3.6 Grant Recommendations
**Feature:** Smart Grant Matching

**Functionality:**
- Platform analyzes startup profile (from KB) + grant requirements
- Generates match score (0-100%) based on:
  - Sector alignment: 40%
  - Revenue eligibility: 20%
  - Incorporation status match: 15%
  - Stage alignment: 15%
  - Traction/age requirements: 10%

**Display:**
- Home dashboard: "Top 10 Recommended Grants for [Company]"
- Grant card shows: name, amount, match % (green/yellow/red), "View" CTA
- Reason for recommendation (e.g., "92% match - Perfect sector fit, meets revenue requirements")

---

## 4. Technical Architecture

### 4.1 Technology Stack (Detailed)

**Frontend:**
- Next.js 14 + React 19 (TypeScript)
- Tailwind CSS + Shadcn/UI components
- TanStack Query (React Query) for server state
- Zustand for client state (auth, UI)
- React Dropzone for file uploads
- React Hook Form + Zod for form validation

**Backend:**
- Nest.js + Node.js (TypeScript)
- PostgreSQL (primary DB + pgvector for embeddings)
- Redis (caching, job queue)
- Bull for async jobs
- Anthropic Claude API (LLM)
- OpenAI API (embeddings fallback)

**AI/ML:**
- LangChain.js for RAG orchestration
- pgvector (Postgres extension) for vector storage
- OpenAI embeddings or Sentence Transformers (self-hosted)

**Scraping & Data:**
- Crawl4AI (Python microservice)
- FastAPI for Python backend
- Docker containers for deployment

**Infrastructure:**
- Vercel (Frontend deployment + Edge Functions)
- AWS or Railway (Backend)
- AWS S3 (document storage)
- AWS Lambda (async jobs, alternatively Bull+Redis)
- GitHub Actions (CI/CD)
- Terraform (IaC)

**Services & APIs:**
- Anthropic Claude API (₹100-500/month depending on usage)
- OpenAI API for embeddings (fallback, ~₹50-100/month)
- SendGrid for email (free tier: 100/day)
- AWS services (S3, Lambda, CloudWatch)

### 4.2 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  ┌──────────────┬──────────────┬──────────────────────────┐  │
│  │ Grant Portal │ Knowledge    │ Application Assistant   │  │
│  │              │ Base Manager │                          │  │
│  └──────────────┴──────────────┴──────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ API (REST/GraphQL)
┌────────────────────────┴────────────────────────────────────┐
│              Backend (Nest.js + Node.js)                    │
│  ┌──────────────┬──────────────┬──────────────────────────┐  │
│  │ Auth Service │ Grant        │ Document Processing     │  │
│  │              │ Service      │ Service                 │  │
│  ├──────────────┼──────────────┼──────────────────────────┤  │
│  │ KB Service   │ Application  │ Email Service           │  │
│  │ (RAG)        │ Service      │                          │  │
│  └──────────────┴──────────────┴──────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
         ┌───────────────┼───────────────┬──────────────┐
         │               │               │              │
    ┌────▼──────┐  ┌────▼──────┐  ┌────▼──────┐  ┌───▼─────┐
    │ PostgreSQL│  │ Redis      │  │ AWS S3    │  │ LLM     │
    │ + pgvector│  │ (Cache)    │  │ (Docs)    │  │ APIs    │
    └───────────┘  └────────────┘  └───────────┘  └─────────┘
         
┌────────────────────────────────────────────────────────────┐
│         Data Pipeline (Python + Crawl4AI)                  │
│  ┌──────────────┬──────────────┬──────────────────────────┐  │
│  │ Web Scraper  │ Form Parser  │ Data Extractor          │  │
│  │ (Crawl4AI)   │ (LLM)        │ (LLM)                   │  │
│  └──────────────┴──────────────┴──────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
    ┌────▼──────────────┐         ┌────▼──────────────┐
    │ Government Portals│         │ Bank/Incubator    │
    │ (NIDHI, SISFS)    │         │ Websites          │
    └───────────────────┘         └───────────────────┘
```

### 4.3 Data Flow Examples

**Flow 1: Grant Discovery**
```
User Opens App
  → Dashboard fetches list of 150 grants from PostgreSQL
  → Applies filters (sector, amount, incorporation status)
  → Shows filtered results sorted by deadline
  → User clicks grant → Modal shows details + "Apply Now"
```

**Flow 2: Knowledge Base Creation**
```
User Uploads Startup Docs (5 PDFs + 1 DOCX)
  → Files stored in AWS S3
  → Bull job queued for processing
  → Python service processes each file:
    - PDF parsed with PyPDF/PDFPlumber
    - Text extracted → Chunked (500 char semantic chunks)
    - Metadata extracted via Claude (company name, sector, etc.)
    - Embeddings generated (OpenAI ada-002)
  → Embeddings + chunks stored in pgvector
  → Metadata stored in PostgreSQL
  → Redis cache invalidated
  → User sees "Knowledge Base Created" notification
```

**Flow 3: Application Assistant**
```
User Selects Grant + Clicks "Start Application"
  → Platform queries database for grant form structure
  → If form not in DB, Crawl4AI scrapes form URL + LLM parses questions
  → For each question:
    - Generate embedding of question
    - Query pgvector for top-5 similar chunks from KB
    - Build prompt with context
    - Call Claude API with prompt + context
    - Display generated answer
  → User edits answers as needed
  → User submits + Email draft generated
  → Data saved to PostgreSQL (application_answers table)
```

**Flow 4: Grant Updates (Scheduled)**
```
Every Week (Cron Job):
  → Crawl4AI scrapes 30+ government portals
  → LLM extracts structured grant info
  → Compares with existing DB entries
  → Identifies new grants + deadline changes
  → Updates PostgreSQL
  → Triggers notifications for users watching affected grants
  → Logs update timestamps
```

---

## 5. Database Schema (Core Tables)

```sql
-- Grants Table
CREATE TABLE grants (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(100),
  description TEXT,
  amount_min BIGINT,
  amount_max BIGINT,
  sectors JSON,
  eligibility JSON,
  application_window_open DATE,
  application_window_close DATE,
  documents_required JSON,
  contact_info JSON,
  form_url VARCHAR(500),
  form_parsed BOOLEAN DEFAULT FALSE,
  form_questions JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Startups (Users' Company Profiles)
CREATE TABLE startups (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255),
  sector VARCHAR(100),
  stage ENUM('idea', 'mvp', 'growth', 'scale'),
  founded_date DATE,
  incorporation_date DATE,
  entity_type ENUM('idea', 'llp', 'pvt_ltd', 'opc'),
  revenue_annualized BIGINT,
  team_size INT,
  description TEXT,
  website VARCHAR(255),
  metadata JSON,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Knowledge Base Documents
CREATE TABLE kb_documents (
  id UUID PRIMARY KEY,
  startup_id UUID REFERENCES startups(id),
  file_name VARCHAR(255),
  file_type VARCHAR(50),
  file_size BIGINT,
  s3_url VARCHAR(500),
  extracted_text TEXT,
  extracted_metadata JSON,
  is_processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- KB Chunks (for vector storage)
CREATE TABLE kb_chunks (
  id UUID PRIMARY KEY,
  startup_id UUID REFERENCES startups(id),
  document_id UUID REFERENCES kb_documents(id),
  chunk_text TEXT,
  chunk_index INT,
  embedding vector(1536),
  metadata JSON,
  created_at TIMESTAMP
);

-- Application Answers
CREATE TABLE application_answers (
  id UUID PRIMARY KEY,
  startup_id UUID REFERENCES startups(id),
  grant_id UUID REFERENCES grants(id),
  application_status ENUM('draft', 'submitted', 'rejected', 'accepted'),
  answers JSON,
  generated_email TEXT,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Watchlist
CREATE TABLE watchlist (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  grant_id UUID REFERENCES grants(id),
  added_at TIMESTAMP,
  notification_sent BOOLEAN DEFAULT FALSE
);

-- User Profiles
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 6. MVP Phase (3-4 Months)

### Scope:
1. ✅ Grant portal with 50 grants (NIDHI, SISFS, major CSR)
2. ✅ Knowledge base upload (PDF, DOCX, TXT)
3. ✅ Application assistant for 5 grant templates
4. ✅ Basic email draft generator
5. ✅ Watchlist + email notifications

### Out of Scope:
- SMS notifications
- Integration with actual grant forms (manual copy-paste)
- Mobile app
- Advanced filtering (sector sub-categories, GST revenue link)
- Grant recommendations (Phase 2)
- Multi-team collaboration

### Deliverables:
- Public beta version at www.grantai.in
- 50 grants indexed
- 200+ beta users
- Figma designs + Frontend components
- Backend APIs (20+ endpoints)
- Documentation (API, user guide)

---

## 8. Success Metrics

### Engagement
- **Avg Knowledge Base Size:** 15 documents per startup
- **Avg Applications/Month:** 5 per active user
- **Completion Rate:** 60%+ (user completes application after generation)
- **Email Adoption:** 40%+ users send generated emails

### Product Quality
- **Knowledge Base Accuracy:** 90%+ user satisfaction on generated answers
- **App Load Time:** <2 seconds
- **Uptime:** 99.5%
- **Error Rate:** <0.1%

### Business
- **MRR by Month 6:** ₹3-5 lakhs
- **MRR by Month 12:** ₹8-10 lakhs
- **Churn Rate:** <5%/month
- **Net Revenue Retention:** 110%+

---

## 9. Implementation Roadmap

### Phase 1: MVP (To-build right now)

**Foundations**
- Project setup (Next.js, Nest.js, Postgres)
- Database schema design
- Authentication setup
- S3 bucket + file upload infrastructure

**Grant Portal**
- Design grant card UI (Figma)
- Seed 50 grants in DB
- Implement search + basic filtering
- Detail modal + "Apply Now" flow

**Knowledge Base**
- File upload UI component
- Document parsing (PDF, DOCX, TXT)
- Embedding generation pipeline
- pgvector integration

**Application Assistant (Part 1)**
- Grant form parser
- Question extraction
- KB query interface

**Application Assistant (Part 2)**
- LLM integration (Claude API)
- Answer generation pipeline
- Answer display + edit UI

**Email Generator + Watchlist**
- Email template generation
- Watchlist CRUD
- Email notification system
- SendGrid integration

**Testing + Refinement**
- Load testing
- Bug fixes
- UI/UX refinement
- Security audit

**Deployment**
- Deploy frontend (Vercel)
- Deploy backend (AWS/Railway)
- Beta user onboarding
- Documentation writing

### Phase 2: Growth Features
- Grant recommendations engine
- Advanced filtering (30+ sectors)
- Form auto-fill integration (browser extension)
- Team collaboration features
- Analytics dashboard

### Phase 3: Scale
- SMS notifications
- LinkedIn/Twitter integration
- Incubator partnership dashboard
- Advanced grant database (500+ grants)
- Premium API for incubators

---

## 10. Risk Analysis & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Web scraping blocked by portals | High | Medium | Use Crawl4AI + proxy rotation, build relationships with gov portals |
| LLM API costs scale unexpectedly | Medium | High | Implement prompt caching, rate limiting, consider open-source models |
| Low adoption due to low awareness | High | Medium | Partner with 10+ incubators, PR campaign, founders' community |
| Data privacy concerns | High | Low | Privacy-first design, SOC 2 compliance, clear ToS |
| Grant eligibility changes frequently | Medium | High | Weekly scraping refresh, update notifications, manual curation as backup |
| Competing with Startup Grants India | Medium | High | Differentiate via AI assistant, focus on time-saving, partner with DPIIT |

---

## 11. Competitive Landscape

| Competitor | Offerings | Gaps | Our Advantage |
|------------|-----------|------|---------------|
| StartupGrantsIndia.com | Grant listings only | No application help | AI assistant + answer generation |
| Incubator portals | Individual grant access | Fragmented experience | Unified portal + smart matching |
| Startup India portal | Government grants only | No CSR/private grants, no AI help | Aggregates all + AI-powered |
| Manual applications | Founder knowledge | Very time-consuming | 90% faster application process |

---

## 13. Success Criteria for MVP Completion

- ✅ 50+ grants searchable in portal
- ✅ 100+ active knowledge bases created
- ✅ 90%+ satisfaction on generated answers (survey)
- ✅ 50%+ of users complete at least 1 application
- ✅ <2 second page load time
- ✅ 99% uptime over 2 weeks
- ✅ No critical security vulnerabilities

