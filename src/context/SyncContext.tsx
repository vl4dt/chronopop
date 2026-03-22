import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateShortCode } from '../utils/sync';
import { Platform, Alert } from 'react-native';

// Constants for trial period
const TRIAL_DURATION_DAYS = 30;
const TRIAL_START_KEY = '@trial_start_date';
const IS_PRO_KEY = '@is_pro_local';

interface SyncContextType {
  syncCode: string;
  isPro: boolean;
  isSyncActive: boolean;
  clockOffset: number;
  hapticsEnabled: boolean;
  trialDaysRemaining: number;
  isTrialExpired: boolean;
  setSyncCode: (code: string) => Promise<void>;
  purchasePackage: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  toggleSync: (active: boolean) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
  resetSyncCode: () => Promise<string>;
  upgradeToPro: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  syncCode: '',
  isPro: false,
  isSyncActive: false,
  clockOffset: 0,
  hapticsEnabled: true,
  trialDaysRemaining: 30,
  isTrialExpired: false,
  setSyncCode: async () => {},
  purchasePackage: async () => {},
  restorePurchases: async () => {},
  toggleSync: async () => {},
  setHapticsEnabled: async () => {},
  resetSyncCode: async () => '',
  upgradeToPro: async () => {},
});

export const useSync = () => useContext(SyncContext);

export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const [syncCode, setSyncCodeState] = useState('');
  const [localIsPro, setLocalIsPro] = useState(false);
  const [isSyncActive, setIsSyncActive] = useState(false);
  const [clockOffset, setClockOffset] = useState(0);
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(TRIAL_DURATION_DAYS);
  const [isTrialExpired, setIsTrialExpired] = useState(false);

  // Calculate effective Pro status: Local purchase OR within trial period
  const isPro = localIsPro || !isTrialExpired;

  // Initialize trial and load saved data
  useEffect(() => {
    const init = async () => {
      const code = await getDeviceSyncCode();
      setSyncCodeState(code);
      
      // Check trial status
      const trialStart = await AsyncStorage.getItem(TRIAL_START_KEY);
      const savedProStatus = await AsyncStorage.getItem(IS_PRO_KEY);
      
      if (savedProStatus === 'true') {
        // User has purchased Pro
        setLocalIsPro(true);
        setIsTrialExpired(false);
        setTrialDaysRemaining(0);
        console.log('[Trial] User has purchased Pro');
      } else if (trialStart) {
        // Trial started previously, calculate remaining days
        const startDate = new Date(trialStart);
        const now = new Date();
        const diffTime = now.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const remaining = Math.max(0, TRIAL_DURATION_DAYS - diffDays);
        
        setTrialDaysRemaining(remaining);
        setIsTrialExpired(remaining === 0);
        console.log(`[Trial] Days remaining: ${remaining}, Expired: ${remaining === 0}`);
      } else {
        // First launch - start trial
        const now = new Date().toISOString();
        await AsyncStorage.setItem(TRIAL_START_KEY, now);
        setTrialDaysRemaining(TRIAL_DURATION_DAYS);
        setIsTrialExpired(false);
        console.log(`[Trial] First launch - ${TRIAL_DURATION_DAYS} day trial started`);
      }
      
      const [syncStatus, hapticsStatus] = await Promise.all([
        AsyncStorage.getItem('@is_sync_active'),
        AsyncStorage.getItem('@haptics_enabled')
      ]);

      if (hapticsStatus !== null) setHapticsEnabledState(hapticsStatus === 'true');
      
      // Sync is disabled in local-only mode (always false)
      setIsSyncActive(false);
    };
    init();
  }, []);

  const getDeviceSyncCode = async (): Promise<string> => {
    let code = await AsyncStorage.getItem('@sync_code');
    if (!code) {
      code = generateShortCode();
      await AsyncStorage.setItem('@sync_code', code);
    }
    return code;
  };

  const setSyncCode = useCallback(async (code: string) => {
    const normalized = code.toUpperCase();
    await AsyncStorage.setItem('@sync_code', normalized);
    setSyncCodeState(normalized);
  }, []);

  // Placeholder for RevenueCat purchase (disabled)
  const purchasePackage = useCallback(async () => {
    Alert.alert(
      "Coming Soon",
      "In-app purchases are temporarily disabled. All features are free during the trial period!"
    );
  }, []);

  // Placeholder for RevenueCat restore (disabled)
  const restorePurchases = useCallback(async () => {
    Alert.alert(
      "Coming Soon",
      "Purchase restoration is temporarily disabled. All features are free during the trial period!"
    );
  }, []);

  // Manual upgrade to Pro (for testing or future use)
  const upgradeToPro = useCallback(async () => {
    await AsyncStorage.setItem(IS_PRO_KEY, 'true');
    setLocalIsPro(true);
    setIsTrialExpired(false);
    Alert.alert("Success", "Upgraded to Pro! (Local-only mode)");
  }, []);

  // Sync is disabled in local-only mode
  const toggleSync = useCallback(async (active: boolean) => {
    if (active) {
      Alert.alert(
        "Cloud Sync Disabled",
        "Cloud synchronization is temporarily disabled. All data is stored locally on this device."
      );
    }
    // Always keep sync disabled
    await AsyncStorage.setItem('@is_sync_active', 'false');
    setIsSyncActive(false);
  }, []);

  const setHapticsEnabled = useCallback(async (enabled: boolean) => {
    await AsyncStorage.setItem('@haptics_enabled', enabled ? 'true' : 'false');
    setHapticsEnabledState(enabled);
  }, []);
  const resetSyncCode = useCallback(async () => {
    const newCode = generateShortCode();
    await AsyncStorage.setItem('@sync_code', newCode);
    await AsyncStorage.setItem('@is_sync_active', 'false');
    setSyncCodeState(newCode);
    setIsSyncActive(false);
    return newCode;
  }, []);

  return (
    <SyncContext.Provider value={{ 
      syncCode, 
      isPro, 
      isSyncActive, 
      clockOffset, 
      hapticsEnabled,
      trialDaysRemaining,
      isTrialExpired,
      setSyncCode, 
      purchasePackage, 
      restorePurchases,
      toggleSync,
      setHapticsEnabled,
      resetSyncCode,
      upgradeToPro
    }}>
      {children}
    </SyncContext.Provider>
  );
};
