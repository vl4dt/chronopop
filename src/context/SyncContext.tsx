import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceSyncCode } from '../utils/sync';

interface SyncContextType {
  syncCode: string;
  isPremiumSync: boolean;
  setSyncCode: (code: string) => Promise<void>;
  enablePremiumSync: () => Promise<void>;
  disablePremiumSync: () => void;
}

const SyncContext = createContext<SyncContextType>({
  syncCode: '',
  isPremiumSync: false,
  setSyncCode: async () => {},
  enablePremiumSync: async () => {},
  disablePremiumSync: () => {},
});

export const useSync = () => useContext(SyncContext);

export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const [syncCode, setSyncCodeState] = useState('');
  const [isPremiumSync, setIsPremiumSync] = useState(false);

  useEffect(() => {
    const init = async () => {
      const code = await getDeviceSyncCode();
      setSyncCodeState(code);
      // Check if premium sync was previously enabled
      const enabled = await AsyncStorage.getItem('@premium_sync_enabled');
      if (enabled === 'true') setIsPremiumSync(true);
    };
    init();
  }, []);

  const setSyncCode = useCallback(async (code: string) => {
    const normalized = code.toUpperCase();
    await AsyncStorage.setItem('@sync_code', normalized);
    setSyncCodeState(normalized);
  }, []);

  const enablePremiumSync = useCallback(async () => {
    await AsyncStorage.setItem('@premium_sync_enabled', 'true');
    setIsPremiumSync(true);
  }, []);

  const disablePremiumSync = useCallback(() => {
    AsyncStorage.setItem('@premium_sync_enabled', 'false');
    setIsPremiumSync(false);
  }, []);

  return (
    <SyncContext.Provider value={{ syncCode, isPremiumSync, setSyncCode, enablePremiumSync, disablePremiumSync }}>
      {children}
    </SyncContext.Provider>
  );
};
