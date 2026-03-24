import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MessageSquare } from 'lucide-react';

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const { session } = useAuth();
  const [content, setContent] = useState('');
  const qc = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['task_comments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_comments' as any)
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Fetch profile names for all unique user_ids
      const userIds = [...new Set((data || []).map((c: any) => c.user_id))];
      const profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);
        (profiles || []).forEach((p: any) => {
          const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
          profileMap[p.id] = name || p.email;
        });
      }

      return (data || []).map((c: any) => ({
        ...c,
        user_name: profileMap[c.user_id] || 'Unknown',
      }));
    },
    enabled: !!taskId,
  });

  const postComment = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase
        .from('task_comments' as any)
        .insert([{ task_id: taskId, user_id: session!.user.id, content: text }]);
      if (error) throw error;
    },
    onSuccess: () => {
      setContent('');
      qc.invalidateQueries({ queryKey: ['task_comments', taskId] });
    },
  });

  const handlePost = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    postComment.mutate(trimmed);
  };

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium text-foreground">Comments</h4>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No comments yet</p>
      ) : (
        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
          {comments.map((c: any) => (
            <div key={c.id} className="text-sm">
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-foreground">{c.user_name}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-muted-foreground mt-0.5">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Textarea
          placeholder="Add a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[60px] text-sm bg-secondary/30"
          rows={2}
        />
        <Button
          size="sm"
          onClick={handlePost}
          disabled={!content.trim() || postComment.isPending}
          className="self-end"
        >
          {postComment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Post'}
        </Button>
      </div>
    </div>
  );
}
