import logger from './logger';
import { ErrorHandler } from './errorHandler';

// Web環境での互換性のためのAsyncStorageの代替実装
let AsyncStorage: any;

if (typeof window !== 'undefined') {
  // Web環境ではlocalStorageを使用
  AsyncStorage = {
    setItem: (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
        return Promise.resolve();
      } catch (error) {
        return Promise.reject(error);
      }
    },
    getItem: (key: string) => {
      try {
        const value = localStorage.getItem(key);
        return Promise.resolve(value);
      } catch (error) {
        return Promise.reject(error);
      }
    },
    getAllKeys: () => {
      try {
        const keys = Object.keys(localStorage);
        return Promise.resolve(keys);
      } catch (error) {
        return Promise.reject(error);
      }
    },
    multiGet: (keys: string[]) => {
      try {
        const results = keys.map(key => [key, localStorage.getItem(key)]);
        return Promise.resolve(results);
      } catch (error) {
        return Promise.reject(error);
      }
    },
    multiRemove: (keys: string[]) => {
      try {
        keys.forEach(key => localStorage.removeItem(key));
        return Promise.resolve();
      } catch (error) {
        return Promise.reject(error);
      }
    }
  };
} else {
  // React Native環境では通常のAsyncStorageを使用
  try {
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
  } catch (error) {
    // AsyncStorageが利用できない場合のフォールバック
    AsyncStorage = {
      setItem: () => Promise.resolve(),
      getItem: () => Promise.resolve(null),
      getAllKeys: () => Promise.resolve([]),
      multiGet: () => Promise.resolve([]),
      multiRemove: () => Promise.resolve()
    };
  }
}

// オフライン対応のためのローカルストレージユーティリティ
export class OfflineStorage {
  // 練習記録の保存
  static async savePracticeRecord(record: any) {
    try {
      const key = `practice_${Date.now()}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        ...record,
        id: key,
        created_at: new Date().toISOString(),
        is_synced: false
      }));
      return { success: true, id: key };
    } catch (error) {
      ErrorHandler.handle(error, 'ローカル保存', false);
      return { success: false, error };
    }
  }

  // 練習記録の取得
  static async getPracticeRecords() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const practiceKeys = keys.filter(key => key.startsWith('practice_'));
      const records = await AsyncStorage.multiGet(practiceKeys);
      return records
        .map(([key, value]) => value ? JSON.parse(value) : null)
        .filter(record => record !== null)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      ErrorHandler.handle(error, 'ローカル取得', false);
      return [];
    }
  }

  // 目標の保存
  static async saveGoal(goal: any) {
    try {
      const key = `goal_${Date.now()}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        ...goal,
        id: key,
        created_at: new Date().toISOString(),
        is_synced: false
      }));
      return { success: true, id: key };
    } catch (error) {
      ErrorHandler.handle(error, 'ローカル目標保存', false);
      return { success: false, error };
    }
  }

  // 目標の取得
  static async getGoals() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const goalKeys = keys.filter(key => key.startsWith('goal_'));
      const records = await AsyncStorage.multiGet(goalKeys);
      return records
        .map(([key, value]) => value ? JSON.parse(value) : null)
        .filter(record => record !== null)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      ErrorHandler.handle(error, 'ローカル目標取得', false);
      return [];
    }
  }

  // 録音データの保存
  static async saveRecording(recording: any) {
    try {
      const key = `recording_${Date.now()}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        ...recording,
        id: key,
        created_at: new Date().toISOString(),
        is_synced: false
      }));
      return { success: true, id: key };
    } catch (error) {
      ErrorHandler.handle(error, 'ローカル録音保存', false);
      return { success: false, error };
    }
  }

  // 録音データの取得
  static async getRecordings() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const recordingKeys = keys.filter(key => key.startsWith('recording_'));
      const records = await AsyncStorage.multiGet(recordingKeys);
      return records
        .map(([key, value]) => value ? JSON.parse(value) : null)
        .filter(record => record !== null)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      ErrorHandler.handle(error, 'ローカル録音取得', false);
      return [];
    }
  }

  // 設定の保存
  static async saveSettings(settings: any) {
    try {
      await AsyncStorage.setItem('user_settings', JSON.stringify(settings));
      return { success: true };
    } catch (error) {
      ErrorHandler.handle(error, 'ローカル設定保存', false);
      return { success: false, error };
    }
  }

  // 設定の取得
  static async getSettings() {
    try {
      const settings = await AsyncStorage.getItem('user_settings');
      return settings ? JSON.parse(settings) : {};
    } catch (error) {
      ErrorHandler.handle(error, 'ローカル設定取得', false);
      return {};
    }
  }

  // 未同期データの取得
  static async getUnsyncedData() {
    try {
      const allRecords = [
        ...(await this.getPracticeRecords()),
        ...(await this.getGoals()),
        ...(await this.getRecordings())
      ];
      return allRecords.filter(record => !record.is_synced);
    } catch (error) {
      ErrorHandler.handle(error, '未同期データ取得', false);
      return [];
    }
  }

  // データの同期状態を更新
  static async markAsSynced(id: string) {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const targetKey = keys.find(key => key === id);
      if (targetKey) {
        const record = await AsyncStorage.getItem(targetKey);
        if (record) {
          const updatedRecord = { ...JSON.parse(record), is_synced: true };
          await AsyncStorage.setItem(targetKey, JSON.stringify(updatedRecord));
        }
      }
      return { success: true };
    } catch (error) {
      ErrorHandler.handle(error, '同期状態更新', false);
      return { success: false, error };
    }
  }

  // ローカルデータのクリア
  static async clearLocalData() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const dataKeys = keys.filter(key => 
        key.startsWith('practice_') || 
        key.startsWith('goal_') || 
        key.startsWith('recording_')
      );
      await AsyncStorage.multiRemove(dataKeys);
      return { success: true };
    } catch (error) {
      ErrorHandler.handle(error, 'ローカルデータクリア', false);
      return { success: false, error };
    }
  }
}

// ネットワーク状態の確認
export const isOnline = () => {
  if (typeof navigator !== 'undefined') {
    return navigator.onLine;
  }
  return true; // デフォルトはオンライン
};

// オフライン対応のデータ取得
export const getDataOffline = async (key: string, fallback: any = null) => {
  try {
    if (isOnline()) {
      // オンライン時はサーバーから取得を試行
      return null; // サーバー取得を試行するためnullを返す
    } else {
      // オフライン時はローカルから取得
      const localData = await AsyncStorage.getItem(key);
      return localData ? JSON.parse(localData) : fallback;
    }
  } catch (error) {
    ErrorHandler.handle(error, 'オフラインデータ取得', false);
    return fallback;
  }
};
