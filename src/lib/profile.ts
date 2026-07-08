import { supabase } from './supabase';

export interface Profile {
  id: string;
  nickname: string;
}

const PROFILE_ID_KEY = 'goblin_profile_id';
const PROFILE_NICKNAME_KEY = 'goblin_profile_nickname';

export function getStoredProfile(): Profile | null {
  const id = localStorage.getItem(PROFILE_ID_KEY);
  const nickname = localStorage.getItem(PROFILE_NICKNAME_KEY);
  if (!id || !nickname) return null;
  return { id, nickname };
}

export async function createProfile(nickname: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').insert({ nickname }).select().single();
  if (error || !data) throw error ?? new Error('Не вдалося створити профіль');

  const profile: Profile = { id: data.id, nickname: data.nickname };
  localStorage.setItem(PROFILE_ID_KEY, profile.id);
  localStorage.setItem(PROFILE_NICKNAME_KEY, profile.nickname);
  return profile;
}
