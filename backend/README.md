# Resume Right

Backend API for resume optimization - parse resumes, analyze job descriptions, and generate tailored resumes using AI.

## Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Fastify (fast, low-overhead web framework)
- **Database**: SQLite (better-sqlite3)
- **PDF/DOCX Parsing**: pdf-parse, mammoth
- **Web Scraping**: Puppeteer
- **AI**: OpenAI API (for resume rewriting)

## Architecture

```
User
 └── uploads resume (PDF/DOCX)
 └── provides job description OR job URL
        ↓
Backend API
 ├── Parse resume → structured JSON
 ├── Fetch job page → clean text
 ├── Extract skills & requirements
 ├── Compare resume vs job
 ├── Generate suggestions
 ├── Rewrite resume (AI)
 └── Return Markdown / PDF
```

## Project Structure

```
src/
├── server.ts              # Fastify app setup and startup
├── db/
│   └── init.ts           # SQLite database initialization
├── routes/
│   ├── resume.ts         # Resume upload and parsing endpoints
│   └── job.ts            # Job description submission endpoints
└── services/
    ├── resumeParser.ts   # PDF/DOCX parsing logic
    ├── jobScraper.ts     # Puppeteer-based job scraping
    └── skillExtractor.ts # Rule-based skill extraction
```

## Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Configure environment**:

   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```

3. **Run development server**:

   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

### Health Check

```
GET /health
```

### Resume Upload

```
POST /api/resume/upload
Content-Type: multipart/form-data

Body: file (PDF or DOCX)
```

### Get Resume

```
GET /api/resume/:id
```

### Submit Job Description

```
POST /api/job/submit
Content-Type: application/json

Body: {
  "jobUrl": "https://example.com/job-posting",  // OR
  "jobText": "Job description text..."
}
```

### Get Job Description

```
GET /api/job/:id
```

### Compare Resume to Job

```
POST /api/analyze/compare
Content-Type: application/json

Body: {
  "resumeId": 1,
  "jobId": 1
}

Returns: Match %, missing skills, suggestions, strengths, weaknesses
```

### Rewrite Resume with AI

```
POST /api/analyze/rewrite
Content-Type: application/json

Body: {
  "analysisId": 1
}

Returns: AI-optimized resume in Markdown
```

### Full Analysis (Compare + Rewrite)

```
POST /api/analyze/full
Content-Type: application/json

Body: {
  "resumeId": 1,
  "jobId": 1,
  "rewrite": true  // optional, default true
}

Returns: Complete analysis with rewritten resume
```

### Get Analysis Result

```
GET /api/analyze/:id
```

## Database Schema

**resumes**

- id, filename, original_path, parsed_data (JSON), created_at

**job_descriptions**

- id, source_url, raw_text, extracted_skills (JSON), requirements (JSON), created_at

**analysis_results**

- id, resume_id, job_id, comparison_data (JSON), suggestions (JSON), rewritten_resume, created_at

## Development Notes

- **No vector DB**: Using simple text matching and rule-based extraction
- **Single LLM call**: Gemini called once per rewrite request
- **Local SQLite**: Data stored in `./data/resume-right.db`
- **File storage**: Uploaded resumes in `./uploads/`
- **Type-safe**: Full TypeScript with strict mode

## What's Next

- [x] Implement resume vs job comparison logic
- [x] Add Gemini integration for resume rewriting
- [x] Create analysis endpoint combining all steps
- [ ] Add markdown/PDF output generation
- [ ] Implement authentication
- [ ] Deploy to free hosting (Render/Railway + Cloudflare R2)
