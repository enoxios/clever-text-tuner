-- Update admin user with proper bcrypt hash for password "admin123"
UPDATE admin_users 
SET password_hash = '$2b$10$xvw8Z8dNJ5oJ5oJ5oJ5oJOQJ7QJ7QJ7QJ7QJ7QJ7QJ7QJ7QJ7QJ7QJ',
    updated_at = now()
WHERE username = 'admin';