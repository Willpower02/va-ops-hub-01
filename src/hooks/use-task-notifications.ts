import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

function getTaskDueDateTime(task: any): Date | null {
  if (!task.due_date || !task.due_time) return null;
  // due_date is "YYYY-MM-DD", due_time is "HH:MM:SS" or "HH:MM"
  return new Date(`${task.due_date}T${task.due_time}`);
}

export function isTaskOverdue(task: any): boolean {
  if (task.status === 'completed') return false;
  const dt = getTaskDueDateTime(task);
  if (!dt) return false;
  return dt.getTime() < Date.now();
}

export function isTaskDueSoon(task: any, withinMs = 60 * 60 * 1000): boolean {
  if (task.status === 'completed') return false;
  const dt = getTaskDueDateTime(task);
  if (!dt) return false;
  const diff = dt.getTime() - Date.now();
  return diff > 0 && diff <= withinMs;
}

function formatDueTime(task: any): string {
  const dt = getTaskDueDateTime(task);
  if (!dt) return '';
  return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatTaskDueLabel(task: any): string | null {
  if (!task.due_date) return null;
  const date = new Date(task.due_date + 'T00:00:00');
  const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (task.due_time) {
    const dt = getTaskDueDateTime(task)!;
    const time = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${label} at ${time}`;
  }
  return label;
}

export function useTaskNotifications(tasks: any[]) {
  const notifiedRef = useRef<Set<string>>(new Set());
  const dueSoonNotifiedRef = useRef<Set<string>>(new Set());

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const check = () => {
      const now = Date.now();
      for (const task of tasks) {
        if (task.status === 'completed') continue;
        const dt = getTaskDueDateTime(task);
        if (!dt) continue;

        const diff = dt.getTime() - now;
        const time = formatDueTime(task);

        // Overdue
        if (diff < 0 && !notifiedRef.current.has(task.id)) {
          notifiedRef.current.add(task.id);
          toast.error(`🚨 Overdue: ${task.title} was due at ${time}`);
          sendBrowserNotification(`Overdue: ${task.title}`, `Was due at ${time}`);
        }

        // Due within 15 minutes
        if (diff > 0 && diff <= 15 * 60 * 1000 && !dueSoonNotifiedRef.current.has(task.id)) {
          dueSoonNotifiedRef.current.add(task.id);
          toast.warning(`⏰ Task due soon: ${task.title} is due at ${time}`);
          sendBrowserNotification(`Task due soon: ${task.title}`, `Due at ${time}`);
        }
      }
    };

    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [tasks]);
}

function sendBrowserNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/placeholder.svg' });
  }
}
