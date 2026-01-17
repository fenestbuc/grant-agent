# Technical Implementation Plan
## Startup Grants AI Agent Platform

**Version:** 1.0  
**Date:** January 17, 2025  

---

## 1. Project Setup & Infrastructure

### 1.1 Repository Structure

```
grant-agent/
├── frontend/                 # Next.js app
│   ├── app/                 # App router
│   │   ├── (auth)/
│   │   ├── dashboard/
│   │   ├── grants/
│   │   ├── kb/
│   │   └── application/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── styles/
│   └── package.json
│
├── backend/                 # Nest.js app
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── grants/
│   │   │   ├── kb/
│   │   │   ├── applications/
│   │   │   └── notifications/
│   │   ├── common/
│   │   ├── config/
│   │   └── main.ts
│   ├── Dockerfile
│   └── package.json
│
├── scraper/                 # Python + Crawl4AI
│   ├── services/
│   │   ├── crawl_service.py
│   │   ├── form_parser.py
│   │   └── extractor.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── main.py
│
└── infrastructure/
    ├── docker-compose.yml
    ├── terraform/
    └── scripts/
```

### 1.2 Technology Initialization

**Frontend:**
```bash
# Create Next.js project
npx create-next-app@latest grant-agent-frontend --typescript --tailwind

# Install core dependencies
cd frontend
npm install \
  @tanstack/react-query \
  zustand \
  react-hook-form \
  zod \
  @hookform/resolvers \
  axios \
  @shadcn/ui \
  lucide-react \
  date-fns \
  react-dropzone

# Dev dependencies
npm install -D @types/node @types/react @types/react-dom
```

**Backend:**
```bash
# Create Nest.js project
npm i -g @nestjs/cli
nest new grant-agent-backend

# Install core dependencies
cd backend
npm install \
  @nestjs/common \
  @nestjs/core \
  @nestjs/jwt \
  @nestjs/passport \
  @nestjs/typeorm \
  typeorm \
  postgres \
  pgvector \
  redis \
  bull \
  axios \
  @anthropic-ai/sdk \
  openai \
  aws-sdk \
  multer \
  class-validator \
  class-transformer \
  dotenv
```

**Scraper Service:**
```bash
# Create Python environment
mkdir grant-agent-scraper
cd grant-agent-scraper
python -m venv venv
source venv/bin/activate

# Create requirements.txt
cat > requirements.txt << 'EOF'
crawl4ai>=0.3.0
fastapi==0.109.0
uvicorn==0.27.0
pydantic==2.5.0
httpx==0.25.1
beautifulsoup4==4.12.2
aiohttp==3.9.1
python-dotenv==1.0.0
anthropic==0.7.0
EOF

pip install -r requirements.txt
```

### 1.3 Database Setup

**PostgreSQL + pgvector:**
```yaml
# docker-compose.yml
version: '3.9'
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: grant_user
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: grant_agent_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

**Initialize pgvector:**
```sql
-- init.sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;

-- Run database migrations (via TypeORM)
```

### 1.4 Environment Configuration

**Backend .env:**
```
# Database
DATABASE_URL=postgresql://grant_user:secure_password@localhost:5432/grant_agent_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRATION=24h

# LLM APIs
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1
S3_BUCKET=grant-agent-documents

# SendGrid
SENDGRID_API_KEY=...

# App
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000
```

**Frontend .env.local:**
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_NAME=GrantAI
```

---

## 2. Backend API Development

### 2.1 Auth Module

**Endpoints:**
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - User logout

**Implementation:**
```typescript
// src/modules/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, compare } from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async signup(email: string, password: string, name: string) {
    const hashedPassword = await hash(password, 10);
    const user = await this.userService.create({
      email,
      passwordHash: hashedPassword,
      name,
    });
    return this.generateToken(user);
  }

  async login(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new UnauthorizedException();
    
    const isValid = await compare(password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException();
    
    return this.generateToken(user);
  }

  private generateToken(user: User) {
    const access_token = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '24h' },
    );
    return { access_token, user };
  }
}
```

### 2.2 Grants Module

