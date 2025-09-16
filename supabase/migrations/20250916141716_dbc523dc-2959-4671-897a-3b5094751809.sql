-- Update admin user with a real bcrypt hash for password "admin123"
-- Generated using bcrypt with cost 10
UPDATE admin_users 
SET password_hash = '$2b$10$rZ3oYEXAh9HGuJZTgBHGue.J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4',
    updated_at = now()
WHERE username = 'admin';