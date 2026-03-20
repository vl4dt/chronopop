import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useSync } from '../context/SyncContext';

export const useDataMigration = () => {
  const { isSyncActive, syncCode, isPro } = useSync();
  const [isMigrating, setIsMigrating] = useState(false);

  const createAlarm = useMutation(api.db.createAlarm);
  const createStopwatch = useMutation(api.db.createStopwatch);
  const createTimer = useMutation(api.db.createTimer);
  const createWorldClock = useMutation(api.db.createWorldClock);
  const createProfile = useMutation(api.db.createProfile);
  const saveReminder = useMutation(api.db.saveReminder);
  const addStopwatchLap = useMutation(api.db.addStopwatchLap);

  useEffect(() => {
    const migrate = async () => {
      // Only migrate if sync is active, user is Pro, and we haven't migrated yet
      const migrated = await AsyncStorage.getItem('@is_data_migrated');
      if (migrated === 'true' || !isSyncActive || !isPro || isMigrating) return;

      setIsMigrating(true);
      console.log('Starting data migration to cloud...');

      try {
        // 1. Alarms
        const alarmsData = await AsyncStorage.getItem('@alarms');
        if (alarmsData) {
          const alarms = JSON.parse(alarmsData);
          for (const alarm of alarms) {
            await createAlarm({
              deviceId: syncCode,
              timeUnixMs: alarm.timeUnixMs || alarm.time,
              enabled: alarm.enabled,
              colorKey: alarm.colorKey,
              missionEnabled: alarm.missionEnabled,
            });
          }
          await AsyncStorage.removeItem('@alarms');
        }

        // 2. Stopwatches
        const swData = await AsyncStorage.getItem('@stopwatches');
        if (swData) {
          const stopwatches = JSON.parse(swData);
          for (const sw of stopwatches) {
            const swId = await createStopwatch({
              deviceId: syncCode,
              name: sw.name,
              colorKey: sw.colorKey,
            });

            if (swId && sw.laps) {
              for (const lap of sw.laps) {
                await addStopwatchLap({
                  stopwatchId: swId as any,
                  timeMs: lap.timeMs,
                });
              }
            }
          }
          await AsyncStorage.removeItem('@stopwatches');
        }

        // 3. Timers
        const timersData = await AsyncStorage.getItem('@timers');
        if (timersData) {
          const timers = JSON.parse(timersData);
          for (const timer of timers) {
            await createTimer({
              deviceId: syncCode,
              name: timer.name,
              durationMs: timer.durationMs,
              colorKey: timer.colorKey,
              isPomodoro: timer.isPomodoro,
              pomodoroWorkMs: timer.pomodoroWorkMs,
              pomodoroBreakMs: timer.pomodoroBreakMs,
            });
          }
          await AsyncStorage.removeItem('@timers');
        }

        // 4. World Clocks
        const clocksData = await AsyncStorage.getItem('@world_clocks');
        if (clocksData) {
          const clocks = JSON.parse(clocksData);
          for (const clock of clocks) {
            await createWorldClock({
              deviceId: syncCode,
              name: clock.name,
              timezone: clock.timezone,
              colorKey: clock.colorKey,
              order: clock.order,
            });
          }
          await AsyncStorage.removeItem('@world_clocks');
        }

        // 5. Profiles & Reminders
        const profilesData = await AsyncStorage.getItem('@profiles');
        const remindersData = await AsyncStorage.getItem('@reminders');
        
        if (profilesData) {
          const profiles = JSON.parse(profilesData);
          const profileIdMap: Record<string, string> = {};

          for (const p of profiles) {
            const cloudId = await createProfile({
              deviceId: syncCode,
              name: p.name,
              type: p.type,
              colorKey: p.colorKey,
            });
            if (cloudId) profileIdMap[p._id || p.id] = cloudId;
          }

          if (remindersData) {
            const reminders = JSON.parse(remindersData);
            for (const r of reminders) {
              const cloudProfileId = profileIdMap[r.profileId];
              if (cloudProfileId) {
                await saveReminder({
                  deviceId: syncCode,
                  profileId: cloudProfileId as any,
                  title: r.title,
                  timeHour: r.timeHour,
                  timeMinute: r.timeMinute,
                  durationMinutes: r.durationMinutes,
                  completedToday: r.completedToday,
                });
              }
            }
            await AsyncStorage.removeItem('@reminders');
          }
          await AsyncStorage.removeItem('@profiles');
        }

        await AsyncStorage.setItem('@is_data_migrated', 'true');
        console.log('Data migration complete.');
      } catch (error) {
        console.error('Migration failed:', error);
      } finally {
        setIsMigrating(false);
      }
    };

    migrate();
  }, [isSyncActive, isPro, syncCode]);

  return { isMigrating };
};