**Endpoints:**
- `GET /grants` - List all grants with filtering
- `GET /grants/:id` - Get grant details
- `GET /grants/search` - Search grants
- `POST /admin/grants` - Create grant (admin)
- `PUT /admin/grants/:id` - Update grant (admin)

**Implementation:**
```typescript
// src/modules/grants/grants.service.ts
@Injectable()
export class GrantsService {
  constructor(private db: Database) {}

  async listGrants(
    page: number = 1,
    limit: number = 20,
    filters: GrantFilters,
  ) {
    const query = this.db.query('SELECT * FROM grants WHERE 1=1');
    
    if (filters.sector) {
      query.where('sectors @> ?', JSON.stringify([filters.sector]));
    }
    if (filters.minAmount) {
      query.where('amount_max >= ?', filters.minAmount);
    }
    if (filters.maxAmount) {
      query.where('amount_min <= ?', filters.maxAmount);
    }
    
    const total = await query.count();
    const data = await query.limit(limit).offset((page - 1) * limit);
    
    return { data, total, page, limit };
  }

  async getGrantDetails(id: string) {
    return this.db.query('SELECT * FROM grants WHERE id = ?', [id]).first();
  }

  async searchGrants(query: string) {
    return this.db.query(
      'SELECT * FROM grants WHERE name ILIKE ? OR description ILIKE ?',
      [`%${query}%`, `%${query}%`],
    );
  }
}
```

**GrantFilters DTO:**
```typescript
export class GrantFilters {
  sector?: string;
  minAmount?: number;
  maxAmount?: number;
  incorporationStatus?: string;
  stage?: string;
  page?: number = 1;
  limit?: number = 20;
  sort?: 'deadline' | 'amount' | 'match_score';
}
```

### 2.3 Knowledge Base Module

**Endpoints:**
- `POST /kb/upload` - Upload documents
- `GET /kb/documents` - List KB documents
- `DELETE /kb/documents/:id` - Delete document
- `GET /kb/summary` - Get KB summary
- `POST /kb/query` - Query KB (internal use)

**Document Upload Handler:**
```typescript
// src/modules/kb/kb.service.ts
@Injectable()
export class KBService {
  constructor(
    private s3: S3Client,
    private redis: Redis,
    private db: Database,
    private queue: BullQueue,
  ) {}

  async uploadDocument(
    startupId: string,
    file: Express.Multer.File,
  ) {
    // Upload to S3
    const s3Key = `kb/${startupId}/${Date.now()}-${file.originalname}`;
    await this.s3.putObject({
      Bucket: process.env.S3_BUCKET,
      Key: s3Key,
      Body: file.buffer,
    });

    // Create DB record
    const doc = await this.db.query(
      'INSERT INTO kb_documents (startup_id, file_name, file_type, s3_url) VALUES (?, ?, ?, ?) RETURNING *',
      [startupId, file.originalname, file.mimetype, s3Key],
    );

    // Queue for processing
    await this.queue.add('process-document', {
      documentId: doc.id,
      s3Key,
      startupId,
    });

    return doc;
  }

  async queryKnowledgeBase(
    startupId: string,
    query: string,
    topK: number = 5,
  ) {
    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query);

    // Vector search in pgvector
    const results = await this.db.query(
      `SELECT chunk_text, metadata, 1 - (embedding <=> $1) as similarity
       FROM kb_chunks
       WHERE startup_id = $2
       ORDER BY embedding <=> $1
       LIMIT $3`,
      [queryEmbedding, startupId, topK],
    );

    return results.map(r => ({
      text: r.chunk_text,
      score: r.similarity,
      metadata: r.metadata,
    }));
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
    });
    return response.data[0].embedding;
  }
}
```

