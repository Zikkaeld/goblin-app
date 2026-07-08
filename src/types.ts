export type ThemeId =
  | 'goblin'
  | 'vegetable'
  | 'frog'
  | 'duck'
  | 'dragon'
  | 'anime'
  | 'worker'
  | 'brainrot';

export interface ThemeInfo {
  id: ThemeId;
  label: string;
  emoji: string;
  gradient: string;
}

export type Rarity = 'common' | 'rare' | 'epic' | 'mythic';

export interface RarityInfo {
  id: Rarity;
  label: string;
  color: string;
  glow: string;
  weight: number;
}

export interface RollResult {
  resultId: string;
  title: string;
  emoji: string;
  flavor: string;
  rarity: Rarity;
  themeId: ThemeId;
}

export interface MemberTodayResult {
  title: string;
  emoji: string;
  rarity: Rarity;
}

export interface Member {
  id: string;
  name: string;
  avatar: string;
  isCurrentUser?: boolean;
  todayResult: MemberTodayResult | null;
}

export interface Room {
  id: string;
  name: string;
  themeId: ThemeId;
  ownerId: string;
  inviteCode: string;
  icon: string | null;
  members: Member[];
  streak: number;
  rolledTodayMemberIds: string[];
}

export interface RollLimitState {
  freeUsed: number;
  extra: number;
}

export const FREE_ROLLS_PER_DAY = 3;

export function rollsRemaining(state: RollLimitState): number {
  const totalAllowed = FREE_ROLLS_PER_DAY + state.extra;
  return Math.max(0, totalAllowed - state.freeUsed);
}
