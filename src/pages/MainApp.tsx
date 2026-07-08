import { useEffect, useMemo, useRef, useState } from 'react';
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
  recoverStreak,
} from '../lib/rooms';
import { fetchMyRollsToday, fetchSoloRollsToday, recordRoll } from '../lib/rolls';
import { completeSoloQuest, fetchSoloStreakInfo } from '../lib/profile';
import { fetchReactionsForRolls, summarizeReactions, toggleReaction } from '../lib/reactions';
import type { ReactionRow } from '../lib/reactions';
import { todayDateString } from '../lib/date';
import { supabase } from '../lib/supabase';
import NavTabs, { type MainView } from '../components/NavTabs';
import RoomsList from '../components/RoomsList';
import RoomView from '../components/RoomView';
import CollectionView from '../components/CollectionView';
import SoloRoll from '../components/SoloRoll';
import AdModal from '../components/AdModal';
import Toast from '../components/Toast';

const EMPTY_ROLL_STATE: RollLimitState = { freeUsed: 0, extra: 0 };

type AdRequest =
  | { kind: 'rollBonus'; context: string | 'solo'; reward: 1 | 3 }
  | { kind: 'streakRecovery'; roomId: string; streakValue: number };

interface RollInsertRow {
  id: string;
  room_id: string;
  profile_id: string;
  result_title: string;
  result_emoji: string;
  rarity: Rarity;
}

interface RoomStreakRow {
  id: string;
  streak: number;
  broken_streak_value: number | null;
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
  const [soloCompletedThemeIds, setSoloCompletedThemeIds] = useState<ThemeId[]>([]);
  const [soloStreak, setSoloStreak] = useState(0);
  const [soloStreakUpdatedAt, setSoloStreakUpdatedAt] = useState<string | null>(null);
  const [soloHistory, setSoloHistory] = useState<RollResult[]>([]);

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

