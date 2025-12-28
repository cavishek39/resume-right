# Copilot Instructions

## Project Overview

**Resume Right** - Resume optimization API that parses resumes, analyzes job descriptions, and generates tailored resumes.

**Stack**: Node.js + TypeScript, Fastify, SQLite, Puppeteer, Google Gemini API

## Architecture

```
User → Upload Resume (PDF/DOCX) + Job Description/URL
     ↓
API: Parse → Extract → Compare → Generate AI suggestions → Rewrite
     ↓
Return: Optimized resume (Markdown/PDF)
```

**Key Principle**: Keep it simple - no vector DB, single LLM call per request, rule-based extraction where possible.

## Project Structure

- [src/server.ts](../src/server.ts) - Fastify app setup, plugin registration, route mounting
- [src/db/init.ts](../src/db/init.ts) - SQLite initialization with better-sqlite3, schema creation
- [src/routes/resume.ts](../src/routes/resume.ts) - Resume upload/parsing endpoints
- [src/routes/job.ts](../src/routes/job.ts) - Job description submission (text or URL)
- [src/services/resumeParser.ts](../src/services/resumeParser.ts) - PDF/DOCX parsing (pdf-parse, mammoth)
- [src/services/jobScraper.ts](../src/services/jobScraper.ts) - Puppeteer-based job page scraping
- [src/services/skillExtractor.ts](../src/services/skillExtractor.ts) - Rule-based skill/requirement extraction

## Development Workflow

**Start dev server**:

```bash
npm run dev  # Uses tsx watch for hot-reload
```

**Build**:

```bash
npm run build  # TypeScript compilation to dist/
npm start      # Run compiled code
```

**Database**: Auto-created at `./data/resume-right.db` on first run  
**Uploads**: Stored in `./uploads/` directory

## Key Patterns & Conventions

### TypeScript

- Strict mode enabled in [tsconfig.json](../tsconfig.json)
- ES Modules syntax (import/export)
- Explicit types for function parameters and returns
- Interface definitions for request bodies and service responses

### Fastify Route Structure

```typescript
import { FastifyInstance } from 'fastify'

async function routeName(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: BodyType }>('/path', async (request, reply) => {
    // Handler logic
  })
}

export default routeName
```

### Database Access

- Use synchronous `better-sqlite3` API (not async)
- Prepare statements for queries: `db.prepare(sql).run(params)`
- Store JSON as stringified TEXT columns

### Error Handling

- Catch errors in route handlers
- Log with `fastify.log.error(error)`
- Return standardized error responses: `reply.code(500).send({ error: message })`
- Type errors as `Error` in catch blocks: `(error as Error).message`

### File Uploads

- Use `@fastify/multipart` plugin (already registered)
- Access file via `await request.file()`
- Validate MIME types before processing
- Save with timestamp prefix: `${Date.now()}-${filename}`

### Services

- Export named functions from service files
- Keep services pure/stateless where possible
- Use rule-based extraction before reaching for LLM
- Document function purpose and approach in comments

## Environment Variables

See [.env.example](../.env.example):

- `PORT`, `HOST` - Server config
- `GEMINI_API_KEY` - For AI resume rewriting (not yet implemented)
- `MAX_FILE_SIZE` - Upload limit (default 10MB)
- `DATABASE_PATH`, `STORAGE_PATH` - File locations

## What NOT to Do

- ❌ Don't use vector databases or embeddings early - keep it simple
- ❌ Don't let LLM parse PDFs - use specialized libraries (pdf-parse, mammoth)
- ❌ Don't make multiple LLM calls per request - batch operations into one prompt
- ❌ Don't over-engineer deployment - target free tiers (Render, Railway, Fly.io)

## Next Steps (In Order)

1. ✅ Basic resume parsing and job scraping (DONE)
2. Implement resume vs job comparison service
3. Add Gemini integration for resume rewriting
4. Create unified analysis endpoint (`/api/analyze`)
5. Add markdown → PDF generation
6. Implement simple authentication
7. Deploy to free hosting + object storage

## Testing

When testing endpoints:

- Use Postman, curl, or VS Code REST Client
- Test with real PDF/DOCX samples
- Validate job scraping with various career sites (LinkedIn, Indeed, company sites)

## Free Deployment Strategy

- **Backend**: Render.com free tier or Railway ($5 credit)
- **Database**: SQLite file in persistent volume
- **Storage**: Cloudflare R2 (10GB free) or Supabase Storage
- **Environment**: Set all vars in platform dashboard

## Updates to This File

When adding features:

1. Update relevant sections above with new patterns
2. Add file references for new routes/services
3. Document any non-obvious design decisions
4. Update "Next Steps" checklist
