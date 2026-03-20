import { useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useSync } from '../context/SyncContext';
import { scheduleAlarmNotification, cancelAlarmNotification, cancelAllAlarmNotifications } from '../utils/NotificationService';

export const useAlarmNotificationSync = () => {
  const { syncCode, isPremiumSync } = useSync();
  const alarms = useQuery(api.db.getAlarms, { deviceId: syncCode });
  const previousAlarmsRef = useRef<string>('');

  useEffect(() => {
    if (!alarms || !isPremiumSync) return;

    const alarmsJson = JSON.stringify(alarms);
    if (alarmsJson === previousAlarmsRef.current) return;
    previousAlarmsRef.current = alarmsJson;

    const sync = async () => {
      // Simple approach: cancel all and re-schedule all active
      // For more efficiency, we could diff them, but safety first
      await cancelAllAlarmNotifications();
      
      for (const alarm of alarms) {
        if (alarm.enabled) {
          const fireDate = new Date(alarm.timeUnixMs);
          // If the time is in the past for today, schedule for tomorrow (if repeats)
          // Actually NotificationService handleDaily takes care of it usually
          await scheduleAlarmNotification({
            id: alarm._id,
            title: '⏰ Chronopop Alarm',
            body: `It's time! your alarm is going off!`,
            fireDate,
            repeatsDaily: true,
          });
        }
      }
    };

    sync();
  }, [alarms, isPremiumSync]);
};
