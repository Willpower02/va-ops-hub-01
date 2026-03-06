import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Role, ROLE_PERMISSIONS } from '@/lib/types';
import { getCurrentUser, setCurrentUser, getUsers, seedIfNeeded } from '@/lib/store';

interface AuthContextType {
  user: User | null;
  switchUser: (userId: string) => void;
  can: (action: keyof typeof ROLE_PERMISSIONS['admin']) => boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, switchUser: () => {}, can: () => false });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    seedIfNeeded();
    setUser(getCurrentUser());
  }, []);

  const switchUser = useCallback((userId: string) => {
    const u = getUsers().find(u => u.id === userId);
    if (u) { setCurrentUser(u); setUser(u); }
  }, []);

  const can = useCallback((action: keyof typeof ROLE_PERMISSIONS['admin']): boolean => {
    if (!user) return false;
    return ROLE_PERMISSIONS[user.role]?.[action] ?? false;
  }, [user]);

  return <AuthContext.Provider value={{ user, switchUser, can }}>{children}</AuthContext.Provider>;
};
