import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { rollForTheme } from '../data';
import { rollsRemaining } from '../types';
import type { Rarity, Room, RollLimitState, RollResult, ThemeId } from '../types';
import {
  createRoom,
  fetchMyRooms,
  updateRoomTheme,
  updateRoomStreak,
  updateRoomDetails,
  removeMemberFromRoom,
  deleteRoom,
} from '../lib/rooms';
import { fetchMyRollsToday, recordRoll } from '../lib/rolls';
import { supabase } from '../lib/supabase';
import NavTabs, { type MainView } from '../components/NavTabs';
import RoomsList from '../components/RoomsList';
import RoomView from '../components/RoomView';
import CollectionView from '../components/CollectionView';
import SoloRoll from '../components/SoloRoll';
import AdModal from '../components/AdModal';
import Toast from '../components/Toast';

const EMPTY_ROLL_STATE: RollLimitState = { freeUsed: 0, extra: 0 };

interface AdRequest {
  context: string | 'solo';
  reward: 1 | 3;
}

interface RollInsertRow {
  room_id: string;
  profile_id: string;
  result_title: string;
  result_emoji: string;
  rarity: Rarity;
}

interface RoomStreakRow {
  id: string;
  streak: number;
}

export default function MainApp() {
  const profile = useProfile();
  const location = useLocation();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [mainView, setMainView] = useState<MainView>('rooms');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const [roomRollStates, setRoomRollStates] = useState<Record<string, RollLimitState>>({});
  const [roomResults, setRoomResults] = useState<Record<string, RollResult | null>>({});
  const [justCompletedStreakRoomId, setJustCompletedStreakRoomId] = useState<string | null>(null);
  const [newlyArrivedMemberIds, setNewlyArrivedMemberIds] = useState<string[]>([]);

  const [soloTheme, setSoloTheme] = useState<ThemeId>('goblin');
  const [soloRollState, setSoloRollState] = useState<RollLimitState>(EMPTY_ROLL_STATE);
  const [soloResult, setSoloResult] = useState<RollResult | null>(null);

  const [adModal, setAdModal] = useState<AdRequest | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeout = useRef<number | null>(null);
  const roomsRef = useRef<Room[]>(rooms);
  roomsRef.current = rooms;

  function showToast(message: string) {
    setToast(message);
    if (toastTimeout.current) window.clearTimeout(toastTimeout.current);
    toastTimeout.current = window.setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    let cancelled = false;
    setRoomsLoading(true);
    fetchMyRooms(profile.id)
      .then((data) => {
        if (cancelled) return;
        setRooms(data);
        const openRoomId = (location.state as { openRoomId?: string } | null)?.openRoomId;
        if (openRoomId && data.some((r) => r.id === openRoomId)) {
          setActiveRoomId(openRoomId);
        }
      })
      .catch(() => showToast('Не вдалося завантажити кімнати 😢'))
      .finally(() => {
        if (!cancelled) setRoomsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile.id, location.state]);

  useEffect(() => {
    if (!activeRoomId) return;
    const room = roomsRef.current.find((r) => r.id === activeRoomId);
    if (!room) return;
    let cancelled = false;
    fetchMyRollsToday(activeRoomId, profile.id, room.themeId)
      .then(({ count, lastResult }) => {
        if (cancelled) return;
        setRoomRollStates((prev) => ({
          ...prev,
          [activeRoomId]: { freeUsed: count, extra: prev[activeRoomId]?.extra ?? 0 },
        }));
        if (lastResult) setRoomResults((prev) => ({ ...prev, [activeRoomId]: lastResult }));
      })
      .catch(() => showToast('Не вдалося завантажити сьогоднішні кидки 😢'));
    return () => {
      cancelled = true;
    };
  }, [activeRoomId, profile.id]);

  useEffect(() => {
    if (!activeRoomId) return;

    // Унікальний суфікс на кожен виклик ефекту: supabase.channel() повертає вже
    // існуючий канал з тим самим топіком, якщо попередній ще не встиг закритися
    // (removeChannel асинхронний і не await-иться в cleanup) — це трапляється
    // особливо в React.StrictMode, де ефект монтується двічі поспіль.
    const channelName = `room-${activeRoomId}-${Math.random().toString(36).slice(2, 10)}`;

    const channel = supabase
      .channel(channelName)
      .on<RollInsertRow>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rolls', filter: `room_id=eq.${activeRoomId}` },
        (payload) => {
          const row = payload.new;
          if (row.profile_id === profile.id) return;

          const room = roomsRef.current.find((r) => r.id === activeRoomId);
          const isFirstRollToday = !room?.rolledTodayMemberIds.includes(row.profile_id);

          setRooms((prev) =>
            prev.map((r) => {
              if (r.id !== activeRoomId) return r;
              const newRolledIds = r.rolledTodayMemberIds.includes(row.profile_id)
                ? r.rolledTodayMemberIds
                : [...r.rolledTodayMemberIds, row.profile_id];
              const newMembers = r.members.map((m) =>
                m.id === row.profile_id
                  ? { ...m, todayResult: { title: row.result_title, emoji: row.result_emoji, rarity: row.rarity } }
                  : m
              );
              return { ...r, rolledTodayMemberIds: newRolledIds, members: newMembers };
            })
          );

          if (isFirstRollToday) {
            setNewlyArrivedMemberIds((prev) => [...prev, row.profile_id]);
            window.setTimeout(() => {
              setNewlyArrivedMemberIds((prev) => prev.filter((id) => id !== row.profile_id));
            }, 1500);
          }

          showToast('Хтось щойно кинув кубик 🎲');
        }
      )
      .on<RoomStreakRow>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${activeRoomId}` },
        (payload) => {
          const row = payload.new;
          setRooms((prev) => prev.map((r) => (r.id === row.id ? { ...r, streak: row.streak } : r)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setNewlyArrivedMemberIds([]);
    };
  }, [activeRoomId, profile.id]);

  async function handleCreateRoom(name: string, themeId: ThemeId) {
    const room = await createRoom(profile.id, name, themeId);
    setRooms((prev) => [...prev, room]);
    setActiveRoomId(room.id);
  }

  async function handleRoomRoll(roomId: string) {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    const state = roomRollStates[roomId] ?? EMPTY_ROLL_STATE;
    if (rollsRemaining(state) <= 0) return;

    const result = rollForTheme(room.themeId);
    try {
      await recordRoll(roomId, profile.id, result);
    } catch {
      showToast('Не вдалося зберегти кидок 😢');
      return;
    }

    setRoomRollStates((prev) => ({ ...prev, [roomId]: { ...state, freeUsed: state.freeUsed + 1 } }));
    setRoomResults((prev) => ({ ...prev, [roomId]: result }));

    const alreadyRolledToday = room.rolledTodayMemberIds.includes(profile.id);
    const newRolledIds = alreadyRolledToday ? room.rolledTodayMemberIds : [...room.rolledTodayMemberIds, profile.id];
    const completesStreak = !alreadyRolledToday && newRolledIds.length === room.members.length;
    const newStreak = completesStreak ? room.streak + 1 : room.streak;

    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        const newMembers = r.members.map((m) =>
          m.id === profile.id
            ? { ...m, todayResult: { title: result.title, emoji: result.emoji, rarity: result.rarity } }
            : m
        );
        return { ...r, rolledTodayMemberIds: newRolledIds, streak: newStreak, members: newMembers };
      })
    );

    if (completesStreak) {
      setJustCompletedStreakRoomId(roomId);
      window.setTimeout(() => setJustCompletedStreakRoomId(null), 4000);
      updateRoomStreak(roomId, newStreak).catch(() => showToast('Не вдалося оновити вогник кімнати 😢'));
    }
  }

  function handleSoloRoll() {
    if (rollsRemaining(soloRollState) <= 0) return;
    const result = rollForTheme(soloTheme);
    setSoloRollState((prev) => ({ ...prev, freeUsed: prev.freeUsed + 1 }));
    setSoloResult(result);
  }

  async function handleRoomThemeChange(roomId: string, themeId: ThemeId) {
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, themeId } : r)));
    setRoomResults((prev) => ({ ...prev, [roomId]: null }));
    try {
      await updateRoomTheme(roomId, themeId);
    } catch {
      showToast('Не вдалося змінити тему кімнати 😢');
    }
  }

  async function handleUpdateRoomDetails(roomId: string, name: string, icon: string) {
    await updateRoomDetails(roomId, name, icon);
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, name, icon } : r)));
  }

  async function handleRemoveMember(roomId: string, profileId: string) {
    await removeMemberFromRoom(roomId, profileId);
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? {
              ...r,
              members: r.members.filter((m) => m.id !== profileId),
              rolledTodayMemberIds: r.rolledTodayMemberIds.filter((id) => id !== profileId),
            }
          : r
      )
    );
  }

  async function handleDeleteRoom(roomId: string) {
    await deleteRoom(roomId);
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  }

  function confirmAd() {
    if (!adModal) return;
    if (adModal.context === 'solo') {
      setSoloRollState((prev) => ({ ...prev, extra: prev.extra + adModal.reward }));
    } else {
      const roomId = adModal.context;
      setRoomRollStates((prev) => ({
        ...prev,
        [roomId]: {
          ...(prev[roomId] ?? EMPTY_ROLL_STATE),
          extra: (prev[roomId]?.extra ?? 0) + adModal.reward,
        },
      }));
    }
    setAdModal(null);
  }

  const activeRoom = activeRoomId ? rooms.find((r) => r.id === activeRoomId) ?? null : null;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-header__title">🎲 Хто ти сьогодні</h1>
        <span className="app-header__nickname">Привіт, {profile.nickname}!</span>
        <NavTabs
          active={mainView}
          onChange={(view) => {
            setMainView(view);
            setActiveRoomId(null);
          }}
        />
      </header>

      <main className="app-main">
        {mainView === 'rooms' && !activeRoom && (
          <RoomsList
            rooms={rooms}
            loading={roomsLoading}
            currentProfileId={profile.id}
            onOpenRoom={setActiveRoomId}
            onCreateRoom={handleCreateRoom}
          />
        )}

        {mainView === 'rooms' && activeRoom && (
          <RoomView
            room={activeRoom}
            currentProfileId={profile.id}
            rollState={roomRollStates[activeRoom.id] ?? EMPTY_ROLL_STATE}
            lastResult={roomResults[activeRoom.id] ?? null}
            onRoll={() => handleRoomRoll(activeRoom.id)}
            onWatchAd={(reward) => setAdModal({ context: activeRoom.id, reward })}
            onBack={() => setActiveRoomId(null)}
            onShare={showToast}
            onChangeTheme={(themeId) => handleRoomThemeChange(activeRoom.id, themeId)}
            onUpdateRoomDetails={(name, icon) => handleUpdateRoomDetails(activeRoom.id, name, icon)}
            onRemoveMember={(profileId) => handleRemoveMember(activeRoom.id, profileId)}
            onDeleteRoom={() => handleDeleteRoom(activeRoom.id)}
            justCompletedStreak={justCompletedStreakRoomId === activeRoom.id}
            newlyArrivedMemberIds={newlyArrivedMemberIds}
          />
        )}

        {mainView === 'solo' && (
          <SoloRoll
            themeId={soloTheme}
            onThemeChange={(themeId) => {
              setSoloTheme(themeId);
              setSoloResult(null);
            }}
            rollState={soloRollState}
            lastResult={soloResult}
            onRoll={handleSoloRoll}
            onWatchAd={(reward) => setAdModal({ context: 'solo', reward })}
            onShare={showToast}
          />
        )}

        {mainView === 'collection' && <CollectionView />}
      </main>

      {adModal && <AdModal reward={adModal.reward} onClose={() => setAdModal(null)} onConfirm={confirmAd} />}
      {toast && <Toast message={toast} />}
    </div>
  );
}
