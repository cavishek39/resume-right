import crypto from 'crypto'
import db from '../db/init'

export interface UserRecord {
  id: number
  token: string
  display_name: string | null
  created_at: string
}

export function createOneClickUser(displayName?: string): {
  userId: number
  token: string
} {
  const token = crypto.randomUUID()
  const stmt = db.prepare(
    'INSERT INTO users (token, display_name) VALUES (?, ?)' as const
  )
  const result = stmt.run(token, displayName || null)

  return { userId: Number(result.lastInsertRowid), token }
}

export function getUserByToken(token: string): UserRecord | null {
  const stmt = db.prepare('SELECT * FROM users WHERE token = ?' as const)
  const user = stmt.get(token) as UserRecord | undefined
  return user || null
}
