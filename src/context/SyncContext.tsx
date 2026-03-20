import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { PurchasesPackage, CustomerInfo, PurchasesOfferings } from 'react-native-purchases';
import { getDeviceSyncCode } from '../utils/sync';
import { api } from '../../convex/_generated/api';
import { useQuery, useMutation } from 'convex/react';
import { Platform, Alert } from 'react-native';

interface SyncContextType {
  syncCode: string;
  isPro: boolean;
  isSyncActive: boolean;
  clockOffset: number;
  offerings: PurchasesOfferings | null;
  setSyncCode: (code: string) => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
  restorePurchases: () => Promise<void>;
  toggleSync: (active: boolean) => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  syncCode: '',
  isPro: false,
  isSyncActive: false,
  clockOffset: 0,
  offerings: null,
  setSyncCode: async () => {},
  purchasePackage: async () => {},
  restorePurchases: async () => {},
  toggleSync: async () => {},
});

export const useSync = () => useContext(SyncContext);

export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const [syncCode, setSyncCodeState] = useState('');
  const [localIsPro, setLocalIsPro] = useState(false);
  const [isSyncActive, setIsSyncActive] = useState(false);
  const [clockOffset, setClockOffset] = useState(0);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);

  const serverTime = useQuery(api.db.getServerTime);
  const cloudProfile = useQuery(api.db.getSyncProfile, { deviceId: syncCode });
  const updateCloudProStatus = useMutation(api.db.updateSyncProfileProStatus);

  // Effective Pro status: Local purchase OR inherited via Cloud Sync code
  const isPro = localIsPro || cloudProfile?.isPro || false;

  useEffect(() => {
    if (serverTime) {
      setClockOffset(serverTime - Date.now());
    }
  }, [serverTime]);

  // RevenueCat Initialization
  useEffect(() => {
    const setup = async () => {
      // API Keys (Placeholders - USER should replace these in Expo dashboard or env)
      const apiKey = Platform.select({
        ios: process.env.EXPO_PUBLIC_RC_IOS_KEY || "goog_placeholder_ios",
        android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY || "goog_placeholder_android",
      });

      if (apiKey) {
        Purchases.configure({ apiKey });
        
        // Initial check
        const customerInfo = await Purchases.getCustomerInfo();
        updateProStatus(customerInfo);

        const currentOfferings = await Purchases.getOfferings();
        setOfferings(currentOfferings);

        // Listen for changes
        Purchases.addCustomerInfoUpdateListener((info) => {
          updateProStatus(info);
        });
      }
    };

    const updateProStatus = async (info: CustomerInfo) => {
      const proActive = info.entitlements.active['pro'] !== undefined;
      setLocalIsPro(proActive);
      
      // Persist to Convex if we have a syncCode and it changed
      if (syncCode && proActive !== cloudProfile?.isPro) {
        await updateCloudProStatus({ deviceId: syncCode, isPro: proActive });
      }
    };

    setup();
  }, [syncCode, cloudProfile?.isPro]);

  useEffect(() => {
    const init = async () => {
      const code = await getDeviceSyncCode();
      setSyncCodeState(code);
      
      const syncStatus = await AsyncStorage.getItem('@is_sync_active');
      // Sync is only active for Pro users (local or cloud) who have enabled it
      setIsSyncActive(syncStatus === 'true' && isPro);
    };
    init();
  }, [isPro]);

  const setSyncCode = useCallback(async (code: string) => {
    const normalized = code.toUpperCase();
    await AsyncStorage.setItem('@sync_code', normalized);
    setSyncCodeState(normalized);
  }, []);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const proActive = customerInfo.entitlements.active['pro'] !== undefined;
      setLocalIsPro(proActive);
      if (syncCode) {
        await updateCloudProStatus({ deviceId: syncCode, isPro: proActive });
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert("Error", e.message);
      }
    }
  }, [syncCode]);

  const restorePurchases = useCallback(async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const proActive = customerInfo.entitlements.active['pro'] !== undefined;
      setLocalIsPro(proActive);
      if (syncCode) {
        await updateCloudProStatus({ deviceId: syncCode, isPro: proActive });
      }
      Alert.alert("Success", proActive ? "Purchases restored!" : "No active purchases found.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }, [syncCode]);

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
      offerings,
      setSyncCode, 
      purchasePackage, 
      restorePurchases,
      toggleSync 
    }}>
      {children}
    </SyncContext.Provider>
  );
};
