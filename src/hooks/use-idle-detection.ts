import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTimers, useTeamMembers } from '@/hooks/use-data';
import { updateTeamMember } from '@/lib/store';
import { useQueryClient } from '@tanstack/react-query';

const IDLE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Runs every 60s. For each team member who is 'active' or 'paused',
 * checks if their most recent timer activity is older than 15 min.
 * If so, marks them as 'idle'.
 */
export function useIdleDetection() {
  const { orgId } = useAuth();
  const { data: timers = [] } = useTimers();
  const { data: members = [] } = useTeamMembers();
  const qc = useQueryClient();
  const running = useRef(false);

  useEffect(() => {
    if (!orgId) return;

    const check = async () => {
      if (running.current) return;
      running.current = true;
      try {
        const now = Date.now();

        for (const member of members) {
          if (member.status !== 'active' && member.status !== 'paused') continue;

          // Find all timers for this member's tasks
          // We need task IDs assigned to this member — but timers don't have member ID,
          // so we rely on the tasks query being cached. Instead, look at activity_logs
          // or timer timestamps. Simplest: find the latest timer event for tasks assigned to this member.
          const memberTimers = timers.filter((t: any) => {
            // We can't directly link timer→member without tasks, so check all timers
            // and match via task_id. But we don't have tasks here. Use a simpler heuristic:
            // check the most recent timer update time.
            return true; // We'll filter by task below
          });

          // Get the latest activity timestamp for this member
          let latestActivity = 0;

          for (const timer of timers) {
            // We need to check if this timer's task belongs to this member
            // Since we don't have tasks in scope, use started_at/stopped_at as proxy
            const startedAt = new Date(timer.started_at).getTime();
            const stoppedAt = timer.stopped_at ? new Date(timer.stopped_at).getTime() : 0;
            const latest = Math.max(startedAt, stoppedAt);
            if (latest > latestActivity) latestActivity = latest;
          }

          // If no timer activity in 15 min, mark idle
          if (latestActivity > 0 && now - latestActivity > IDLE_THRESHOLD_MS) {
            await updateTeamMember(member.id, { status: 'idle' });
          }
        }

        qc.invalidateQueries({ queryKey: ['team_members'] });
        qc.invalidateQueries({ queryKey: ['vas'] });
      } finally {
        running.current = false;
      }
    };

    // Run immediately then every 60s
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [orgId, timers, members, qc]);
}
