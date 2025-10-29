-- Fix verify_password to use extensions.crypt and proper search_path
CREATE OR REPLACE FUNCTION public.verify_password(input_password text, stored_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
BEGIN
  -- Compare using pgcrypto's crypt from the extensions schema
  RETURN stored_hash = extensions.crypt(input_password, stored_hash);
EXCEPTION
  WHEN OTHERS THEN
    -- On any error (e.g., malformed hash), return false to avoid leaking info
    RETURN false;
END;
$function$;