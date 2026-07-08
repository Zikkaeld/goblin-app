import { supabase } from './supabase';
import { todayDateString, yesterdayDateString } from './date';

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
