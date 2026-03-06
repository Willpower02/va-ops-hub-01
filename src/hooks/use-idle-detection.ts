import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTimers, useTeamMembers, useTasks } from '@/hooks/use-data';
import { updateTeamMember } from '@/lib/store';
import { useQueryClient } from '@tanstack/react-query';

const IDLE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Runs every 60s. For each 'active' or 'paused' team member,
 * checks their most recent timer activity. If older than 15 min → mark idle.
 */
export function useIdleDetection() {
  const { orgId } = useAuth();
  const { data: timers = [] } = useTimers();
  const { data: members = [] } = useTeamMembers();
  const { data: tasks = [] } = useTasks();
  const qc = useQueryClient();
  const running = useRef(false);

  useEffect(() => {
    if (!orgId || members.length === 0) return;

    const check = async () => {
      if (running.current) return;
      running.current = true;
      try {
        const now = Date.now();
        let changed = false;

        for (const member of members) {
          if (member.status !== 'active' && member.status !== 'paused') continue;

          // Get task IDs assigned to this member
          const memberTaskIds = new Set(
            tasks
              .filter((t: any) => t.assigned_team_member_id === member.id)
              .map((t: any) => t.id)
          );

          if (memberTaskIds.size === 0) {
            // No tasks at all — should be idle
            await updateTeamMember(member.id, { status: 'idle' });
            changed = true;
            continue;
          }

          // Find latest timer activity for this member's tasks
          let latestActivity = 0;
          for (const timer of timers) {
            if (!memberTaskIds.has(timer.task_id)) continue;
            // If running, they're active — skip idle check
            if (timer.status === 'running') {
              latestActivity = Infinity;
              break;
            }
            const startedAt = new Date(timer.started_at).getTime();
            const stoppedAt = timer.stopped_at ? new Date(timer.stopped_at).getTime() : 0;
            latestActivity = Math.max(latestActivity, startedAt, stoppedAt);
          }

          // Running timer means definitely not idle
          if (latestActivity === Infinity) continue;

          // No timer activity or activity older than threshold → idle
          if (latestActivity === 0 || now - latestActivity > IDLE_THRESHOLD_MS) {
            await updateTeamMember(member.id, { status: 'idle' });
            changed = true;
          }
        }

        if (changed) {
          qc.invalidateQueries({ queryKey: ['team_members'] });
          qc.invalidateQueries({ queryKey: ['vas'] });
        }
      } finally {
        running.current = false;
      }
    };

    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [orgId, timers, members, tasks, qc]);
}
