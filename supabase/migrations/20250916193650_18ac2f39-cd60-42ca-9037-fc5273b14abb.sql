-- Create a simple table for API keys without foreign key constraints
-- First drop the existing table to recreate without constraints

-- Create a new simple table for API key storage
CREATE TABLE IF NOT EXISTS public.simple_api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_identifier text NOT NULL UNIQUE,
  openai_api_key text,
  claude_api_key text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Disable RLS for this simple table since we handle auth in the edge function
ALTER TABLE public.simple_api_keys DISABLE ROW LEVEL SECURITY;

-- Insert a default record for our simple auth
INSERT INTO public.simple_api_keys (user_identifier, openai_api_key, claude_api_key) 
VALUES ('simple-auth-user', null, null)
ON CONFLICT (user_identifier) DO NOTHING;