import { Request, Response } from 'express'
import { syncUser } from '../lib/sync'
import supabase from '../lib/supabase'

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId } = req.body

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId in request body' })
  }

  const { data: tokenRow, error } = await supabase
    .from('gmail_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !tokenRow) {
    return res.status(404).json({ error: 'Gmail token not found for user' })
  }

  try {
    await syncUser(tokenRow)
    return res.status(200).json({ message: 'Inbox sync complete' })
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to sync inbox' })
  }
}
