-- Create users table for user management
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  must_change_password BOOLEAN NOT NULL DEFAULT false
);

-- Create admin_users table for admin management
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own record" 
ON public.users 
FOR SELECT 
USING (auth.uid()::text = id::text);

CREATE POLICY "Admin users can view all users" 
ON public.users 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.admin_users 
  WHERE id::text = auth.uid()::text
));

CREATE POLICY "Admin users can insert new users" 
ON public.users 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.admin_users 
  WHERE id::text = auth.uid()::text
));

CREATE POLICY "Admin users can update users" 
ON public.users 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.admin_users 
  WHERE id::text = auth.uid()::text
));

-- Create policies for admin_users table
CREATE POLICY "Admin users can view admin records" 
ON public.admin_users 
FOR SELECT 
USING (auth.uid()::text = id::text);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default admin user (password: admin123)
INSERT INTO public.admin_users (username, password_hash) 
VALUES ('admin', '$2b$10$rOzJqKx.Vn8YJ0KX6K4aGOuFqXK1HNvjVYLX8xJwKjN5yGw7GYqKC');