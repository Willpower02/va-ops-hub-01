import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { ROLE_PERMISSIONS, Role } from '@/lib/types';

interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  userEmail: string | null;
  userName: string;
  role: Role | null;
  orgId: string | null;
  loading: boolean;
  authError: string | null;
  can: (action: keyof typeof ROLE_PERMISSIONS['admin']) => boolean;
  refreshOrg: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  userEmail: null,
  userName: '',
  role: null,
  orgId: null,
  loading: true,
  authError: null,
  can: () => false,
  refreshOrg: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const fetchIdRef = useRef(0);

  const fetchUserData = useCallback(async (userId: string) => {
    const fetchId = ++fetchIdRef.current;
    setAuthError(null);

    try {
      console.log('[Auth] session found —', userId);

      const [profileResult, orgResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, email, first_name, last_name, avatar_url')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle(),
      ]);

      // Stale check
      if (fetchId !== fetchIdRef.current) return;

      // Profile
      if (profileResult.data) {
        console.log('[Auth] profile found —', profileResult.data.email);
        setProfile(profileResult.data as Profile);
      } else {
        console.warn('[Auth] no profile found — attempting auto-create');
        const { data: { user } } = await supabase.auth.getUser();
        if (fetchId !== fetchIdRef.current) return;
        if (user) {
          const { data: created, error: createErr } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email || '',
              first_name: user.user_metadata?.first_name || '',
              last_name: user.user_metadata?.last_name || '',
            })
            .select('id, email, first_name, last_name, avatar_url')
            .maybeSingle();
          if (fetchId !== fetchIdRef.current) return;
          if (created) {
            console.log('[Auth] profile found (auto-created) —', created.email);
            setProfile(created as Profile);
          } else {
            console.error('[Auth] profile auto-create failed:', createErr?.message);
            setAuthError('Could not load or create your profile. Please contact support.');
          }
        }
      }

      // Org
      if (fetchId !== fetchIdRef.current) return;
      if (orgResult.data) {
        console.log('[Auth] organization found —', orgResult.data.organization_id, 'role:', orgResult.data.role);
        const currentOrgId = orgResult.data.organization_id;

        // Check subscription status
        const { data: orgData } = await supabase
          .from('organizations')
          .select('subscription_status, trial_ends_at')
          .eq('id', currentOrgId)
          .single();

        if (fetchId !== fetchIdRef.current) return;

        if (orgData) {
          const status = orgData.subscription_status;
          const trialEnd = orgData.trial_ends_at ? new Date(orgData.trial_ends_at) : null;
          const trialExpired = trialEnd && trialEnd < new Date();

          if (status === 'expired' || (status === 'trialing' && trialExpired)) {
            console.log('[Auth] subscription expired — signing out and redirecting to pricing');
            await supabase.auth.signOut();
            window.location.href = '/pricing?reason=expired';
            return;
          }
        }

        setOrgId(currentOrgId);
        setRole((orgResult.data.role as Role) || null);
      } else {
        console.log('[Auth] no organization found — redirecting to create organization');
        setOrgId(null);
        setRole(null);
      }
    } catch (err: any) {
      if (fetchId !== fetchIdRef.current) return;
      console.error('[Auth] error loading user data:', err?.message);
      setAuthError(err?.message || 'Failed to load account data.');
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const refreshOrg = useCallback(async () => {
    if (session?.user?.id) {
      await fetchUserData(session.user.id);
    }
  }, [session?.user?.id, fetchUserData]);

  useEffect(() => {
    let mounted = true;

    // 1. Bootstrap from existing session
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      if (!mounted) return;
      initializedRef.current = true;

      if (sess?.user) {
        console.log('[Auth] session found (bootstrap) —', sess.user.email);
        setSession(sess);
        fetchUserData(sess.user.id);
      } else {
        console.log('[Auth] no session — redirecting to auth');
        setSession(null);
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      if (!mounted) return;

      console.log('[Auth] auth event:', event);

      if (event === 'SIGNED_OUT') {
        console.log('[Auth] no session — redirecting to auth');
        setSession(null);
        setProfile(null);
        setOrgId(null);
        setRole(null);
        setAuthError(null);
        setLoading(false);
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        // Just update session reference, don't re-fetch
        if (sess) setSession(sess);
        return;
      }

      // SIGNED_IN, USER_UPDATED, INITIAL_SESSION
      if (sess?.user) {
        setSession(sess);
        // Avoid double-fetch if getSession already handled it
        if (event === 'INITIAL_SESSION' && initializedRef.current) return;
        fetchUserData(sess.user.id);
      }
      // IMPORTANT: Do NOT clear session if sess is null here.
      // Only SIGNED_OUT should clear it. Other events with null sess
      // are transient and should be ignored to prevent redirect to login.
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const can = useCallback((action: keyof typeof ROLE_PERMISSIONS['admin']): boolean => {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.[action] ?? false;
  }, [role]);

  const userEmail = session?.user?.email || null;
  const userName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
    : userEmail || '';

  return (
    <AuthContext.Provider value={{ session, profile, userEmail, userName, role, orgId, loading, authError, can, refreshOrg }}>
      {children}
    </AuthContext.Provider>
  );
};