  const activeRoomRollIdsKey = useMemo(() => {
    const room = rooms.find((r) => r.id === activeRoomId);
    if (!room) return '';
    return room.members
      .map((m) => m.todayResult?.rollId)
      .filter((id): id is string => !!id)
      .sort()
      .join(',');
  }, [rooms, activeRoomId]);

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
    let cancelled = false;
    Promise.all([fetchSoloRollsToday(profile.id), fetchSoloStreakInfo(profile.id)])
      .then(([today, streakInfo]) => {
        if (cancelled) return;
        setSoloRollState({ freeUsed: today.count, extra: 0 });
        setSoloCompletedThemeIds(today.completedThemeIds);
        if (today.lastResult) setSoloResult(today.lastResult);
        setSoloStreak(streakInfo.streak);
        setSoloStreakUpdatedAt(streakInfo.updatedAt);
        setSoloHistory(today.history);
      })
      .catch(() => showToast('Не вдалося завантажити соло-прогрес 😢'));
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

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
                  ? {
                      ...m,
                      todayResult: {
                        rollId: row.id,
                        title: row.result_title,
                        emoji: row.result_emoji,
                        rarity: row.rarity,
                        reactions: [],
                      },
                    }
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
          setRooms((prev) =>
            prev.map((r) =>
              r.id === row.id ? { ...r, streak: row.streak, brokenStreakValue: row.broken_streak_value } : r
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setNewlyArrivedMemberIds([]);
    };
  }, [activeRoomId, profile.id]);

  useEffect(() => {
    if (!activeRoomId || !activeRoomRollIdsKey) return;
    const rollIds = activeRoomRollIdsKey.split(',');

    function applyReactionRows(rows: ReactionRow[]) {
      setRooms((prev) =>
        prev.map((r) => {
          if (r.id !== activeRoomId) return r;
          const newMembers = r.members.map((m) =>
            m.todayResult
              ? { ...m, todayResult: { ...m.todayResult, reactions: summarizeReactions(rows, m.todayResult.rollId, profile.id) } }
              : m
          );
          return { ...r, members: newMembers };
        })
      );
    }

    const channelName = `reactions-${activeRoomId}-${Math.random().toString(36).slice(2, 10)}`;

    const channel = supabase
      .channel(channelName)
      .on<{ id: string; roll_id: string; reactor_id: string; emoji: string }>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reactions', filter: `roll_id=in.(${rollIds.join(',')})` },
        (payload) => {
          const row = payload.new;
          if (row.reactor_id === profile.id) return; // власна дія вже застосована оптимістично

          setRooms((prev) =>
            prev.map((r) => {
              if (r.id !== activeRoomId) return r;
              const newMembers = r.members.map((m) => {
                if (!m.todayResult || m.todayResult.rollId !== row.roll_id) return m;
                const existing = m.todayResult.reactions;
                const idx = existing.findIndex((e) => e.emoji === row.emoji);
                const newReactions =
                  idx === -1
                    ? [...existing, { emoji: row.emoji, count: 1, reactedByMe: false }]
                    : existing.map((e, i) => (i === idx ? { ...e, count: e.count + 1 } : e));
                return { ...m, todayResult: { ...m.todayResult, reactions: newReactions } };
              });
              return { ...r, members: newMembers };
            })
          );
        }
      )
      .on(
        // DELETE-подія для reactions за замовчуванням не містить roll_id/emoji
        // (REPLICA IDENTITY = тільки первинний ключ), тому фільтр по roll_id
        // для DELETE не спрацює — підписуємось без фільтра й перевибираємо
        // реакції кімнати напряму.
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'reactions' },
        () => {
          fetchReactionsForRolls(rollIds)
            .then(applyReactionRows)
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoomId, activeRoomRollIdsKey, profile.id]);

  async function handleToggleReaction(roomId: string, rollId: string, emoji: string) {
    try {
      const action = await toggleReaction(rollId, profile.id, emoji);
      setRooms((prev) =>
        prev.map((r) => {
          if (r.id !== roomId) return r;
          const newMembers = r.members.map((m) => {
            if (!m.todayResult || m.todayResult.rollId !== rollId) return m;
            const existing = m.todayResult.reactions;
            let newReactions;
            if (action === 'added') {
              const idx = existing.findIndex((e) => e.emoji === emoji);
              newReactions =
                idx === -1
                  ? [...existing, { emoji, count: 1, reactedByMe: true }]
                  : existing.map((e, i) => (i === idx ? { ...e, count: e.count + 1, reactedByMe: true } : e));
            } else {
              newReactions = existing
                .map((e) => (e.emoji === emoji ? { ...e, count: e.count - 1, reactedByMe: false } : e))
                .filter((e) => e.count > 0);
            }
            return { ...m, todayResult: { ...m.todayResult, reactions: newReactions } };
          });
          return { ...r, members: newMembers };
        })
      );
    } catch {
      showToast('Не вдалося поставити реакцію 😢');
    }
  }

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
    let rollId: string;
    try {
      rollId = await recordRoll(roomId, profile.id, result);
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
            ? {
                ...m,
                todayResult: { rollId, title: result.title, emoji: result.emoji, rarity: result.rarity, reactions: [] },
              }
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

  async function handleSoloRoll() {
    if (rollsRemaining(soloRollState) <= 0) return;
    const result = rollForTheme(soloTheme);
    try {
      await recordRoll(null, profile.id, result);
    } catch {
      showToast('Не вдалося зберегти кидок 😢');
      return;
    }

    setSoloRollState((prev) => ({ ...prev, freeUsed: prev.freeUsed + 1 }));
    setSoloResult(result);
    setSoloHistory((prev) => [result, ...prev]);

    const alreadyCompletedTheme = soloCompletedThemeIds.includes(soloTheme);
    const newCompletedThemeIds = alreadyCompletedTheme ? soloCompletedThemeIds : [...soloCompletedThemeIds, soloTheme];
    setSoloCompletedThemeIds(newCompletedThemeIds);

    const justCompletedQuest =
      !alreadyCompletedTheme && soloCompletedThemeIds.length === 3 && newCompletedThemeIds.length === 4;

    if (justCompletedQuest && soloStreakUpdatedAt !== todayDateString()) {
      try {
        const newStreak = await completeSoloQuest(profile.id, soloStreak, soloStreakUpdatedAt);
        setSoloStreak(newStreak);
        setSoloStreakUpdatedAt(todayDateString());
        showToast(`Денний квест виконано! Соло-стрік: ${newStreak} 🔥`);
      } catch {
        showToast('Не вдалося оновити соло-стрік 😢');
      }
    }
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

  async function confirmAd() {
    if (!adModal) return;

    if (adModal.kind === 'streakRecovery') {
      const { roomId, streakValue } = adModal;
      setAdModal(null);
      try {
        await recoverStreak(roomId, streakValue);
        setRooms((prev) =>
          prev.map((r) => (r.id === roomId ? { ...r, streak: streakValue, brokenStreakValue: null } : r))
        );
        showToast(`Вогник відновлено до ${streakValue}! 🔥`);
      } catch {
        showToast('Не вдалося відновити вогник 😢');
      }
      return;
    }

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
            onWatchAd={(reward) => setAdModal({ kind: 'rollBonus', context: activeRoom.id, reward })}
            onBack={() => setActiveRoomId(null)}
            onShare={showToast}
            onChangeTheme={(themeId) => handleRoomThemeChange(activeRoom.id, themeId)}
            onUpdateRoomDetails={(name, icon) => handleUpdateRoomDetails(activeRoom.id, name, icon)}
            onRemoveMember={(profileId) => handleRemoveMember(activeRoom.id, profileId)}
            onDeleteRoom={() => handleDeleteRoom(activeRoom.id)}
            onRecoverStreak={() => {
              if (activeRoom.brokenStreakValue === null) return;
              setAdModal({ kind: 'streakRecovery', roomId: activeRoom.id, streakValue: activeRoom.brokenStreakValue });
            }}
            justCompletedStreak={justCompletedStreakRoomId === activeRoom.id}
            newlyArrivedMemberIds={newlyArrivedMemberIds}
            onToggleReaction={(rollId, emoji) => handleToggleReaction(activeRoom.id, rollId, emoji)}
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
            onWatchAd={(reward) => setAdModal({ kind: 'rollBonus', context: 'solo', reward })}
            onShare={showToast}
            completedThemeIds={soloCompletedThemeIds}
            streak={soloStreak}
            history={soloHistory}
          />
        )}

        {mainView === 'collection' && <CollectionView />}
      </main>

      {adModal && (
        <AdModal
          reward={adModal.kind === 'rollBonus' ? adModal.reward : 0}
          confirmLabel={adModal.kind === 'streakRecovery' ? 'Готово, відновити вогник 🔥' : undefined}
          onClose={() => setAdModal(null)}
          onConfirm={confirmAd}
        />
      )}
      {toast && <Toast message={toast} />}
    </div>
  );
}
