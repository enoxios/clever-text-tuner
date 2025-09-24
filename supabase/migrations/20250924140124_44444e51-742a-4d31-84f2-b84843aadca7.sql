-- Remove invalid entry first
DELETE FROM admin_users WHERE username = 'martina.diemann@verlagshaus.de';

-- Add correct admin user with proper bcrypt hash for password "Diemann2011"
-- Using bcrypt with cost factor 10
INSERT INTO admin_users (username, password_hash) 
VALUES ('martina.diemann@verlagshaus.de', '$2b$10$N7LwbwqTjWJqeGYD8kWzQOLSRHCjqmYJE5L3BwdLhQqGOzJqZKLLa');