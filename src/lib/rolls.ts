import { supabase } from './supabase';
import { todayDateString } from './date';
import { findFlavorByTitle } from '../data';
import type { Rarity, RollResult, ThemeId } from '../types';

export async function recordRoll(roomId: string | null, profileId: string, result: RollResult): Promise<string> {
  const { data, error } = await supabase
    .from('rolls')
    .insert({
      room_id: roomId,
      profile_id: profileId,
      result_title: result.title,
      result_emoji: result.emoji,
      rarity: result.rarity,
      rolled_at: todayDateString(),
      theme_id: result.themeId,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

interface TodayRolls {
  count: number;
  lastResult: RollResult | null;
}

export async function fetchMyRollsToday(roomId: string, profileId: string, themeId: ThemeId): Promise<TodayRolls> {
  const { data, error } = await supabase
    .from('rolls')
    .select('id, result_title, result_emoji, rarity, created_at')
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
          rollId: last.id,
          title: last.result_title,
          emoji: last.result_emoji,
          flavor: findFlavorByTitle(themeId, last.result_title),
          rarity: last.rarity as Rarity,
          themeId,
        }
      : null,
  };
}

export interface SoloRollsToday {
  count: number;
  completedThemeIds: ThemeId[];
  lastResult: RollResult | null;
  history: RollResult[];
}

export async function fetchSoloRollsToday(profileId: string): Promise<SoloRollsToday> {
  const { data, error } = await supabase
    .from('rolls')
    .select('id, result_title, result_emoji, rarity, theme_id, created_at')
    .eq('profile_id', profileId)
    .is('room_id', null)
    .eq('rolled_at', todayDateString())
    .order('created_at', { ascending: true });
  if (error) throw error;

  const rows = data ?? [];
  const last = rows[rows.length - 1];
  const completedThemeIds = Array.from(
    new Set(rows.map((row) => row.theme_id).filter((t): t is ThemeId => t !== null))
  );

  const history: RollResult[] = rows
    .map((row) => ({
      resultId: `solo-${row.created_at}`,
      rollId: row.id,
      title: row.result_title,
      emoji: row.result_emoji,
      flavor: findFlavorByTitle(row.theme_id as ThemeId, row.result_title),
      rarity: row.rarity as Rarity,
      themeId: row.theme_id as ThemeId,
    }))
    .reverse();

  return {
    count: rows.length,
    completedThemeIds,
    lastResult: last
      ? {
          resultId: `solo-${last.created_at}`,
          rollId: last.id,
          title: last.result_title,
          emoji: last.result_emoji,
          flavor: findFlavorByTitle(last.theme_id as ThemeId, last.result_title),
          rarity: last.rarity as Rarity,
          themeId: last.theme_id as ThemeId,
        }
      : null,
    history,
  };
}

export interface CollectedResult {
  themeId: ThemeId;
  title: string;
}

export interface PublicRollResult {
  title: string;
  emoji: string;
  rarity: Rarity;
  themeId: ThemeId | null;
  nickname: string;
}

export async function fetchRollById(rollId: string): Promise<PublicRollResult | null> {
  const { data, error } = await supabase
    .from('rolls')
    .select('result_title, result_emoji, rarity, theme_id, profiles(nickname)')
    .eq('id', rollId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const profileRow = data.profiles as unknown as { nickname: string } | null;

  return {
    title: data.result_title,
    emoji: data.result_emoji,
    rarity: data.rarity as Rarity,
    themeId: data.theme_id as ThemeId | null,
    nickname: profileRow?.nickname ?? 'Хтось',
  };
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
