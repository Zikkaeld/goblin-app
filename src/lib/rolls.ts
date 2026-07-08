import { supabase } from './supabase';
import { todayDateString } from './date';
import { findFlavorByTitle } from '../data';
import type { Rarity, RollResult, ThemeId } from '../types';

export async function recordRoll(roomId: string, profileId: string, result: RollResult): Promise<void> {
  const { error } = await supabase.from('rolls').insert({
    room_id: roomId,
    profile_id: profileId,
    result_title: result.title,
    result_emoji: result.emoji,
    rarity: result.rarity,
    rolled_at: todayDateString(),
    theme_id: result.themeId,
  });
  if (error) throw error;
}

interface TodayRolls {
  count: number;
  lastResult: RollResult | null;
}

export async function fetchMyRollsToday(roomId: string, profileId: string, themeId: ThemeId): Promise<TodayRolls> {
  const { data, error } = await supabase
    .from('rolls')
    .select('result_title, result_emoji, rarity, created_at')
    .eq('room_id', roomId)
    .eq('profile_id', profileId)
    .eq('rolled_at', todayDateString())
    .order('created_at', { ascending: true });
  if (error) throw error;

  const rows = data ?? [];
  const last = rows[rows.length - 1];

  return {
    count: rows.length,
    lastResult: last
      ? {
          resultId: `${roomId}-${last.created_at}`,
          title: last.result_title,
          emoji: last.result_emoji,
          flavor: findFlavorByTitle(themeId, last.result_title),
          rarity: last.rarity as Rarity,
          themeId,
        }
      : null,
  };
}

export interface CollectedResult {
  themeId: ThemeId;
  title: string;
}

export async function fetchCollectedResults(profileId: string): Promise<CollectedResult[]> {
  const { data, error } = await supabase.from('rolls').select('theme_id, result_title').eq('profile_id', profileId);
  if (error) throw error;

  const seen = new Set<string>();
  const results: CollectedResult[] = [];
  for (const row of data ?? []) {
    if (!row.theme_id) continue;
    const key = `${row.theme_id}-${row.result_title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ themeId: row.theme_id as ThemeId, title: row.result_title });
  }
  return results;
}
