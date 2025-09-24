-- Ensure pgcrypto is available for bcrypt hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Set password for admin user using bcrypt (bf)
UPDATE admin_users 
SET password_hash = crypt('Diemann2011', gen_salt('bf'))
WHERE username = 'martina.diemann@verlagshaus.de';