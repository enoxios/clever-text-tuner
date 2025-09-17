-- Korrektur: Update admin password hash für "admin123"
-- Generierter bcrypt-Hash für Passwort "admin123"
UPDATE admin_users 
SET password_hash = '$2b$10$xnLZUKhGp4.4F8RCjC1ZrO.6y5rOm8Q9p5oN8oHgC7Y8kZf6J7h4a'
WHERE username = 'admin';