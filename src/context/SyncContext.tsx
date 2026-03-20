import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceSyncCode } from '../utils/sync';

import { api } from '../../convex/_generated/api';
import { useQuery } from 'convex/react';

interface SyncContextType {
  syncCode: string;
  isPremiumSync: boolean;
  clockOffset: number;
  setSyncCode: (code: string) => Promise<void>;
  enablePremiumSync: () => Promise<void>;
  disablePremiumSync: () => void;
}

const SyncContext = createContext<SyncContextType>({
  syncCode: '',
  isPremiumSync: false,
  clockOffset: 0,
  setSyncCode: async () => {},
  enablePremiumSync: async () => {},
  disablePremiumSync: () => {},
});

export const useSync = () => useContext(SyncContext);

export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const [syncCode, setSyncCodeState] = useState('');
  const [isPremiumSync, setIsPremiumSync] = useState(false);
  const [clockOffset, setClockOffset] = useState(0);

  const serverTime = useQuery(api.db.getServerTime);

  useEffect(() => {
    if (serverTime) {
      // Calculate offset: serverTime - localTime
      // We assume the network latency is negligible for now, or half the RTT
      // Since this is a simple query, it's a good approximation
      setClockOffset(serverTime - Date.now());
    }
  }, [serverTime]);

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
    <SyncContext.Provider value={{ syncCode, isPremiumSync, clockOffset, setSyncCode, enablePremiumSync, disablePremiumSync }}>
      {children}
    </SyncContext.Provider>
  );
};
