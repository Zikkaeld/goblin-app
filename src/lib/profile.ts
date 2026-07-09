import { supabase } from './supabase';
import { todayDateString, yesterdayDateString } from './date';
import type { Rarity, ThemeId } from '../types';

export interface Profile {
  id: string;
  nickname: string;
}

const NICKNAME_CACHE_KEY = 'goblin_profile_nickname_cache';

async function ensureAuthSession(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) {
    return session.user.id;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.session?.user) {
    throw error ?? new Error('Не вдалося створити анонімну сесію');
  }
  return data.session.user.id;
}

export async function resolveProfile(): Promise<Profile | null> {
  const userId = await ensureAuthSession();

  const { data, error } = await supabase.from('profiles').select('id, nickname').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  localStorage.setItem(NICKNAME_CACHE_KEY, data.nickname);
  return { id: data.id, nickname: data.nickname };
}

export async function createProfile(nickname: string): Promise<Profile> {
  const userId = await ensureAuthSession();

  const { data, error } = await supabase.from('profiles').insert({ id: userId, nickname }).select().single();
  if (error || !data) throw error ?? new Error('Не вдалося створити профіль');

  const profile: Profile = { id: data.id, nickname: data.nickname };
  localStorage.setItem(NICKNAME_CACHE_KEY, profile.nickname);
  return profile;
}

export interface SoloStreakInfo {
  streak: number;
  updatedAt: string | null;
}

export async function fetchSoloStreakInfo(profileId: string): Promise<SoloStreakInfo> {
  const { data, error } = await supabase
    .from('profiles')
    .select('solo_streak, solo_streak_updated_at')
    .eq('id', profileId)
    .single();
  if (error) throw error;
  return { streak: data.solo_streak ?? 0, updatedAt: data.solo_streak_updated_at };
}

export async function completeSoloQuest(
  profileId: string,
  currentStreak: number,
  updatedAt: string | null
): Promise<number> {
  const today = todayDateString();
  if (updatedAt === today) {
    return currentStreak;
  }

  const newStreak = updatedAt === yesterdayDateString() ? currentStreak + 1 : 1;
  const { error } = await supabase
    .from('profiles')
    .update({ solo_streak: newStreak, solo_streak_updated_at: today })
    .eq('id', profileId);
  if (error) throw error;
  return newStreak;
}

export interface ProfileStats {
  createdAt: string | null;
  totalRolls: number;
  rarityCounts: Record<Rarity, number>;
  roomsCount: number;
  soloStreak: number;
  longestRoomStreak: number;
  favoriteThemeId: ThemeId | null;
  favoriteThemeCount: number;
}

export async function fetchProfileStats(profileId: string): Promise<ProfileStats> {
  const [profileResult, rollsResult, roomMembersResult] = await Promise.all([
    supabase.from('profiles').select('created_at, solo_streak').eq('id', profileId).single(),
    supabase.from('rolls').select('rarity, theme_id').eq('profile_id', profileId),
    supabase.from('room_members').select('rooms(streak)').eq('profile_id', profileId),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (rollsResult.error) throw rollsResult.error;
  if (roomMembersResult.error) throw roomMembersResult.error;

  const rarityCounts: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, mythic: 0 };
  const themeCounts = new Map<ThemeId, number>();
  for (const row of rollsResult.data ?? []) {
    const rarity = row.rarity as Rarity | null;
    if (rarity && rarity in rarityCounts) rarityCounts[rarity] += 1;
    const themeId = row.theme_id as ThemeId | null;
    if (themeId) themeCounts.set(themeId, (themeCounts.get(themeId) ?? 0) + 1);
  }

  let favoriteThemeId: ThemeId | null = null;
  let favoriteThemeCount = 0;
  for (const [themeId, count] of themeCounts) {
    if (count > favoriteThemeCount) {
      favoriteThemeId = themeId;
      favoriteThemeCount = count;
    }
  }

  const roomRows = (roomMembersResult.data ?? []) as unknown as { rooms: { streak: number } | null }[];
  const longestRoomStreak = roomRows.reduce((max, row) => Math.max(max, row.rooms?.streak ?? 0), 0);

  return {
    createdAt: profileResult.data.created_at,
    totalRolls: rollsResult.data?.length ?? 0,
    rarityCounts,
    roomsCount: roomRows.length,
    soloStreak: profileResult.data.solo_streak ?? 0,
    longestRoomStreak,
    favoriteThemeId,
    favoriteThemeCount,
  };
}
