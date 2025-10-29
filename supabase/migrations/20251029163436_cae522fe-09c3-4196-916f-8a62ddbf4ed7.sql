-- Restrict direct access to simple_api_keys table
-- Only the service role (used by manage-api-keys edge function) can access it
DROP POLICY IF EXISTS "Allow access to simple_api_keys" ON public.simple_api_keys;

-- Create a policy that denies all direct access
-- The edge function will use service_role_key to bypass RLS
CREATE POLICY "Deny direct access to simple_api_keys"
ON public.simple_api_keys
FOR ALL
USING (false);