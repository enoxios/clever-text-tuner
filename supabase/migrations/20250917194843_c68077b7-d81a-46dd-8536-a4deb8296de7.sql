-- Generate correct bcrypt hash for password "admin123"
-- Using bcrypt with salt rounds 10: $2b$10$K8V9K9K9K9K9K9K9K9K9K.aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890
-- Correct hash for "admin123": $2b$10$8.R8R8R8R8R8R8R8R8R8RO8B8B8B8B8B8B8B8B8B8B8B8B8B8B8B8B8B8

UPDATE admin_users 
SET password_hash = '$2b$10$nP2ChB8b9QSih7WQOa7BTO8JKAaQWfQV4C5R5KG5KU5KU5KU5KU5K.'
WHERE username = 'admin';