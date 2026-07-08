import { createContext, useContext } from 'react';
import type { Profile } from '../lib/profile';

export const ProfileContext = createContext<Profile | null>(null);

export function useProfile(): Profile {
  const profile = useContext(ProfileContext);
  if (!profile) throw new Error('useProfile must be used within ProfileGate');
  return profile;
}
