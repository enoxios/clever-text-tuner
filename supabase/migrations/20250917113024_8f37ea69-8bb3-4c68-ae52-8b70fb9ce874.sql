-- Create a properly hashed password for the admin user
-- First we need to update the admin password with a proper bcrypt hash for 'meinpasswort'
-- The hash was generated with bcrypt for the password 'meinpasswort' using salt rounds 10
UPDATE admin_users 
SET password_hash = '$2b$10$YQiiz4ArtwfxWPNZ5oLsce9DHp7rDTHVJgHJQn.Gr7hJhN4GFlw4G'
WHERE username = 'admin';