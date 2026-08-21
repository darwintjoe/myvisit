import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@myvisit_settings';

export const defaultSettings = {
  dwellTimeThreshold: 15, // minutes
  stopSpeedThreshold: 1, // km/h
  moveSpeedThreshold: 5, // km/h
  gpsDistanceFilter: 10, // meters
};

export const getSettings = async () => {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return defaultSettings;
  } catch (error) {
    console.error('Error getting settings:', error);
    return defaultSettings;
  }
};

export const saveSettings = async settings => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
};

export const resetSettings = async () => {
  try {
    await AsyncStorage.removeItem(SETTINGS_KEY);
    return true;
  } catch (error) {
    console.error('Error resetting settings:', error);
    return false;
  }
};