**Document Processing Worker:**
```typescript
// src/workers/document-processor.worker.ts
export async function processDocument(job: Job) {
  const { documentId, s3Key, startupId } = job.data;

  try {
    // Download from S3
    const file = await s3.getObject({
      Bucket: process.env.S3_BUCKET,
      Key: s3Key,
    });

    // Parse based on file type
    let text = '';
    if (s3Key.endsWith('.pdf')) {
      text = await parsePDF(file.Body);
    } else if (s3Key.endsWith('.docx')) {
      text = await parseDOCX(file.Body);
    } else {
      text = file.Body.toString();
    }

    // Extract metadata via LLM
    const metadata = await extractMetadata(text);

    // Chunk text
    const chunks = semanticChunk(text, 500);

    // Generate embeddings for each chunk
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk);
      
      await db.query(
        `INSERT INTO kb_chunks (startup_id, document_id, chunk_text, embedding, metadata)
         VALUES (?, ?, ?, ?, ?)`,
        [startupId, documentId, chunk, embedding, JSON.stringify(metadata)],
      );
    }

    // Update document status
    await db.query(
      'UPDATE kb_documents SET is_processed = true WHERE id = ?',
      [documentId],
    );

    // Invalidate cache
    await redis.del(`kb:${startupId}:summary`);

  } catch (error) {
    console.error('Document processing failed:', error);
    throw error;
  }
}

async function extractMetadata(text: string) {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Extract metadata from this startup document. Return JSON with: company_name, sector, stage, revenue, team_size, key_achievements. Document: ${text.substring(0, 2000)}`,
    }],
  });

  return JSON.parse(message.content[0].text);
}
```

### 2.4 Application Module

**Endpoints:**
- `GET /applications/grants/:grantId` - Get grant form structure
- `POST /applications/generate-answer` - Generate answer for a question
- `POST /applications/bulk-generate` - Generate all answers
- `POST /applications/save` - Save application
- `GET /applications/:id` - Get saved application
- `POST /applications/:id/generate-email` - Generate email

**Implementation:**
```typescript
// src/modules/applications/applications.service.ts
@Injectable()
export class ApplicationsService {
  constructor(
    private kbService: KBService,
    private grantsService: GrantsService,
    private anthropic: Anthropic,
  ) {}

  async generateAnswer(
    startupId: string,
    grantId: string,
    question: string,
    context?: string,
  ) {
    // Query KB for relevant context
    const kbResults = await this.kbService.queryKnowledgeBase(
      startupId,
      question,
      5,
    );

    const kbContext = kbResults
      .map(r => `- ${r.text} (confidence: ${(r.score * 100).toFixed(1)}%)`)
      .join('\n');

    // Get grant details for context
    const grant = await this.grantsService.getGrantDetails(grantId);

    // Build prompt
    const prompt = `You are helping a startup founder answer a grant application question.

Grant Name: ${grant.name}
Startup Information from Knowledge Base:
${kbContext}

Question: "${question}"

Generate a concise, professional answer (150-300 words) suitable for the grant application.
Focus on factual information from the KB. If information is not available, indicate it's to be provided.`;

    // Call Claude API
    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    return {
      answer: response.content[0].text,
      sources: kbResults.map(r => r.metadata),
      confidence: (kbResults[0]?.score || 0) * 100,
    };
  }

  async bulkGenerateAnswers(
    startupId: string,
    grantId: string,
    questions: string[],
  ) {
    const answers = await Promise.all(
      questions.map(q =>
        this.generateAnswer(startupId, grantId, q),
      ),
    );

    return {
      grantId,
      answers: answers.map((a, i) => ({
        question: questions[i],
        ...a,
      })),
      generatedAt: new Date(),
    };
  }

  async generateEmail(
    startupId: string,
    grantId: string,
    answers: Record<string, string>,
  ) {
    const grant = await this.grantsService.getGrantDetails(grantId);
    const startup = await this.startupService.getById(startupId);

    const prompt = `Generate a professional email from a startup founder to a grant officer.

Startup: ${startup.name}
Sector: ${startup.sector}
Grant: ${grant.name}

Key Highlights from Application:
${Object.entries(answers).slice(0, 3).map(([q, a]) => `- ${q}: ${a.substring(0, 100)}`).join('\n')}

Write a compelling 200-250 word email that:
1. Introduces the startup and problem
2. Highlights why they're a good fit for this grant
3. Includes a call to action
4. Is professional but personable`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    return {
      email: response.content[0].text,
      subject: `Application Submission - ${startup.name} for ${grant.name}`,
    };
  }
}
```

### 2.5 Notifications Module

**Endpoints:**
- `POST /watchlist` - Add grant to watchlist
- `DELETE /watchlist/:grantId` - Remove from watchlist
- `GET /watchlist` - Get user's watchlist
- `GET /notifications` - Get notifications
- `PATCH /notifications/:id/read` - Mark as read

**Email Notification Service:**
```typescript
// src/modules/notifications/email.service.ts
@Injectable()
export class EmailService {
  constructor(private sendgrid: SendGridClient) {}

