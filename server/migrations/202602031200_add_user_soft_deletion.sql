-- Add soft deletion support for users
-- Add is_active column to profiles table, defaulting to true

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Create index for active users
CREATE INDEX IF NOT EXISTS profiles_is_active_idx ON public.profiles(is_active);

-- Update existing profiles to be active (in case any are null, but default should handle it)
UPDATE public.profiles SET is_active = true WHERE is_active IS NULL;