import { LayoutDashboard, ListTodo, Users, BarChart3, Settings, LogOut } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const allNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, permission: 'viewDashboard' as const },
  { title: 'Tasks', url: '/tasks', icon: ListTodo, permission: null },
  { title: 'Team', url: '/team', icon: Users, permission: 'viewTeam' as const },
  { title: 'Reports', url: '/reports', icon: BarChart3, permission: 'viewAnalytics' as const },
  { title: 'Settings', url: '/settings', icon: Settings, permission: 'manageOrg' as const },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { userName, role, can } = useAuth();
  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  const navItems = allNavItems.filter(item => !item.permission || can(item.permission));

  return (
    <Sidebar collapsible="icon" className="border-r border-border/30">
      <div className="px-4 py-5 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center glow-border">
          <span className="text-primary font-bold text-sm">VA</span>
        </div>
        {!collapsed && <span className="font-bold text-foreground text-lg tracking-tight">VA Tracker</span>}
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
                      activeClassName="bg-primary/10 text-primary font-semibold glow-border"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-border/30">
        <div className="flex items-center gap-2 w-full px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">{role?.replace('_', ' ')}</p>
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()} className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-secondary">
          <LogOut className="h-4 w-4 mr-2" />{!collapsed && 'Sign Out'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