  async sendApplicationReminder(
    user: User,
    grant: Grant,
    daysUntilDeadline: number,
  ) {
    const subject = `Reminder: ${grant.name} deadline in ${daysUntilDeadline} days`;
    
    await this.sendgrid.send({
      to: user.email,
      from: 'notifications@grantai.in',
      subject,
      html: `
        <h2>${grant.name}</h2>
        <p>Hi ${user.name},</p>
        <p>This is a reminder that the application deadline for <strong>${grant.name}</strong> is in <strong>${daysUntilDeadline} days</strong>.</p>
        <p><strong>Grant Amount:</strong> ₹${grant.amount_max.toLocaleString('en-IN')}</p>
        <a href="${process.env.FRONTEND_URL}/grants/${grant.id}">View Grant & Apply</a>
      `,
    });
  }

  async sendNewGrantNotification(user: User, grants: Grant[]) {
    const subject = `${grants.length} new grants matching your interests`;
    
    const grantsList = grants
      .map(g => `<li>${g.name} (₹${g.amount_max.toLocaleString('en-IN')})</li>`)
      .join('');

    await this.sendgrid.send({
      to: user.email,
      from: 'notifications@grantai.in',
      subject,
      html: `
        <h2>New Grants Available</h2>
        <p>Hi ${user.name},</p>
        <p>We found ${grants.length} new grants matching your interests:</p>
        <ul>${grantsList}</ul>
        <a href="${process.env.FRONTEND_URL}/grants">Browse All Grants</a>
      `,
    });
  }
}
```

---

## 3. Frontend Development

### 3.1 Project Structure

```
frontend/app/
├── (auth)/
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── layout.tsx
├── (dashboard)/
│   ├── layout.tsx
│   ├── page.tsx                # Home dashboard
│   ├── grants/
│   │   ├── page.tsx           # Grant explorer
│   │   └── [id]/page.tsx       # Grant details
│   ├── kb/
│   │   ├── page.tsx           # KB manager
│   │   └── documents/[id].tsx
│   ├── applications/
│   │   ├── page.tsx
│   │   └── [grantId]/page.tsx
│   └── watchlist/page.tsx
├── components/
│   ├── GrantCard.tsx
│   ├── GrantFilter.tsx
│   ├── GrantModal.tsx
│   ├── KBUploader.tsx
│   ├── ApplicationWizard.tsx
│   └── Navigation.tsx
├── hooks/
│   ├── useGrants.ts
│   ├── useKnowledgeBase.ts
│   └── useApplications.ts
└── lib/
    ├── api.ts
    ├── auth.ts
    └── constants.ts
```

### 3.2 Core Components

**GrantCard Component:**
```tsx
// frontend/components/GrantCard.tsx
import { Badge, Button } from '@/components/ui';
import { Heart, Info } from 'lucide-react';

interface GrantCardProps {
  grant: Grant;
  matchScore?: number;
  onViewDetails: (id: string) => void;
  onAddWatchlist: (id: string) => void;
  isWatchlisted?: boolean;
}

