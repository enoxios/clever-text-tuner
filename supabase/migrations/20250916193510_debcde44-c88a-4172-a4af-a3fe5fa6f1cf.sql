-- Disable RLS on user_api_keys table temporarily for simple auth
ALTER TABLE public.user_api_keys DISABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows access for our specific user
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

-- Allow all operations for the simple-auth-user
CREATE POLICY "Allow simple auth user access" 
ON public.user_api_keys 
FOR ALL 
USING (user_id = 'simple-auth-user'::uuid OR user_id::text = 'simple-auth-user');

-- Create the simple-auth-user if it doesn't exist
INSERT INTO public.user_api_keys (user_id, openai_api_key, claude_api_key) 
VALUES ('simple-auth-user'::uuid, null, null)
ON CONFLICT (user_id) DO NOTHING;