import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_PERMISSIONS, Role } from '@/lib/types';

interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  organization_id: string | null;
  is_active: boolean;
}

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  role: Role;
  orgId: string | null;
  loading: boolean;
  can: (action: keyof typeof ROLE_PERMISSIONS['admin']) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  role: 'viewer',
  orgId: null,
  loading: true,
  can: () => false,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role>('viewer');
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(prof);

    if (prof?.organization_id) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', prof.organization_id)
        .single();
      setRole((roleData?.role as Role) || 'viewer');
    } else {
      setRole('viewer');
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  }, [session?.user?.id, fetchProfile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        setTimeout(() => fetchProfile(sess.user.id), 0);
      } else {
        setProfile(null);
        setRole('viewer');
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      if (sess?.user) {
        fetchProfile(sess.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const can = useCallback((action: keyof typeof ROLE_PERMISSIONS['admin']): boolean => {
    return ROLE_PERMISSIONS[role]?.[action] ?? false;
  }, [role]);

  const orgId = profile?.organization_id || null;

  return (
    <AuthContext.Provider value={{ session, profile, role, orgId, loading, can, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
