-- Add new columns to profiles table for profile setup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthday date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id_no text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_regularization_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS training_starting_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_setup_completed boolean DEFAULT false;

-- Create holidays table
CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  name text,
  created_at timestamptz DEFAULT now()
);

-- Insert some sample holidays (you can add more)
INSERT INTO public.holidays (date, name) VALUES
  ('2026-01-01', 'New Year''s Day'),
  ('2026-12-25', 'Christmas Day')
ON CONFLICT (date) DO NOTHING;

-- Enable RLS on holidays
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Policy for holidays (readable by all authenticated users)
CREATE POLICY "Holidays are viewable by authenticated users" ON public.holidays
  FOR SELECT USING (auth.role() = 'authenticated');

-- Update the handle_new_user function to set profile_setup_completed to false
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, username, email, profile_setup_completed)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'username',
    NEW.email,
    FALSE
  );
  RETURN NEW;
END;
$$;