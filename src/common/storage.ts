import { StorageData } from './types';

// Chrome拡張機能の場合はtrueを返す
const isChromeExtension = () => {
  return typeof chrome !== 'undefined' && chrome.storage !== undefined;
};

// データの保存
export const saveToStorage = async (key: keyof StorageData, value: string | number | boolean): Promise<void> => {
  try {
    if (isChromeExtension()) {
      // Chrome拡張機能の場合
      await chrome.storage.local.set({ [`flexTime_${key}`]: value.toString() });
    } else {
      // Web版の場合
      localStorage.setItem(`flexTime_${key}`, value.toString());
    }
  } catch (error) {
    console.error('ストレージ保存エラー:', error);
  }
};

// データの読み込み
export const loadFromStorage = async (): Promise<Partial<StorageData>> => {
  try {
    if (isChromeExtension()) {
      // Chrome拡張機能の場合
      const result = await chrome.storage.local.get([
        'flexTime_startTime',
        'flexTime_targetHours',
        'flexTime_targetMinutes',
        'flexTime_breakStart',
        'flexTime_breakEnd',
        'flexTime_overtimeHours',
        'flexTime_overtimeMinutes',
        'flexTime_shortageHours',
        'flexTime_shortageMinutes',
        'notificationsAllowed',
      ]);

      return {
        startTime: result.flexTime_startTime || '',
        targetHours: result.flexTime_targetHours ? parseInt(result.flexTime_targetHours) : 6,
        targetMinutes: result.flexTime_targetMinutes ? parseInt(result.flexTime_targetMinutes) : 0,
        breakStart: result.flexTime_breakStart || '',
        breakEnd: result.flexTime_breakEnd || '',
        overtimeHours: result.flexTime_overtimeHours || '',
        overtimeMinutes: result.flexTime_overtimeMinutes || '',
        shortageHours: result.flexTime_shortageHours || '',
        shortageMinutes: result.flexTime_shortageMinutes || '',
        notificationsAllowed: result.notificationsAllowed === 'true'
      };
    } else {
      // Web版の場合
      return {
        startTime: localStorage.getItem('flexTime_startTime') || '',
        targetHours: parseInt(localStorage.getItem('flexTime_targetHours') || '6'),
        targetMinutes: parseInt(localStorage.getItem('flexTime_targetMinutes') || '0'),
        breakStart: localStorage.getItem('flexTime_breakStart') || '',
        breakEnd: localStorage.getItem('flexTime_breakEnd') || '',
        overtimeHours: localStorage.getItem('flexTime_overtimeHours') || '',
        overtimeMinutes: localStorage.getItem('flexTime_overtimeMinutes') || '',
        shortageHours: localStorage.getItem('flexTime_shortageHours') || '',
        shortageMinutes: localStorage.getItem('flexTime_shortageMinutes') || '',
        notificationsAllowed: localStorage.getItem('notificationsAllowed') === 'true'
      };
    }
  } catch (error) {
    console.error('データ読み込みエラー:', error);
    return {};
  }
};
