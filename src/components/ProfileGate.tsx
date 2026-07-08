import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ProfileContext } from '../context/ProfileContext';
import { getStoredProfile } from '../lib/profile';
import type { Profile } from '../lib/profile';
import NicknameForm from './NicknameForm';

interface ProfileGateProps {
  children: ReactNode;
}

export default function ProfileGate({ children }: ProfileGateProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setProfile(getStoredProfile());
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!profile) {
    return <NicknameForm onCreated={setProfile} />;
  }

  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>;
}
