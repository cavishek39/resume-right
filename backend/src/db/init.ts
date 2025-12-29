import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbPath = process.env.DATABASE_PATH || './data/resume-right.db'
const dbDir = path.dirname(dbPath)

// Ensure directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const db = new Database(dbPath)

// Enable foreign keys
db.pragma('foreign_keys = ON')

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL DEFAULT 'oneclick',
    email TEXT,
    external_id TEXT,
    display_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS resumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    filename TEXT NOT NULL,
    original_path TEXT NOT NULL,
    parsed_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS job_descriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    source_url TEXT,
    job_title TEXT,
    company TEXT,
    raw_text TEXT NOT NULL,
    extracted_skills TEXT,
    requirements TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS analysis_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    resume_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    comparison_data TEXT NOT NULL,
    suggestions TEXT NOT NULL,
    match_percentage REAL,
    missing_skills_summary TEXT,
    missing_requirements_summary TEXT,
    rewritten_resume TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (resume_id) REFERENCES resumes(id),
    FOREIGN KEY (job_id) REFERENCES job_descriptions(id)
  );
`)

const ensureColumn = (
  tableName: string,
  columnName: string,
  definition: string
) => {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string
  }>

  const exists = columns.some((col) => col.name === columnName)
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`)
  }
}

ensureColumn('resumes', 'user_id', 'user_id INTEGER REFERENCES users(id)')
ensureColumn(
  'job_descriptions',
  'user_id',
  'user_id INTEGER REFERENCES users(id)'
)
ensureColumn('job_descriptions', 'job_title', 'job_title TEXT')
ensureColumn('job_descriptions', 'company', 'company TEXT')
ensureColumn(
  'analysis_results',
  'user_id',
  'user_id INTEGER REFERENCES users(id)'
)
ensureColumn('analysis_results', 'match_percentage', 'match_percentage REAL')
ensureColumn(
  'analysis_results',
  'missing_skills_summary',
  'missing_skills_summary TEXT'
)
ensureColumn(
  'analysis_results',
  'missing_requirements_summary',
  'missing_requirements_summary TEXT'
)
ensureColumn('users', 'provider', "provider TEXT NOT NULL DEFAULT 'oneclick'")
ensureColumn('users', 'email', 'email TEXT')
ensureColumn('users', 'external_id', 'external_id TEXT')

export default db
