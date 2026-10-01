import { supabase } from './supabase';

// Refetch whenever a row in `table` changes. Realtime only tells us "something
// changed"; reading back through the normal query keeps row level security in
// charge of what this visitor sees.
export function watchTable(table: string, refetch: () => void, filter?: string): () => void {
  refetch();
  const channel = supabase
    .channel(`watch-${table}-${filter || 'all'}-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, () => refetch())
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const { data, error } = await supabase.from('settings').select('value').eq('key', key).maybeSingle();
  if (error) throw error;
  return (data?.value as T) ?? null;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const { error } = await supabase.from('settings').upsert({ key, value, updated_at: Date.now() });
  if (error) throw error;
}
