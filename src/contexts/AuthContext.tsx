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
  const pendingFetch = useRef(0);

  const fetchUserData = useCallback(async (userId: string) => {
    const fetchId = ++pendingFetch.current;
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

      if (fetchId !== pendingFetch.current) return;

      // Handle profile — try to self-heal if missing
      if (profileResult.data) {
        setProfile(profileResult.data as Profile);
      } else {
        // Profile missing — attempt to create it
        const { data: { user } } = await supabase.auth.getUser();
        if (user && fetchId === pendingFetch.current) {
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
          if (fetchId === pendingFetch.current) {
            setProfile(newProfile as Profile | null);
          }
        }
      }

      if (fetchId !== pendingFetch.current) return;

      if (orgResult.data) {
        setOrgId(orgResult.data.organization_id);
        setRole((orgResult.data.role as Role) || null);
      } else {
        setOrgId(null);
        setRole(null);
      }
    } finally {
      if (fetchId === pendingFetch.current) {
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

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      if (!mounted) return;
      setSession(sess);
      if (sess?.user) {
        fetchUserData(sess.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!mounted) return;
      setSession(sess);
      if (sess?.user) {
        fetchUserData(sess.user.id);
      } else {
        setProfile(null);
        setOrgId(null);
        setRole(null);
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
    <AuthContext.Provider value={{ session, profile, userEmail, userName, role, orgId, loading, can, refreshOrg }}>
      {children}
    </AuthContext.Provider>
  );
};