export function GrantCard({
  grant,
  matchScore,
  onViewDetails,
  onAddWatchlist,
  isWatchlisted,
}: GrantCardProps) {
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">{grant.name}</h3>
        {matchScore && (
          <Badge variant={matchScore > 80 ? 'success' : 'default'}>
            {matchScore}% match
          </Badge>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-3">
        {grant.provider} • ₹{grant.amount_min.toLocaleString()}-₹{grant.amount_max.toLocaleString()}
      </p>

      <p className="text-sm mb-3 line-clamp-2">{grant.description}</p>

      <div className="flex gap-2 mb-3">
        {grant.sectors.slice(0, 2).map(sector => (
          <Badge key={sector} variant="outline" className="text-xs">
            {sector}
          </Badge>
        ))}
      </div>

      <div className="flex justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails(grant.id)}
        >
          <Info className="w-4 h-4 mr-1" />
          Details
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddWatchlist(grant.id)}
        >
          <Heart
            className={`w-4 h-4 ${isWatchlisted ? 'fill-red-500 text-red-500' : ''}`}
          />
        </Button>
      </div>

      {grant.application_window_close && (
        <p className="text-xs text-red-600 mt-2">
          Deadline: {new Date(grant.application_window_close).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
```

**KBUploader Component:**
```tsx
// frontend/components/KBUploader.tsx
'use client';

import { useState } from 'react';
import { Upload, File, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';

export function KBUploader({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleUpload = async () => {
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/kb/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: 100,
          }));
        }
      }
      onUploadComplete();
    } finally {
      setUploading(false);
      setFiles([]);
    }
  };

  return (
    <div className="border-2 border-dashed rounded-lg p-8">
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="text-center"
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="font-semibold mb-1">Drag and drop files</p>
        <p className="text-sm text-gray-600 mb-4">
          or click to select. Supports PDF, DOCX, TXT, CSV
        </p>

        <div className="space-y-2 mt-4 max-h-64 overflow-y-auto">
          {files.map(file => (
            <div key={file.name} className="flex items-center justify-between bg-gray-50 p-2 rounded">
              <div className="flex items-center gap-2">
                <File className="w-4 h-4" />
                <span className="text-sm">{file.name}</span>
              </div>
              <button onClick={() => setFiles(f => f.filter(x => x.name !== file.name))}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {files.length > 0 && (
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-4 w-full"
          >
            {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {uploading ? 'Uploading...' : `Upload ${files.length} file(s)`}
          </Button>
        )}
      </div>
    </div>
  );
}
```

### 3.3 Page Components

**Grants Page:**
```tsx
// frontend/app/(dashboard)/grants/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GrantCard, GrantFilter } from '@/components/';
import { useApi } from '@/hooks';

export default function GrantsPage() {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const api = useApi();

  const { data, isLoading } = useQuery({
    queryKey: ['grants', filters, page],
    queryFn: () => api.get('/grants', { params: { ...filters, page } }),
  });

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Discover Grants</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <GrantFilter onChange={setFilters} />
        </div>

        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.grants.map(grant => (
              <GrantCard
                key={grant.id}
                grant={grant}
                onViewDetails={() => router.push(`/grants/${grant.id}`)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Scraper Service

### 4.1 Crawl4AI Integration

**Installation & Setup:**
```bash
pip install crawl4ai
playwright install
```

**Main Crawler Service:**
```python
# scraper/services/crawl_service.py
import asyncio
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
from crawl4ai.content_filter_engine import PruningContentFilter
from typing import List, Dict

class GrantCrawler:
    def __init__(self):
        self.crawler = None
        self.browser_config = BrowserConfig(
            headless=True,
            verbose=True,
            ignore_ssl_errors=True,
        )

    async def crawl_grant_pages(self, urls: List[str]) -> List[Dict]:
        """Crawl multiple grant pages concurrently"""
        async with AsyncWebCrawler(config=self.browser_config) as crawler:
            tasks = [
                crawler.arun(
                    url,
                    config=CrawlerRunConfig(
                        markdown_generator=DefaultMarkdownGenerator(),
                        content_filter=PruningContentFilter(),
                        cache_mode="bypass",
                    ),
                ) for url in urls
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            return results

    async def extract_grant_form(self, grant_url: str) -> Dict:
        """Extract form structure from a grant page"""
        async with AsyncWebCrawler(config=self.browser_config) as crawler:
            result = await crawler.arun(
                grant_url,
                config=CrawlerRunConfig(
                    markdown_generator=DefaultMarkdownGenerator(),
                ),
            )
            
            # Pass markdown to LLM for structure extraction
            return await extract_form_structure(result.markdown)
```

**Form Parser:**
```python
# scraper/services/form_parser.py
import anthropic
import json
from typing import Dict, List

async def extract_form_structure(markdown_content: str) -> Dict:
    """Use Claude to parse form structure from markdown"""
    client = anthropic.Anthropic()
    
    prompt = f"""
    Analyze this grant application form and extract:
    1. Form fields (name, email, phone, etc.)
    2. Questions (and their max length if specified)
    3. Document requirements
    4. Eligibility criteria
    
    Return as JSON with keys: fields, questions, documents, eligibility
    
    Form Content:
    {markdown_content[:3000]}
    """
    
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )
    
    try:
        return json.loads(message.content[0].text)
    except json.JSONDecodeError:
        return {"questions": [], "error": "Could not parse"}
```

**Grant Data Extractor:**
```python
# scraper/services/extractor.py
import anthropic
import json
from typing import Dict

async def extract_grant_info(url: str, content: str) -> Dict:
    """Extract structured grant information"""
    client = anthropic.Anthropic()
    
    prompt = f"""
    Extract the following information from this grant application page:
    - Grant name
    - Provider (government/CSR/incubator)
    - Grant amount (min/max in INR)
    - Sectors/industries eligible
    - Incorporation requirements
    - Age limits
    - Revenue caps
    - Application window (open and close dates)
    - Required documents
    - Contact information (email, phone, website)
    - Key eligibility criteria
    
    Return as JSON. If not found, omit the field.
    
    Content:
    {content[:4000]}
    """
    
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}]
    )
    
    try:
        data = json.loads(message.content[0].text)
        data['source_url'] = url
        return data
    except json.JSONDecodeError:
        return {"error": "Parsing failed"}
```

**FastAPI Service:**
```python
# scraper/main.py
from fastapi import FastAPI, BackgroundTasks
import asyncio
from services.crawl_service import GrantCrawler
from services.extractor import extract_grant_info

app = FastAPI()
crawler = GrantCrawler()

@app.post("/scrape/grants")
async def scrape_grants(urls: list[str], background_tasks: BackgroundTasks):
    """Async scrape multiple grant pages"""
    def scrape_task():
        results = asyncio.run(crawler.crawl_grant_pages(urls))
        # Process and save to DB
    
    background_tasks.add_task(scrape_task)
    return {"status": "scraping", "count": len(urls)}

@app.post("/parse/form")
async def parse_form(url: str):
    """Parse grant form structure"""
    form_structure = await crawler.extract_grant_form(url)
    return form_structure
```

---

## 5. Database Migration & Seeding

### 5.1 TypeORM Migrations

```typescript
// backend/src/database/migrations/1705449600000-CreateTables.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTables1705449600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create grants table
    await queryRunner.createTable(
      new Table({
        name: 'grants',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', length: 255 },
          { name: 'provider', type: 'varchar', length: 100 },
          { name: 'amount_min', type: 'bigint' },
          { name: 'amount_max', type: 'bigint' },
          { name: 'sectors', type: 'jsonb' },
          { name: 'eligibility', type: 'jsonb' },
          { name: 'application_window_open', type: 'date' },
          { name: 'application_window_close', type: 'date' },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
    );

    // Create KB tables
    await queryRunner.createTable(
      new Table({
        name: 'kb_documents',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'startup_id', type: 'uuid' },
          { name: 'file_name', type: 'varchar', length: 255 },
          { name: 'file_type', type: 'varchar', length: 50 },
          { name: 's3_url', type: 'varchar' },
          { name: 'is_processed', type: 'boolean', default: false },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
      }),
    );

    // Create vector table
    await queryRunner.query(`
      CREATE TABLE kb_chunks (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        startup_id uuid NOT NULL,
        document_id uuid REFERENCES kb_documents(id),
        chunk_text text NOT NULL,
        embedding vector(1536),
        metadata jsonb,
        created_at TIMESTAMP DEFAULT now()
      );
      
      CREATE INDEX ON kb_chunks USING ivfflat (embedding vector_cosine_ops);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('grants');
    await queryRunner.dropTable('kb_chunks');
    await queryRunner.dropTable('kb_documents');
  }
}
```

### 5.2 Initial Data Seed

```typescript
// backend/src/database/seeds/InitialGrants.ts
import { Grant } from '../entities/Grant';

export const INITIAL_GRANTS = [
  {
    name: 'NIDHI Seed Support Program (NIDHI-SSP)',
    provider: 'Government of India - DST',
    amount_min: 1000000,
    amount_max: 10000000,
    sectors: ['Technology', 'Healthcare', 'Agriculture', 'Education'],
    eligibility: {
      incorporation_status: ['idea', 'pvt_ltd', 'llp'],
      age_limit_years: 5,
      revenue_cap: null,
    },
    application_window_open: '2025-03-01',
    application_window_close: '2025-05-31',
    description: 'Financial assistance for startups through incubators for MVP development',
  },
  // ... more grants
];

export async function seedInitialGrants(dataSource) {
  const grantRepository = dataSource.getRepository(Grant);
  
  for (const grantData of INITIAL_GRANTS) {
    const exists = await grantRepository.findOne({
      where: { name: grantData.name },
    });
    
    if (!exists) {
      await grantRepository.save(grantData);
    }
  }
}
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

```typescript
// backend/src/modules/kb/kb.service.spec.ts
import { Test } from '@nestjs/testing';
import { KBService } from './kb.service';

describe('KBService', () => {
  let service: KBService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [KBService, /* mocks */],
    }).compile();

    service = module.get<KBService>(KBService);
  });

  it('should generate embeddings correctly', async () => {
    const query = 'What is our company mission?';
    const results = await service.queryKnowledgeBase('startup-1', query, 5);
    
    expect(results).toHaveLength(5);
    expect(results[0].score).toBeGreaterThan(0.7);
  });
});
```

### 6.2 Integration Tests

```typescript
// backend/src/modules/applications/applications.controller.spec.ts
import { Test } from '@nestjs/testing';
import request from 'supertest';

describe('Applications E2E', () => {
  let app;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      // ...
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should generate answers for grant questions', async () => {
    const response = await request(app.getHttpServer())
      .post('/applications/generate-answer')
      .send({
        grantId: 'grant-1',
        question: 'Describe your product',
      })
      .expect(200);

    expect(response.body).toHaveProperty('answer');
    expect(response.body.answer.length).toBeGreaterThan(50);
  });
});
```

---

## 7. Deployment & DevOps

### 7.1 Docker Configuration

**Frontend Dockerfile:**
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --production
EXPOSE 3000
CMD ["npm", "start"]
```

**Backend Dockerfile:**
```dockerfile
# backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

### 7.2 GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:e2e

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: vercel/action@v4
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

---

## 8. Performance Optimization

### 8.1 Caching Strategy

```typescript
// Redis caching layer
export class CacheService {
  constructor(private redis: Redis) {}

  async getGrants(filters: GrantFilters): Promise<Grant[]> {
    const cacheKey = `grants:${JSON.stringify(filters)}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) return JSON.parse(cached);
    
    const grants = await this.db.query(...);
    await this.redis.setex(cacheKey, 3600, JSON.stringify(grants));
    
    return grants;
  }
}
```

### 8.2 API Response Optimization

- Implement pagination (default 20 per page)
- Use field projection (only fetch needed columns)
- Add query result compression
- Implement CDN for static assets

---

## 9. Launch Checklist

- [ ] All unit tests passing (>80% coverage)
- [ ] All E2E tests passing
- [ ] Load testing (1000 concurrent users)
- [ ] Security audit (OWASP top 10)
- [ ] Performance audit (Lighthouse >90)
- [ ] Database backup strategy
- [ ] Monitoring & alerting setup
- [ ] Documentation complete
- [ ] Privacy policy & Terms of Service
- [ ] Beta user onboarding flow
- [ ] Analytics integration (PostHog/Mixpanel)

