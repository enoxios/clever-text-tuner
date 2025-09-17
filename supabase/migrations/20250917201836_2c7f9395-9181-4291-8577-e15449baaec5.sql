-- Correct bcrypt hash for password "admin123" 
-- Generated with bcrypt.hashSync('admin123', 10)
UPDATE admin_users 
SET password_hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE username = 'admin';