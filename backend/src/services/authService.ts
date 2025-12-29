import crypto from 'crypto'
import { verifyToken } from '@clerk/backend'
import db from '../db/init'

export interface UserRecord {
  id: number
  token: string
  provider: string
  email: string | null
  external_id: string | null
  display_name: string | null
  created_at: string
}

const clerkSecret = process.env.CLERK_SECRET_KEY

const createSessionToken = (): string => crypto.randomUUID()

export function createOneClickUser(displayName?: string): {
  userId: number
  token: string
} {
  const token = createSessionToken()
  const stmt = db.prepare(
    'INSERT INTO users (token, provider, display_name) VALUES (?, ?, ?)' as const
  )
  const result = stmt.run(token, 'oneclick', displayName || null)

  return { userId: Number(result.lastInsertRowid), token }
}

export function getUserByToken(token: string): UserRecord | null {
  const stmt = db.prepare('SELECT * FROM users WHERE token = ?' as const)
  const user = stmt.get(token) as UserRecord | undefined
  return user || null
}

export function getUserByExternalId(externalId: string): UserRecord | null {
  const stmt = db.prepare('SELECT * FROM users WHERE external_id = ?' as const)
  const user = stmt.get(externalId) as UserRecord | undefined
  return user || null
}

export function getUserByEmail(email: string): UserRecord | null {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?' as const)
  const user = stmt.get(email) as UserRecord | undefined
  return user || null
}

export function getOrCreateExternalUser(params: {
  provider: string
  externalId: string
  email?: string | null
  displayName?: string | null
}): { userId: number } {
  const existing = getUserByExternalId(params.externalId)

  if (existing) {
    const updateStmt = db.prepare(
      `UPDATE users
       SET provider = ?, email = COALESCE(?, email), display_name = COALESCE(?, display_name), token = ?
       WHERE id = ?` as const
    )
    updateStmt.run(
      params.provider,
      params.email || null,
      params.displayName || null,
      params.externalId,
      existing.id
    )
    return { userId: existing.id }
  }

  const insertStmt = db.prepare(
    `INSERT INTO users (token, provider, email, external_id, display_name)
     VALUES (?, ?, ?, ?, ?)` as const
  )
  const result = insertStmt.run(
    params.externalId,
    params.provider,
    params.email || null,
    params.externalId,
    params.displayName || null
  )

  return { userId: Number(result.lastInsertRowid) }
}

export async function verifyClerkToken(
  token: string
): Promise<{ userId: number } | null> {
  if (!clerkSecret) {
    console.error('❌ CLERK_SECRET_KEY not configured')
    return null
  }

  try {
    // Clerk tokens need less strict verification options
    const verified = await verifyToken(token, {
      secretKey: clerkSecret,
    })

    const externalId = verified.sub
    const email = (verified as any).email as string | undefined
    const displayName = (verified as any).name as string | undefined

    if (!externalId) {
      console.error('❌ No subject found in Clerk token')
      return null
    }

    const { userId } = getOrCreateExternalUser({
      provider: 'clerk',
      externalId,
      email: email || null,
      displayName: displayName || email || null,
    })
    return { userId }
  } catch (error) {
    console.error('❌ Clerk token verification failed:')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', (error as Error).message)
    console.error('Full error:', error)
    return null
  }
}
