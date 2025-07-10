'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { useSession } from '@supabase/auth-helpers-react'
import type { Email, EmailThread } from '../../../types'

interface EmailContextType {
  emails: Email[]
  threads: EmailThread[]
  loading: boolean
  error: string | null
  refresh: () => void
}

const EmailContext = createContext<EmailContextType | undefined>(undefined)

export const EmailProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const session = useSession()
  const [emails, setEmails] = useState<Email[]>([])
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!session?.user) return
    setLoading(true)
    setError(null)
    try {
      const { data: emailData, error: emailError } = await supabase
        .from('emails')
        .select('*')
        .eq('user_id', session.user.id)

      const { data: threadData, error: threadError } = await supabase
        .from('email_threads')
        .select('*')
        .eq('user_id', session.user.id)

      if (emailError || threadError) {
        setError(emailError?.message || threadError?.message || 'Failed to fetch emails')
      } else {
        setEmails(emailData ?? [])
        setThreads(threadData ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [session?.user])

  useEffect(() => {
    if (session?.user) {
      fetchData()
    }
  }, [session?.user, fetchData])

  const contextValue = useMemo(
    () => ({ emails, threads, loading, error, refresh: fetchData }),
    [emails, threads, loading, error, fetchData]
  )

  return <EmailContext.Provider value={contextValue}>{children}</EmailContext.Provider>
}

export const useEmails = (): EmailContextType => {
  const ctx = useContext(EmailContext)
  if (!ctx) throw new Error('useEmails must be used within EmailProvider')
  return ctx
}
