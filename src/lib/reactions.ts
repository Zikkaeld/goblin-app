import { supabase } from './supabase';
import type { ReactionSummary } from '../types';

export const REACTION_EMOJIS = ['😂', '👑', '💀', '🔥', '👀'];

export interface ReactionRow {
  id: string;
  roll_id: string;
  reactor_id: string;
  emoji: string;
}

export async function fetchReactionsForRolls(rollIds: string[]): Promise<ReactionRow[]> {
  if (rollIds.length === 0) return [];
  const { data, error } = await supabase.from('reactions').select('id, roll_id, reactor_id, emoji').in('roll_id', rollIds);
  if (error) throw error;
  return data ?? [];
}

export function summarizeReactions(rows: ReactionRow[], rollId: string, currentProfileId: string): ReactionSummary[] {
  const byEmoji = new Map<string, { count: number; reactedByMe: boolean }>();
  for (const row of rows) {
    if (row.roll_id !== rollId) continue;
    const entry = byEmoji.get(row.emoji) ?? { count: 0, reactedByMe: false };
    entry.count += 1;
    if (row.reactor_id === currentProfileId) entry.reactedByMe = true;
    byEmoji.set(row.emoji, entry);
  }
  return Array.from(byEmoji.entries()).map(([emoji, v]) => ({ emoji, count: v.count, reactedByMe: v.reactedByMe }));
}

export async function toggleReaction(rollId: string, reactorId: string, emoji: string): Promise<'added' | 'removed'> {
  const { data: existing, error: existingError } = await supabase
    .from('reactions')
    .select('id')
    .eq('roll_id', rollId)
    .eq('reactor_id', reactorId)
    .eq('emoji', emoji)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    const { error } = await supabase.from('reactions').delete().eq('id', existing.id);
    if (error) throw error;
    return 'removed';
  }

  const { error } = await supabase.from('reactions').insert({ roll_id: rollId, reactor_id: reactorId, emoji });
  if (error) throw error;
  return 'added';
}
