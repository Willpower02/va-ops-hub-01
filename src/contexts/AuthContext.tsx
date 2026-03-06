import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
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
  const fetchingRef = useRef(false);
  const lastFetchedUserId = useRef<string | null>(null);

  const fetchUserData = useCallback(async (userId: string) => {
    // Prevent duplicate concurrent fetches for the same user
    if (fetchingRef.current && lastFetchedUserId.current === userId) {
      console.log('[Auth] Skipping duplicate fetch for user:', userId);
      return;
    }
    fetchingRef.current = true;
    lastFetchedUserId.current = userId;

    console.log('[Auth] Fetching user data for:', userId);

    try {
      // Fetch profile and org membership in parallel
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

      // Handle profile
      if (profileResult.data) {
        console.log('[Auth] Profile loaded:', profileResult.data.email);
        setProfile(profileResult.data as Profile);
      } else if (profileResult.error) {
        console.error('[Auth] Profile fetch error:', profileResult.error.message);
        // Try to self-heal — create profile
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('[Auth] Attempting to create missing profile...');
          const { data: newProfile, error: insertErr } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email || '',
              first_name: user.user_metadata?.first_name || '',
              last_name: user.user_metadata?.last_name || '',
            })
            .select('id, email, first_name, last_name, avatar_url')
            .maybeSingle();
          if (insertErr) {
            console.error('[Auth] Profile creation failed:', insertErr.message);
          } else {
            console.log('[Auth] Profile created successfully');
            setProfile(newProfile as Profile | null);
          }
        }
      } else {
        console.warn('[Auth] Profile missing (no data, no error) — attempting self-heal');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email || '',
              first_name: user.user_metadata?.first_name || '',
              last_name: user.user_metadata?.last_name || '',
            })
            .select('id, email, first_name, last_name, avatar_url')
            .maybeSingle();
          setProfile(newProfile as Profile | null);
        }
      }

      // Handle org membership
      if (orgResult.data) {
        console.log('[Auth] Org found:', orgResult.data.organization_id, 'Role:', orgResult.data.role);
        setOrgId(orgResult.data.organization_id);
        setRole((orgResult.data.role as Role) || null);
      } else {
        console.log('[Auth] No org membership found');
        setOrgId(null);
        setRole(null);
      }
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  const refreshOrg = useCallback(async () => {
    if (session?.user?.id) {
      lastFetchedUserId.current = null; // force re-fetch
      await fetchUserData(session.user.id);
    }
  }, [session?.user?.id, fetchUserData]);

  useEffect(() => {
    let mounted = true;

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      if (!mounted) return;
      console.log('[Auth] Initial session:', sess ? 'found' : 'none');
      setSession(sess);
      if (sess?.user) {
        fetchUserData(sess.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes — only react to meaningful events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      if (!mounted) return;

      console.log('[Auth] Auth state change:', event);

      // Only update session/fetch data on meaningful events
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        setSession(sess);
        if (sess?.user) {
          // Use setTimeout to avoid Supabase deadlock on token refresh
          setTimeout(() => {
            if (mounted) fetchUserData(sess.user.id);
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          console.log('[Auth] User signed out');
          setProfile(null);
          setOrgId(null);
          setRole(null);
          setLoading(false);
        }
      } else if (event === 'TOKEN_REFRESHED') {
        // Just update the session object, don't re-fetch everything
        console.log('[Auth] Token refreshed');
        setSession(sess);
      }
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
    <AuthContext.Provider value={{ session, profile, userEmail, userName, role, orgId, loading, can, refreshOrg }}>
      {children}
    </AuthContext.Provider>
  );
};
