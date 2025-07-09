import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zvhhoepsfpotpuaenrpp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2aGhvZXBzZnBvdHB1YWVucnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNzg2MjIsImV4cCI6MjA2NzY1NDYyMn0.ZcPybskFVIqag_KzDnQSyS9B-kl6ZbcQonOwPG24LiE'
export const supabase = createClient(supabaseUrl, supabaseKey)