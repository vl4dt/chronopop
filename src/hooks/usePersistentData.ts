import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useSync } from '../context/SyncContext';
import { Doc, Id } from '../../convex/_generated/dataModel';

// --- Alarms ---

export const usePersistentAlarms = () => {
  const { syncCode, isSyncActive } = useSync();
  const convexAlarms = useQuery(api.db.getAlarms, { deviceId: syncCode });
  const [localAlarms, setLocalAlarms] = useState<any[]>([]);

  // Load local data
  useEffect(() => {
    if (!isSyncActive) {
      AsyncStorage.getItem('@alarms').then(data => {
        if (data) {
          const parsed = JSON.parse(data);
          setLocalAlarms(parsed.map((a: any) => ({ ...a, _id: a._id || a.id })));
        }
      });
    }
  }, [isSyncActive]);

  const saveLocal = async (newData: any[]) => {
    setLocalAlarms(newData);
    await AsyncStorage.setItem('@alarms', JSON.stringify(newData));
  };

  const createAlarm = useMutation(api.db.createAlarm);
  const updateAlarm = useMutation(api.db.updateAlarm);
  const deleteAlarm = useMutation(api.db.deleteAlarm);

  if (isSyncActive) {
    return {
      alarms: convexAlarms || [],
      create: (args: any) => createAlarm(args),
      update: (args: any) => updateAlarm(args),
      remove: (args: any) => deleteAlarm(args),
    };
  }

  return {
    alarms: localAlarms,
    create: async (args: any) => {
      const newAlarm = { ...args, _id: Math.random().toString(), _creationTime: Date.now() };
      await saveLocal([...localAlarms, newAlarm]);
      return newAlarm._id;
    },
    update: async (args: any) => {
      const next = localAlarms.map(a => a._id === args.id ? { ...a, ...args } : a);
      await saveLocal(next);
    },
    remove: async (args: any) => {
      const next = localAlarms.filter(a => a._id !== args.id);
      await saveLocal(next);
    }
  };
};

// --- Stopwatches ---

export const usePersistentStopwatches = () => {
  const { syncCode, isSyncActive } = useSync();
  const convexStopwatches = useQuery(api.db.getStopwatches, { deviceId: syncCode });
  const [localStopwatches, setLocalStopwatches] = useState<any[]>([]);

  useEffect(() => {
    if (!isSyncActive) {
      AsyncStorage.getItem('@stopwatches').then(data => {
        if (data) {
          const parsed = JSON.parse(data);
          setLocalStopwatches(parsed.map((s: any) => ({ ...s, _id: s._id || s.id })));
        }
      });
    }
  }, [isSyncActive]);

  const saveLocal = async (newData: any[]) => {
    setLocalStopwatches(newData);
    await AsyncStorage.setItem('@stopwatches', JSON.stringify(newData));
  };

  const create = useMutation(api.db.createStopwatch);
  const remove = useMutation(api.db.deleteStopwatch);
  const toggle = useMutation(api.db.toggleStopwatch);
  const reset = useMutation(api.db.resetStopwatch);
  const addLap = useMutation(api.db.addStopwatchLap);
  const update = useMutation(api.db.updateStopwatch);

  if (isSyncActive) {
    return {
      stopwatches: convexStopwatches || [],
      create: (args: any) => create(args),
      remove: (args: any) => remove(args),
      toggle: (args: any) => toggle(args),
      reset: (args: any) => reset(args),
      addLap: (args: any) => addLap(args),
      update: (args: any) => update(args),
    };
  }

  return {
    stopwatches: localStopwatches,
    create: async (args: any) => {
      const sw = { ...args, _id: Math.random().toString(), _creationTime: Date.now(), isRunning: false, baseTimeMs: 0 };
      await saveLocal([...localStopwatches, sw]);
    },
    remove: async (args: any) => {
      const next = localStopwatches.filter(s => s._id !== args.id);
      await saveLocal(next);
    },
    toggle: async ({ id, isRunning }: { id: string, isRunning: boolean }) => {
      const now = Date.now();
      const next = localStopwatches.map(s => {
        if (s._id !== id) return s;
        if (isRunning) {
          return { ...s, isRunning: true, startTimeMs: now };
        } else {
          const elapsed = s.startTimeMs ? now - s.startTimeMs : 0;
          return { ...s, isRunning: false, baseTimeMs: s.baseTimeMs + elapsed, startTimeMs: undefined };
        }
      });
      await saveLocal(next);
    },
    reset: async ({ id }: { id: string }) => {
      const next = localStopwatches.map(s => s._id === id ? { ...s, isRunning: false, baseTimeMs: 0, startTimeMs: undefined } : s);
      await saveLocal(next);
    },
    addLap: async ({ stopwatchId, timeMs }: { stopwatchId: string, timeMs: number }) => {
      // For local laps, we'd need another storage key or embed them. Let's embed for simplicity locally.
      const next = localStopwatches.map(s => {
        if (s._id !== stopwatchId) return s;
        const laps = s.laps || [];
        return { ...s, laps: [{ _id: Math.random().toString(), timeMs, timestamp: Date.now() }, ...laps] };
      });
      await saveLocal(next);
    },
    update: async (args: any) => {
      const next = localStopwatches.map(s => s._id === args.id ? { ...s, ...args } : s);
      await saveLocal(next);
    }
  };
};

