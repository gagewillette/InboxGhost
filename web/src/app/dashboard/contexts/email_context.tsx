'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { supabase } from '../../supabase'
import type { Email, EmailThread } from '../../types'
import { fetchEmails, fetchEmailThreads } from '../lib/emails'

export interface EmailContextType {
  emails: Email[]
  threads: EmailThread[]
  loading: boolean
  error: string | null
  refresh: () => void
}

const EmailContext = createContext<EmailContextType | undefined>(undefined)

export const EmailProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null)
  const [emails, setEmails] = useState<Email[]>([])
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ✅ Setup session on load
  useEffect(() => {
    const loadSession = async () => {
      // fetch session
      const { data } = await supabase.auth.getSession()
      setSession(data.session ?? null)

      // subscribe to auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
      })

      // unsub from auth changes on unmount
      return () => {
        subscription.unsubscribe()
      }
    }

    loadSession().then(() => {

      // check valid user
      if (session?.user) {
        console.log('user is valid, fetching data');
        fetchData();
      }
    });
  }, [])

  const fetchData = useCallback(async () => {
    if (!session?.user) return

    console.log("fetching data from user ", session.user);

    setLoading(true)
    setError(null)
    try {
      const emailData = await fetchEmails(session.user.id);
      const threadData = await fetchEmailThreads(session.user.id);

      // sort the emails by time, newest first
      threadData.sort((a: EmailThread, b: EmailThread) => {
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      })

      setEmails(emailData ?? [])
      setThreads(threadData ?? [])
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  const contextValue = useMemo(
    () => ({
      emails,
      threads,
      loading,
      error,
      refresh: fetchData,
    }),
    [emails, threads, loading, error, fetchData]
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
