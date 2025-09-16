-- First, let's generate a fixed UUID for our simple auth user
-- We'll use a deterministic UUID based on the string 'simple-auth-user'

-- Drop the existing policy first
DROP POLICY IF EXISTS "Allow simple auth user access" ON public.user_api_keys;

-- Disable RLS temporarily to clean up
ALTER TABLE public.user_api_keys DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows access for a specific UUID we'll use
CREATE POLICY "Allow simple auth user access" 
ON public.user_api_keys 
FOR ALL 
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Insert or update the record for our simple auth user
INSERT INTO public.user_api_keys (user_id, openai_api_key, claude_api_key) 
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, null, null)
ON CONFLICT (user_id) DO NOTHING;