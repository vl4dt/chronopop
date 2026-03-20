import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceSyncCode } from '../utils/sync';
import { api } from '../../convex/_generated/api';
import { useQuery } from 'convex/react';

interface SyncContextType {
  syncCode: string;
  isPro: boolean;
  clockOffset: number;
  setSyncCode: (code: string) => Promise<void>;
  upgradeToPro: () => Promise<void>;
  downgradeFromPro: () => void;
}

const SyncContext = createContext<SyncContextType>({
  syncCode: '',
  isPro: false,
  clockOffset: 0,
  setSyncCode: async () => {},
  upgradeToPro: async () => {},
  downgradeFromPro: () => {},
});

export const useSync = () => useContext(SyncContext);

export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const [syncCode, setSyncCodeState] = useState('');
  const [isPro, setIsPro] = useState(false);
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
      const proStatus = await AsyncStorage.getItem('@pro_status');
      if (proStatus === 'true') setIsPro(true);
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
    AsyncStorage.setItem('@pro_status', 'false');
    setIsPro(false);
  }, []);

  return (
    <SyncContext.Provider value={{ syncCode, isPro, clockOffset, setSyncCode, upgradeToPro, downgradeFromPro }}>
      {children}
    </SyncContext.Provider>
  );
};
