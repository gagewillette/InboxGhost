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
import { fetchEmails, fetchEmailThreads, triggerEmailSync } from '../lib/emails'

export interface EmailContextType {
  emails: Email[]
  threads: EmailThread[]
  loading: boolean
  error: string | null
  session: Session | null
  refresh: () => Promise<void>
}

const EmailContext = createContext<EmailContextType | undefined>(undefined)

export const EmailProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [emails, setEmails] = useState<Email[]>([])
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchData = useCallback(async () => {
    if (!session?.user) return

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
        await fetchData()
      } catch (err) {
        console.error('Auto-sync failed:', err)
      }
    }

    autoSync()
  }, [session, fetchData])

  const contextValue = useMemo(
    () => ({ emails, threads, loading, error, session, refresh: fetchData }),
    [emails, threads, loading, error, session, fetchData]
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
