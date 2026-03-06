import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_PERMISSIONS, Role } from '@/lib/types';

interface AuthContextType {
  session: Session | null;
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
  const [role, setRole] = useState<Role | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrgMembership = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (data) {
      setOrgId(data.organization_id);
      setRole((data.role as Role) || null);
    } else {
      setOrgId(null);
      setRole(null);
    }
  }, []);

  const refreshOrg = useCallback(async () => {
    if (session?.user?.id) {
      await fetchOrgMembership(session.user.id);
    }
  }, [session?.user?.id, fetchOrgMembership]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        setTimeout(() => fetchOrgMembership(sess.user.id), 0);
      } else {
        setOrgId(null);
        setRole(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      if (sess?.user) {
        fetchOrgMembership(sess.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchOrgMembership]);

  const can = useCallback((action: keyof typeof ROLE_PERMISSIONS['admin']): boolean => {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.[action] ?? false;
  }, [role]);

  const userEmail = session?.user?.email || null;
  const meta = session?.user?.user_metadata;
  const userName = meta ? `${meta.first_name || ''} ${meta.last_name || ''}`.trim() : userEmail || '';

  return (
    <AuthContext.Provider value={{ session, userEmail, userName, role, orgId, loading, can, refreshOrg }}>
      {children}
    </AuthContext.Provider>
  );
};
