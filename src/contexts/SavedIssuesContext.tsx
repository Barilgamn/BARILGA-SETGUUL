import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface SavedIssue {
  issueId: string;
  title: string;
  coverImage: string;
  savedAt: number;
}

type IssueRef = { id: string; title: string; coverImage: string };

interface SavedIssuesContextType {
  saved: SavedIssue[];
  isSaved: (issueId: string) => boolean;
  // Resolves to false when the visitor isn't signed in (caller sends them to log in)
  toggle: (issue: IssueRef) => Promise<boolean>;
}

const SavedIssuesContext = createContext<SavedIssuesContextType>({
  saved: [],
  isSaved: () => false,
  toggle: async () => false,
});

// One fetch per signed-in user, shared by every «Хадгалах» button on the page
export function SavedIssuesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState<SavedIssue[]>([]);

  useEffect(() => {
    if (!user) {
      setSaved([]);
      return;
    }
    supabase
      .from('saved_issues')
      .select('issue_id, title, cover_image, saved_at')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) return console.error('Failed to load saved issues:', error.message);
        setSaved(
          (data || []).map(r => ({
            issueId: r.issue_id,
            title: r.title,
            coverImage: r.cover_image,
            savedAt: Number(r.saved_at),
          }))
        );
      });
  }, [user]);

  const isSaved = useCallback((issueId: string) => saved.some(s => s.issueId === issueId), [saved]);

  const toggle = useCallback(
    async (issue: IssueRef) => {
      if (!user) return false;
      const wasSaved = saved.some(s => s.issueId === issue.id);
      const before = saved;
      // Optimistic: flip now, roll back if the database refuses
      setSaved(wasSaved
        ? saved.filter(s => s.issueId !== issue.id)
        : [{ issueId: issue.id, title: issue.title, coverImage: issue.coverImage, savedAt: Date.now() }, ...saved]);
      const { error } = wasSaved
        ? await supabase.from('saved_issues').delete().eq('user_id', user.id).eq('issue_id', issue.id)
        : await supabase
            .from('saved_issues')
            .upsert(
              { user_id: user.id, issue_id: issue.id, title: issue.title, cover_image: issue.coverImage },
              { onConflict: 'user_id,issue_id', ignoreDuplicates: true }
            );
      if (error) {
        console.error('Failed to update saved issues:', error.message);
        setSaved(before);
      }
      return true;
    },
    [user, saved]
  );

  return <SavedIssuesContext.Provider value={{ saved, isSaved, toggle }}>{children}</SavedIssuesContext.Provider>;
}

export const useSavedIssues = () => useContext(SavedIssuesContext);
