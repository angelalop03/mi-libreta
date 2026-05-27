import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gcfzstkdiilsulqxmqwc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjZnpzdGtkaWlsc3VscXhtcXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTQ1MzYsImV4cCI6MjA5NTQ3MDUzNn0.Ni3I7XKmGZH6G-6Vum_aLpDOxFc7MgJC2vhimb71O6E'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)