// --- Timers ---

export const usePersistentTimers = () => {
  const { syncCode, isSyncActive } = useSync();
  const convexTimers = useQuery(api.db.getTimers, { deviceId: syncCode });
  const [localTimers, setLocalTimers] = useState<any[]>([]);

  useEffect(() => {
    if (!isSyncActive) {
      AsyncStorage.getItem('@timers').then(data => {
        if (data) {
          const parsed = JSON.parse(data);
          setLocalTimers(parsed.map((t: any) => ({ ...t, _id: t._id || t.id })));
        }
      });
    }
  }, [isSyncActive]);

  const saveLocal = async (newData: any[]) => {
    setLocalTimers(newData);
    await AsyncStorage.setItem('@timers', JSON.stringify(newData));
  };

  const create = useMutation(api.db.createTimer);
  const remove = useMutation(api.db.deleteTimer);
  const toggle = useMutation(api.db.toggleTimer);
  const reset = useMutation(api.db.resetTimer);
  const update = useMutation(api.db.updateTimer);

  if (isSyncActive) {
    return {
      timers: convexTimers || [],
      create: (args: any) => create(args),
      remove: (args: any) => remove(args),
      toggle: (args: any) => toggle(args),
      reset: (args: any) => reset(args),
      update: (args: any) => update(args),
    };
  }

  return {
    timers: localTimers,
    create: async (args: any) => {
      const tm = { ...args, _id: Math.random().toString(), isRunning: false, baseTimeMs: args.durationMs, isFinished: false };
      await saveLocal([...localTimers, tm]);
    },
    remove: async (args: any) => {
      const next = localTimers.filter(t => t._id !== args.id);
      await saveLocal(next);
    },
    toggle: async ({ id, isRunning }: { id: string, isRunning: boolean }) => {
      const now = Date.now();
      const next = localTimers.map(t => {
        if (t._id !== id) return t;
        if (isRunning) {
          return { ...t, isRunning: true, startTimeMs: now };
        } else {
          const elapsed = t.startTimeMs ? now - t.startTimeMs : 0;
          return { ...t, isRunning: false, baseTimeMs: Math.max(0, t.baseTimeMs - elapsed), startTimeMs: undefined };
        }
      });
      await saveLocal(next);
    },
    reset: async ({ id }: { id: string }) => {
      const next = localTimers.map(t => t._id === id ? { ...t, isRunning: false, baseTimeMs: t.durationMs, startTimeMs: undefined, isFinished: false } : t);
      await saveLocal(next);
    },
    update: async (args: any) => {
      const next = localTimers.map(t => t._id === args.id ? { ...t, ...args } : t);
      await saveLocal(next);
    }
  };
};
// --- World Clocks ---

export const usePersistentWorldClocks = () => {
  const { syncCode, isSyncActive } = useSync();
  const convexClocks = useQuery(api.db.getWorldClocks, { deviceId: syncCode });
  const [localClocks, setLocalClocks] = useState<any[]>([]);

  useEffect(() => {
    if (!isSyncActive) {
      AsyncStorage.getItem('@world_clocks').then(data => {
        if (data) {
          const parsed = JSON.parse(data);
          setLocalClocks(parsed.map((c: any) => ({ ...c, _id: c._id || c.id })));
        }
      });
    }
  }, [isSyncActive]);

  const saveLocal = async (newData: any[]) => {
    setLocalClocks(newData);
    await AsyncStorage.setItem('@world_clocks', JSON.stringify(newData));
  };

  const create = useMutation(api.db.createWorldClock);
  const remove = useMutation(api.db.deleteWorldClock);
  const update = useMutation(api.db.updateWorldClock);
  const reorder = useMutation(api.db.reorderWorldClocks);

  if (isSyncActive) {
    return {
      clocks: convexClocks || [],
      create: (args: any) => create(args),
      remove: (args: any) => remove(args),
      update: (args: any) => update(args),
      reorder: (args: any) => reorder(args),
    };
  }

  return {
    clocks: localClocks,
    create: async (args: any) => {
      const clock = { ...args, _id: Math.random().toString(), _creationTime: Date.now() };
      await saveLocal([...localClocks, clock]);
    },
    remove: async (args: any) => {
      const next = localClocks.filter(c => c._id !== args.id);
      await saveLocal(next);
    },
    update: async (args: any) => {
      const next = localClocks.map(c => c._id === args.id ? { ...c, ...args } : c);
      await saveLocal(next);
    },
    reorder: async ({ shifts }: { shifts: { id: string, order: number }[] }) => {
      // Very basic local reorder
      const next = [...localClocks];
      shifts.forEach(s => {
        const idx = next.findIndex(c => c._id === s.id);
        if (idx !== -1) next[idx].order = s.order;
      });
      await saveLocal(next.sort((a, b) => a.order - b.order));
    }
  };
};
// --- Profiles ---

