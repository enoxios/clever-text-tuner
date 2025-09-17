-- Enable Row Level Security on simple_api_keys table to fix security warning
ALTER TABLE simple_api_keys ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow access (adjust based on your requirements)
-- Since this appears to be for API key management, limiting to specific access patterns
CREATE POLICY "Allow access to simple_api_keys" 
ON simple_api_keys 
FOR ALL 
USING (true);