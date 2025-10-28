-- Create user gnb.lektor with password GNB-ki-lektor2025!
INSERT INTO admin_users (username, password_hash)
VALUES ('gnb.lektor', crypt('GNB-ki-lektor2025!', gen_salt('bf')))
ON CONFLICT (username) DO UPDATE 
SET password_hash = crypt('GNB-ki-lektor2025!', gen_salt('bf'));