import { Request, Response } from 'express'
import { syncUser } from '..'
import supabase from '../lib/supabase'

export default async function syncHandler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { user_id } = req.body

  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id in request body' })
  }

  const { data: tokenRow, error } = await supabase
    .from('gmail_tokens')
    .select('*')
    .eq('user_id', user_id)
    .single()

  if (error || !tokenRow) {
    return res.status(404).json({ error: 'Gmail token not found for user' })
  }

  try {
    console.log("attempting to sync for user: ", user_id);

    await syncUser(tokenRow)

    return res.status(200).json({ message: 'Inbox sync complete' })
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to sync inbox' })
  }
}


