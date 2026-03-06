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
  const fetchingRef = useRef(false);

  const ensureProfile = useCallback(async (userId: string): Promise<Profile> => {
    const profileResult = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (profileResult.error) {
      throw new Error(`Failed to load profile: ${profileResult.error.message}`);
    }

    if (profileResult.data) {
      console.log('[Auth] profile found', profileResult.data.email);
      return profileResult.data as Profile;
    }

    console.warn('[Auth] no profile found');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user found while creating missing profile.');
    }

    const created = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email || '',
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
      })
      .select('id, email, first_name, last_name, avatar_url')
      .maybeSingle();

    if (created.error || !created.data) {
      throw new Error('No profile found for your account, and automatic profile creation failed. Please contact an admin.');
    }

    console.log('[Auth] profile found (auto-created)', created.data.email);
    return created.data as Profile;
  }, []);

  const fetchUserData = useCallback(async (userId: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setAuthError(null);

    try {
      console.log('[Auth] session found', userId);

      const [profileData, orgResult] = await Promise.all([
        ensureProfile(userId),
        supabase
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle(),
      ]);

      setProfile(profileData);

      if (orgResult.error) {
        throw new Error(`Failed to load organization role: ${orgResult.error.message}`);
      }

      if (orgResult.data) {
        setOrgId(orgResult.data.organization_id);
        setRole((orgResult.data.role as Role) || null);
      } else {
        setOrgId(null);
        setRole(null);
      }
    } catch (err: any) {
      const message = err?.message || 'Authentication setup failed.';
      console.error('[Auth] profile lookup/auth flow error:', message);
      setAuthError(message);
      setProfile(null);
      setOrgId(null);
      setRole(null);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [ensureProfile]);

  const refreshOrg = useCallback(async () => {
    if (session?.user?.id) {
      await fetchUserData(session.user.id);
    }
  }, [session?.user?.id, fetchUserData]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      if (!mounted) return;

      if (!sess?.user) {
        console.log('[Auth] no session found');
        setSession(null);
        setLoading(false);
        return;
      }

      console.log('[Auth] session found (initial)', sess.user.id);
      setSession(sess);
      fetchUserData(sess.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      if (!mounted) return;

      console.log('[Auth] auth state:', event);

      if (event === 'SIGNED_OUT') {
        console.log('[Auth] no session found');
        setSession(null);
        setProfile(null);
        setOrgId(null);
        setRole(null);
        setAuthError(null);
        setLoading(false);
        return;
      }

      setSession(sess);

      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      if (sess?.user) {
        fetchUserData(sess.user.id);
      } else {
        console.log('[Auth] no session found');
        setLoading(false);
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
    <AuthContext.Provider value={{ session, profile, userEmail, userName, role, orgId, loading, authError, can, refreshOrg }}>
      {children}
    </AuthContext.Provider>
  );
};
