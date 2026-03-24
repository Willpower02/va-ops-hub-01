
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS whop_membership_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '7 days'),
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;
