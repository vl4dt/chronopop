import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceSyncCode } from '../utils/sync';
import { api } from '../../convex/_generated/api';
import { useQuery } from 'convex/react';

interface SyncContextType {
  syncCode: string;
  isPro: boolean;
  isSyncActive: boolean;
  clockOffset: number;
  setSyncCode: (code: string) => Promise<void>;
  upgradeToPro: () => Promise<void>;
  downgradeFromPro: () => void;
  toggleSync: (active: boolean) => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  syncCode: '',
  isPro: false,
  isSyncActive: false,
  clockOffset: 0,
  setSyncCode: async () => {},
  upgradeToPro: async () => {},
  downgradeFromPro: () => {},
  toggleSync: async () => {},
});

export const useSync = () => useContext(SyncContext);

export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const [syncCode, setSyncCodeState] = useState('');
  const [isPro, setIsPro] = useState(false);
  const [isSyncActive, setIsSyncActive] = useState(false);
  const [clockOffset, setClockOffset] = useState(0);

  const serverTime = useQuery(api.db.getServerTime);

  useEffect(() => {
    if (serverTime) {
      setClockOffset(serverTime - Date.now());
    }
  }, [serverTime]);

  useEffect(() => {
    const init = async () => {
      const code = await getDeviceSyncCode();
      setSyncCodeState(code);
      
      const [proStatus, syncStatus] = await Promise.all([
        AsyncStorage.getItem('@pro_status'),
        AsyncStorage.getItem('@is_sync_active')
      ]);

      if (proStatus === 'true') setIsPro(true);
      // Sync is only active for Pro users who have enabled it
      if (proStatus === 'true' && syncStatus === 'true') {
        setIsSyncActive(true);
      } else {
        setIsSyncActive(false);
      }
    };
    init();
  }, []);

  const setSyncCode = useCallback(async (code: string) => {
    const normalized = code.toUpperCase();
    await AsyncStorage.setItem('@sync_code', normalized);
    setSyncCodeState(normalized);
  }, []);

  const upgradeToPro = useCallback(async () => {
    await AsyncStorage.setItem('@pro_status', 'true');
    setIsPro(true);
  }, []);

  const downgradeFromPro = useCallback(() => {
    AsyncStorage.multiSet([
      ['@pro_status', 'false'],
      ['@is_sync_active', 'false']
    ]);
    setIsPro(false);
    setIsSyncActive(false);
  }, []);

  const toggleSync = useCallback(async (active: boolean) => {
    if (!isPro && active) {
      throw new Error("Pro subscription required for Cloud Sync");
    }
    await AsyncStorage.setItem('@is_sync_active', active ? 'true' : 'false');
    setIsSyncActive(active);
  }, [isPro]);

  return (
    <SyncContext.Provider value={{ 
      syncCode, 
      isPro, 
      isSyncActive, 
      clockOffset, 
      setSyncCode, 
      upgradeToPro, 
      downgradeFromPro,
      toggleSync 
    }}>
      {children}
    </SyncContext.Provider>
  );
};
