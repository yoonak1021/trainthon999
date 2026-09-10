/**
 * Local researcher accounts for demo mode (no Supabase).
 * Each researcher gets an isolated workspace key; passwords are salted SHA-256.
 * Production isolation uses Supabase Auth + RLS instead.
 */

const ACCOUNTS_KEY = 'wave-researchers-v1'
const SESSION_KEY = 'wave-researcher-session-v1'

export type LocalResearcher = {
  id: string
  email: string
  name: string
  schoolId: string
  schoolName: string
  created_at: string
}

type StoredAccount = LocalResearcher & {
  password_salt: string
  password_hash: string
}

export type LocalSession = {
  id: string
  email: string
  name: string
  schoolId: string
  schoolName: string
}

function loadAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredAccount[]
    return parsed.map((account) => ({
      ...account,
      name: account.name ?? '',
      schoolId: account.schoolId ?? '',
      schoolName: account.schoolName ?? '',
    }))
  } catch {
    return []
  }
}

function saveAccounts(accounts: StoredAccount[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function getLocalSession(): LocalSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LocalSession
    if (!parsed?.id || !parsed?.email) return null
    return {
      id: parsed.id,
      email: parsed.email,
      name: parsed.name ?? '',
      schoolId: parsed.schoolId ?? '',
      schoolName: parsed.schoolName ?? '',
    }
  } catch {
    return null
  }
}

let supabaseOwnerId: string | null = null

/** Used when Supabase Auth is active so local caches can key by user id. */
export function setSupabaseOwnerId(id: string | null): void {
  supabaseOwnerId = id
}

export function getActiveResearcherId(): string | null {
  return getLocalSession()?.id ?? supabaseOwnerId
}

export function setLocalSession(session: LocalSession | null): void {
  if (!session) {
    localStorage.removeItem(SESSION_KEY)
    return
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export type ResearcherProfile = {
  name: string
  schoolId: string
  schoolName: string
}

export async function signUpLocal(
  email: string,
  password: string,
  profile: ResearcherProfile,
): Promise<LocalSession> {
  const normalized = normalizeEmail(email)
  const name = profile.name.trim()
  if (!normalized || !normalized.includes('@')) {
    throw new Error('Enter a valid email address.')
  }
  if (!name) {
    throw new Error('Enter your name.')
  }
  if (!profile.schoolName.trim()) {
    throw new Error('Select your school.')
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }
  const accounts = loadAccounts()
  if (accounts.some((a) => a.email === normalized)) {
    throw new Error('An account with this email already exists.')
  }
  const salt = crypto.randomUUID()
  const account: StoredAccount = {
    id: crypto.randomUUID(),
    email: normalized,
    name,
    schoolId: profile.schoolId,
    schoolName: profile.schoolName.trim(),
    password_salt: salt,
    password_hash: await hashPassword(password, salt),
    created_at: new Date().toISOString(),
  }
  accounts.push(account)
  saveAccounts(accounts)
  const session: LocalSession = {
    id: account.id,
    email: account.email,
    name: account.name,
    schoolId: account.schoolId,
    schoolName: account.schoolName,
  }
  setLocalSession(session)
  return session
}

export async function signInLocal(email: string, password: string): Promise<LocalSession> {
  const normalized = normalizeEmail(email)
  const account = loadAccounts().find((a) => a.email === normalized)
  if (!account) {
    throw new Error('Email or password is incorrect.')
  }
  const hash = await hashPassword(password, account.password_salt)
  if (hash !== account.password_hash) {
    throw new Error('Email or password is incorrect.')
  }
  const session: LocalSession = {
    id: account.id,
    email: account.email,
    name: account.name ?? '',
    schoolId: account.schoolId ?? '',
    schoolName: account.schoolName ?? '',
  }
  setLocalSession(session)
  return session
}

export function signOutLocal(): void {
  setLocalSession(null)
}

export function listLocalResearcherIds(): string[] {
  return loadAccounts().map((a) => a.id)
}
