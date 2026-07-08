import { supabase } from './supabase';
import { todayDateString } from './date';
import { avatarForId } from './avatar';
import type { Member, Rarity, Room, ThemeId } from '../types';

export interface DbRoomRow {
  id: string;
  name: string;
  theme_id: ThemeId;
  owner_id: string;
  invite_code: string;
  streak: number;
  icon: string | null;
}

const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)];
  }
  return code;
}

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === '23505';
}

async function hydrateRoom(dbRoom: DbRoomRow, currentProfileId: string): Promise<Room> {
  const [membersResult, rollsResult] = await Promise.all([
    supabase.from('room_members').select('profile_id, profiles(id, nickname)').eq('room_id', dbRoom.id),
    supabase
      .from('rolls')
      .select('profile_id, result_title, result_emoji, rarity, created_at')
      .eq('room_id', dbRoom.id)
      .eq('rolled_at', todayDateString())
      .order('created_at', { ascending: true }),
  ]);

  if (membersResult.error) throw membersResult.error;
  if (rollsResult.error) throw rollsResult.error;

  const latestResultByProfile = new Map<string, { title: string; emoji: string; rarity: Rarity }>();
  for (const row of rollsResult.data ?? []) {
    latestResultByProfile.set(row.profile_id, {
      title: row.result_title,
      emoji: row.result_emoji,
      rarity: row.rarity as Rarity,
    });
  }

  const members: Member[] = (membersResult.data ?? []).map((row) => {
    const profile = row.profiles as unknown as { id: string; nickname: string } | null;
    return {
      id: row.profile_id,
      name: profile?.nickname ?? 'Хтось',
      avatar: avatarForId(row.profile_id),
      isCurrentUser: row.profile_id === currentProfileId,
      todayResult: latestResultByProfile.get(row.profile_id) ?? null,
    };
  });

  const rolledTodayMemberIds = Array.from(latestResultByProfile.keys());

  return {
    id: dbRoom.id,
    name: dbRoom.name,
    themeId: dbRoom.theme_id,
    ownerId: dbRoom.owner_id,
    inviteCode: dbRoom.invite_code,
    icon: dbRoom.icon,
    members,
    streak: dbRoom.streak,
    rolledTodayMemberIds,
  };
}

export async function fetchMyRooms(profileId: string): Promise<Room[]> {
  const { data, error } = await supabase
    .from('room_members')
    .select('rooms(id, name, theme_id, owner_id, invite_code, streak, icon)')
    .eq('profile_id', profileId);
  if (error) throw error;

  const dbRooms = (data ?? [])
    .map((row) => row.rooms as unknown as DbRoomRow | null)
    .filter((r): r is DbRoomRow => r !== null);

  return Promise.all(dbRooms.map((r) => hydrateRoom(r, profileId)));
}

export async function createRoom(profileId: string, name: string, themeId: ThemeId): Promise<Room> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = generateInviteCode();
    const { data, error } = await supabase
      .from('rooms')
      .insert({ name, theme_id: themeId, owner_id: profileId, invite_code: inviteCode, streak: 0 })
      .select()
      .single();

    if (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }

    const { error: memberError } = await supabase
      .from('room_members')
      .insert({ room_id: data.id, profile_id: profileId });
    if (memberError) throw memberError;

    return hydrateRoom(data as DbRoomRow, profileId);
  }
  throw new Error('Не вдалося створити унікальний код запрошення, спробуй ще раз');
}

export async function fetchRoomByInviteCode(code: string): Promise<DbRoomRow | null> {
  const { data, error } = await supabase.from('rooms').select('*').eq('invite_code', code).maybeSingle();
  if (error) throw error;
  return data as DbRoomRow | null;
}

export async function joinRoom(profileId: string, roomId: string): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from('room_members')
    .select('room_id')
    .eq('room_id', roomId)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return;

  const { error } = await supabase.from('room_members').insert({ room_id: roomId, profile_id: profileId });
  if (error) throw error;
}

export async function updateRoomTheme(roomId: string, themeId: ThemeId): Promise<void> {
  const { error } = await supabase.from('rooms').update({ theme_id: themeId }).eq('id', roomId);
  if (error) throw error;
}

export async function updateRoomStreak(roomId: string, newStreak: number): Promise<void> {
  const { error } = await supabase.from('rooms').update({ streak: newStreak }).eq('id', roomId);
  if (error) throw error;
}

export async function updateRoomDetails(roomId: string, name: string, icon: string): Promise<void> {
  const { error } = await supabase.from('rooms').update({ name, icon }).eq('id', roomId);
  if (error) throw error;
}

export async function removeMemberFromRoom(roomId: string, profileId: string): Promise<void> {
  const { error: rollsError } = await supabase
    .from('rolls')
    .delete()
    .eq('room_id', roomId)
    .eq('profile_id', profileId);
  if (rollsError) throw rollsError;

  const { error: memberError } = await supabase
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('profile_id', profileId);
  if (memberError) throw memberError;
}

export async function deleteRoom(roomId: string): Promise<void> {
  const { error: rollsError } = await supabase.from('rolls').delete().eq('room_id', roomId);
  if (rollsError) throw rollsError;

  const { error: membersError } = await supabase.from('room_members').delete().eq('room_id', roomId);
  if (membersError) throw membersError;

  const { error: roomError } = await supabase.from('rooms').delete().eq('id', roomId);
  if (roomError) throw roomError;
}
