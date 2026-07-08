import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ProfileContext } from '../context/ProfileContext';
import { resolveProfile } from '../lib/profile';
import type { Profile } from '../lib/profile';
import NicknameForm from './NicknameForm';

interface ProfileGateProps {
  children: ReactNode;
}

export default function ProfileGate({ children }: ProfileGateProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveProfile()
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        setChecked(true);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Не вдалося з’єднатися з сервером. Онови сторінку.');
        setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked) return null;

  if (error) {
    return (
      <div className="app">
        <div className="view" style={{ maxWidth: 360, margin: '80px auto 0' }}>
          <div className="panel" style={{ alignItems: 'center', textAlign: 'center' }}>
            <p className="panel__hint">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <NicknameForm onCreated={setProfile} />;
  }

  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>;
}
