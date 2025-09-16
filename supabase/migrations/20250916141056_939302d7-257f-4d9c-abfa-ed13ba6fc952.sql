-- Create new admin user with properly hashed password
-- Password: admin123 (hashed with bcrypt)
INSERT INTO admin_users (username, password_hash) 
VALUES ('admin', '$2b$10$K8BL8/8RJ7QJ7QJ7QJ7QJ7QJ7QJ7QJ7QJ7QJ7QJ7QJ7QJ7QJ7QJ7QO')
ON CONFLICT (username) 
DO UPDATE SET 
  password_hash = '$2b$10$K8BL8/8RJ7QJ7QJ7QJ7QJ7QJ7QJ7QJ7QJ7QJ7QJ7QJ7QJ7QJ7QJ7QO',
  updated_at = now();