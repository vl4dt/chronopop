import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const generateShortCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O, 0, 1, I for readability
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i === 3) code += '-';
  }
  return code;
};

export const getDeviceSyncCode = async (): Promise<string> => {
  let code = await AsyncStorage.getItem('@sync_code');
  if (!code) {
    code = generateShortCode();
    await AsyncStorage.setItem('@sync_code', code);
  }
  return code;
};

export const setDeviceSyncCode = async (newCode: string) => {
  await AsyncStorage.setItem('@sync_code', newCode.toUpperCase());
};

const getClient = () => {
  if (!process.env.EXPO_PUBLIC_CONVEX_URL) throw new Error("Missing Convex URL");
  return new ConvexHttpClient(process.env.EXPO_PUBLIC_CONVEX_URL);
};

export const pushLocalDataToCloud = async (code: string) => {
  try {
    const p = await AsyncStorage.getItem('@profiles');
    const r = await AsyncStorage.getItem('@reminders');

    const client = getClient();
    
    await client.mutation(api.db.syncPushOverwrite, { 
      deviceId: code, 
      profilesJson: p || "[]", 
      remindersJson: r || "[]" 
    });
    return true;
  } catch (e) {
    console.error("Cloud Push Failed", e);
    return false;
  }
};

export const pullCloudDataToLocal = async (code: string) => {
  try {
    const client = getClient();
    const data = await client.query(api.db.syncPull, { deviceId: code });
    
    if (data && data.profilesJson) {
      await AsyncStorage.setItem('@profiles', data.profilesJson);
      await AsyncStorage.setItem('@reminders', data.remindersJson);
      return true;
    }
    return false; // No data found
  } catch (e) {
    console.error("Cloud Pull Failed", e);
    return false;
  }
};
