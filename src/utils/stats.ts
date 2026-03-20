import AsyncStorage from '@react-native-async-storage/async-storage';

export const logStat = async (type: 'focus' | 'treatment', value: number) => {
  try {
    const raw = await AsyncStorage.getItem('@global_stats');
    const stats = raw ? JSON.parse(raw) : { focusMinutes: 0, treatments: 0 };
    
    if (type === 'focus') stats.focusMinutes += value;
    if (type === 'treatment') stats.treatments += value;
    
    // Prevent negatives
    if (stats.focusMinutes < 0) stats.focusMinutes = 0;
    if (stats.treatments < 0) stats.treatments = 0;
    
    await AsyncStorage.setItem('@global_stats', JSON.stringify(stats));
  } catch (e) {
    console.error("Stats Tracking Error", e);
  }
};

export const getStats = async () => {
  try {
    const raw = await AsyncStorage.getItem('@global_stats');
    if (!raw) return { focusMinutes: 0, treatments: 0 };
    return JSON.parse(raw);
  } catch (e) {
    console.error("Stats Load Error", e);
    return { focusMinutes: 0, treatments: 0 };
  }
};
