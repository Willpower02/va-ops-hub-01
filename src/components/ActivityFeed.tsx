import { formatDistanceToNow } from 'date-fns';
import { Activity, Plus, Play, Pause, Square, CheckCircle, UserPlus, Building } from 'lucide-react';
import { useActivityLogs } from '@/hooks/use-data';
import { ScrollArea } from '@/components/ui/scroll-area';

const ACTION_CONFIG: Record<string, { icon: typeof Activity; label: string; color: string }> = {
  task_created: { icon: Plus, label: 'created a task', color: 'text-primary' },
  task_completed: { icon: CheckCircle, label: 'completed a task', color: 'text-success' },
  timer_started: { icon: Play, label: 'started a timer', color: 'text-success' },
  timer_paused: { icon: Pause, label: 'paused a timer', color: 'text-warning' },
  timer_stopped: { icon: Square, label: 'stopped a timer', color: 'text-destructive' },
  member_added: { icon: UserPlus, label: 'added a team member', color: 'text-primary' },
  org_created: { icon: Building, label: 'created the organization', color: 'text-primary' },
};

export function ActivityFeed() {
  const { data: logs = [], isLoading } = useActivityLogs();

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4" /> Activity Feed
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-2 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4" /> Activity Feed
      </h3>
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>
      ) : (
        <ScrollArea className="h-[320px] pr-2">
          <div className="space-y-1">
            {logs.map((log: any) => {
              const config = ACTION_CONFIG[log.action] || { icon: Activity, label: log.action, color: 'text-muted-foreground' };
              const Icon = config.icon;
              const details = log.details as Record<string, any> || {};
              const contextLabel = details.title || details.name || details.task_id?.slice(0, 8) || '';

              return (
                <div key={log.id} className="flex items-start gap-3 py-2.5 border-b border-border/30 last:border-0">
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{config.label}</span>
                      {contextLabel && (
                        <span className="text-muted-foreground"> — {contextLabel}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      {details.duration_seconds != null && (
                        <span className="ml-2 timer-digits">
                          Duration: {Math.floor(details.duration_seconds / 60)}m {details.duration_seconds % 60}s
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
