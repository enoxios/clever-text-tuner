-- Reset admin password for user gnb.lektor using bcrypt via pgcrypto
-- Ensures the stored hash matches Postgres crypt verification
UPDATE public.admin_users
SET password_hash = crypt('GNB-ki-lektor2025!', gen_salt('bf', 10)),
    updated_at = now()
WHERE username = 'gnb.lektor';