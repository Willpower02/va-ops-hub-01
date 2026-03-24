import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export interface OrgSubscription {
  plan: string;
  subscription_status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  whop_membership_id: string | null;
}

export function useSubscription() {
  const { orgId } = useAuth();
  return useQuery<OrgSubscription | null>({
    queryKey: ['subscription', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('plan, subscription_status, trial_ends_at, current_period_end, whop_membership_id')
        .eq('id', orgId!)
        .single();
      if (error) throw error;
      return data as OrgSubscription;
    },
    enabled: !!orgId,
  });
}

export function useTrialDaysLeft(): number | null {
  const { data } = useSubscription();
  if (!data?.trial_ends_at || data.subscription_status !== 'trialing') return null;
  const diff = new Date(data.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function useMaxVAs(): number | null {
  const { data } = useSubscription();
  if (!data) return null;
  if (data.plan === 'starter') return 3;
  return null; // unlimited for pro/trial
}
