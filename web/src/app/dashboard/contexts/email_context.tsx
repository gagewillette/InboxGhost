'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../../supabase'
import type { Email, EmailThread } from '../../types'
import { fetchEmails, fetchEmailThreads, triggerEmailSync, refreshGmailToken } from '../lib/emails'
import { buildGmailAuthUrl } from '../lib/gmail'

const CACHE_TTL_MS = 10 * 60 * 1000

function cacheKey(userId: string) { return `ig_email_cache_${userId}` }

function readCache(userId: string): { emails: Email[]; threads: EmailThread[] } | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    if (!raw) return null
    const { emails, threads, cachedAt } = JSON.parse(raw)
    if (Date.now() - cachedAt > CACHE_TTL_MS) return null
    return { emails, threads }
  } catch { return null }
}

function writeCache(userId: string, emails: Email[], threads: EmailThread[]) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify({ emails, threads, cachedAt: Date.now() }))
  } catch {} // storage full or private browsing
}

function dropCache(userId: string) {
  try { localStorage.removeItem(cacheKey(userId)) } catch {}
}

export interface EmailContextType {
  emails: Email[]
  threads: EmailThread[]
  loading: boolean
  error: string | null
  session: Session | null
  refresh: () => Promise<void>
  clearCache: () => void
  syncResetCount: number
  bumpSyncReset: () => void
}

const EmailContext = createContext<EmailContextType | undefined>(undefined)

export const EmailProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [emails, setEmails] = useState<Email[]>([])
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncResetCount, setSyncResetCount] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'SIGNED_IN' && s?.access_token && s.user) {
        refreshGmailToken(s.access_token).then((result) => {
          if (result?.reason === 'needs_reauth') {
            window.location.href = buildGmailAuthUrl(s.user!.id)
          }
        }).catch(console.error)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchData = useCallback(async () => {
    if (!session?.user) return

    const cached = readCache(session.user.id)
    if (cached) {
      setEmails(cached.emails)
      setThreads(cached.threads)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [emailData, threadData] = await Promise.all([
        fetchEmails(session.user.id),
        fetchEmailThreads(session.user.id),
      ])

      threadData.sort((a: EmailThread, b: EmailThread) =>
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      )

      writeCache(session.user.id, emailData, threadData)
      setEmails(emailData)
      setThreads(threadData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (!session?.user) return

    // Load from DB immediately so the UI isn't blocked on the sync.
    fetchData()

    // Then check if a background sync is needed (stale > 2 hours).
    const autoSync = async () => {
      const TWO_HOURS_MS = 2 * 60 * 60 * 1000

      const { data: tokenRow } = await supabase
        .from('gmail_tokens')
        .select('last_synced_at')
        .eq('user_id', session.user.id)
        .single()

      if (!tokenRow) return

      const lastSynced = tokenRow.last_synced_at
        ? new Date(tokenRow.last_synced_at).getTime()
        : 0

      if (Date.now() - lastSynced <= TWO_HOURS_MS) return

      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s?.access_token) return

      try {
        await triggerEmailSync(s.access_token, 0)
        dropCache(session.user.id)
        await fetchData()
      } catch (err) {
        console.error('Auto-sync failed:', err)
      }
    }

    autoSync()
  }, [session, fetchData])

  const refresh = useCallback(async () => {
    if (session?.user) dropCache(session.user.id)
    await fetchData()
  }, [session, fetchData])

  const clearCache = useCallback(() => {
    if (session?.user) dropCache(session.user.id)
  }, [session])

  const bumpSyncReset = useCallback(() => setSyncResetCount((n) => n + 1), [])

  const contextValue = useMemo(
    () => ({ emails, threads, loading, error, session, refresh, clearCache, syncResetCount, bumpSyncReset }),
    [emails, threads, loading, error, session, refresh, clearCache, syncResetCount, bumpSyncReset]
  )

  return (
    <EmailContext.Provider value={contextValue}>
      {children}
    </EmailContext.Provider>
  )
}

export const useEmails = (): EmailContextType => {
  const ctx = useContext(EmailContext)
  if (!ctx) throw new Error('useEmails must be used within EmailProvider')
  return ctx
}
