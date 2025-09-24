-- Create a function to verify password using crypt
CREATE OR REPLACE FUNCTION verify_password(input_password text, stored_hash text)
RETURNS boolean AS $$
BEGIN
  RETURN stored_hash = crypt(input_password, stored_hash);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;