export const usePersistentProfiles = () => {
  const { syncCode, isSyncActive } = useSync();
  const convexProfiles = useQuery(api.db.getProfiles, { deviceId: syncCode });
  const [localProfiles, setLocalProfiles] = useState<any[]>([]);

  useEffect(() => {
    if (!isSyncActive) {
      AsyncStorage.getItem('@profiles').then(async (data) => {
        if (data) {
          const parsed = JSON.parse(data);
          setLocalProfiles(parsed.map((p: any) => ({ ...p, _id: p._id || p.id })));
        } else {
          const defaults = [
            { _id: 'p1', name: 'Me', type: 'Person', colorKey: 'sapphire' },
            { _id: 'p2', name: 'Luna (Cat)', type: 'Pet', colorKey: 'rosewater' },
          ];
          setLocalProfiles(defaults);
          await AsyncStorage.setItem('@profiles', JSON.stringify(defaults));
        }
      });
    }
  }, [isSyncActive]);

  const saveLocal = async (newData: any[]) => {
    setLocalProfiles(newData);
    await AsyncStorage.setItem('@profiles', JSON.stringify(newData));
  };

  const create = useMutation(api.db.createProfile);
  const remove = useMutation(api.db.removeProfile);
  const update = useMutation(api.db.updateProfile);

  if (isSyncActive) {
    return {
      profiles: convexProfiles || [],
      create: (args: any) => create(args),
      remove: (args: any) => remove(args),
      update: (args: any) => update(args),
    };
  }

  return {
    profiles: localProfiles,
    create: async (args: any) => {
      const p = { ...args, _id: Math.random().toString(), _creationTime: Date.now() };
      await saveLocal([...localProfiles, p]);
      return p._id;
    },
    remove: async (args: any) => {
      const next = localProfiles.filter(p => p._id !== args.id);
      await saveLocal(next);
    },
    update: async (args: any) => {
      const next = localProfiles.map(p => p._id === args.id ? { ...p, ...args } : p);
      await saveLocal(next);
    }
  };
};

// --- Reminders ---

export const usePersistentReminders = () => {
  const { syncCode, isSyncActive } = useSync();
  const convexReminders = useQuery(api.db.getReminders, { deviceId: syncCode });
  const [localReminders, setLocalReminders] = useState<any[]>([]);

  useEffect(() => {
    if (!isSyncActive) {
      AsyncStorage.getItem('@reminders').then(async (data) => {
        if (data) {
          const parsed = JSON.parse(data);
          setLocalReminders(parsed.map((r: any) => ({ ...r, _id: r._id || r.id })));
        } else {
          const defaults = [
            { _id: 'r1', profileId: 'p1', title: 'Stretch / Yoga', timeHour: 8, timeMinute: 0, durationMinutes: 15, completedToday: false },
            { _id: 'r2', profileId: 'p2', title: 'Heartworm Pill', timeHour: 10, timeMinute: 0, completedToday: true },
            { _id: 'r3', profileId: 'p2', title: 'Nebulizer Therapy', timeHour: 18, timeMinute: 30, durationMinutes: 10, completedToday: false },
          ];
          setLocalReminders(defaults);
          await AsyncStorage.setItem('@reminders', JSON.stringify(defaults));
        }
      });
    }
  }, [isSyncActive]);

  const saveLocal = async (newData: any[]) => {
    setLocalReminders(newData);
    await AsyncStorage.setItem('@reminders', JSON.stringify(newData));
  };

  const save = useMutation(api.db.saveReminder);
  const remove = useMutation(api.db.deleteReminder);
  const update = useMutation(api.db.updateReminder);
  const markComplete = useMutation(api.db.markReminderComplete);

  if (isSyncActive) {
    return {
      reminders: convexReminders || [],
      create: (args: any) => save(args),
      remove: (args: any) => remove(args),
      update: (args: any) => update(args),
      markComplete: (args: any) => markComplete(args),
    };
  }

  return {
    reminders: localReminders,
    create: async (args: any) => {
      const r = { ...args, _id: Math.random().toString(), _creationTime: Date.now(), completedToday: false };
      await saveLocal([...localReminders, r]);
      return r._id;
    },
    remove: async (args: any) => {
      const next = localReminders.filter(r => r._id !== args.id);
      await saveLocal(next);
    },
    update: async (args: any) => {
      const next = localReminders.map(r => r._id === args.id ? { ...r, ...args } : r);
      await saveLocal(next);
    },
    markComplete: async ({ id, completed }: { id: string, completed: boolean, deviceId?: string }) => {
      const next = localReminders.map(r => r._id === id ? { ...r, completedToday: completed } : r);
      await saveLocal(next);
    }
  };
};
