import logger from './logger';
import { ErrorHandler } from './errorHandler';
import { PracticeSession, Goal, Recording } from '@/types/models';

// AsyncStorageの型定義
interface AsyncStorageType {
  setItem: (key: string, value: string) => Promise<void>;
  getItem: (key: string) => Promise<string | null>;
  getAllKeys: () => Promise<string[]>;
  multiGet: (keys: string[]) => Promise<[string, string | null][]>;
  multiRemove: (keys: string[]) => Promise<void>;
}

// Web環境での互換性のためのAsyncStorageの代替実装
let AsyncStorage: AsyncStorageType;

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
      setItem: async () => Promise.resolve(),
      getItem: async () => Promise.resolve(null),
      getAllKeys: async () => Promise.resolve([]),
      multiGet: async () => Promise.resolve([]),
      multiRemove: async () => Promise.resolve()
    };
  }
}

// オフライン対応のためのローカルストレージユーティリティ
export class OfflineStorage {
  // 練習記録の保存（一意IDを付与して重複を防ぐ）
  static async savePracticeRecord(record: Partial<PracticeSession> & { user_id: string; practice_date: string; duration_minutes: number }) {
    try {
      // 一意IDを生成（user_id + practice_date + input_method + timestamp）
      // これにより、複数端末から同時保存された場合でも重複を検出可能
      const inputMethod = record.input_method || 'manual';
      const uniqueId = `${record.user_id}_${record.practice_date}_${inputMethod}_${Date.now()}`;
      const key = `practice_${uniqueId}`;
      
      // 既存のオフライン記録をチェック（重複を防ぐ）
      const existingRecords = await this.getPracticeRecords();
      const isDuplicate = existingRecords.some((existing: any) => {
        return existing.user_id === record.user_id &&
               existing.practice_date === record.practice_date &&
               existing.input_method === inputMethod &&
               Math.abs(new Date(existing.created_at).getTime() - Date.now()) < 5000; // 5秒以内の記録は重複とみなす
      });
      
      if (isDuplicate) {
        logger.debug('オフライン記録の重複を検出、保存をスキップ', {
          user_id: record.user_id,
          practice_date: record.practice_date,
          input_method: inputMethod
        });
        return { success: true, id: null, skipped: true };
      }
      
      await AsyncStorage.setItem(key, JSON.stringify({
        ...record,
        id: key,
        unique_id: uniqueId, // 一意IDを保存
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
      const practiceKeys = keys.filter((key: string) => key.startsWith('practice_'));
      const records = await AsyncStorage.multiGet(practiceKeys);
      return records
        .map(([key, value]: [string, string | null]) => value ? JSON.parse(value) as PracticeSession & { created_at: string } : null)
        .filter((record): record is PracticeSession & { created_at: string } => record !== null)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      ErrorHandler.handle(error, 'ローカル取得', false);
      return [];
    }
  }

  // 目標の保存
  static async saveGoal(goal: Partial<Goal> & { title: string; user_id: string }) {
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

  // 目標の取得（楽器IDでフィルタリング可能）
  static async getGoals(instrumentId?: string | null) {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const goalKeys = keys.filter((key: string) => key.startsWith('goal_'));
      const records = await AsyncStorage.multiGet(goalKeys);
      const allGoals = records
        .map(([key, value]: [string, string | null]) => value ? JSON.parse(value) as Goal & { created_at: string } : null)
        .filter((record): record is Goal & { created_at: string } => record !== null);
      
      // instrument_idでフィルタリング（指定された場合のみ）
      if (instrumentId !== undefined) {
        const filteredGoals = allGoals.filter((goal) => {
          const goalInstrumentId = goal.instrument_id;
          if (instrumentId === null) {
            return goalInstrumentId === null || goalInstrumentId === undefined;
          } else {
            return goalInstrumentId === instrumentId;
          }
        });
        return filteredGoals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      
      return allGoals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      ErrorHandler.handle(error, 'ローカル目標取得', false);
      return [];
    }
  }

  // 録音データの保存
  static async saveRecording(recording: Partial<Recording> & { user_id: string; title: string; file_path: string }) {
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
      const recordingKeys = keys.filter((key: string) => key.startsWith('recording_'));
      const records = await AsyncStorage.multiGet(recordingKeys);
      return records
        .map(([key, value]: [string, string | null]) => value ? JSON.parse(value) as Recording & { created_at: string } : null)
        .filter((record): record is Recording & { created_at: string } => record !== null)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      ErrorHandler.handle(error, 'ローカル録音取得', false);
      return [];
    }
  }

  // 設定の保存
  static async saveSettings(settings: Record<string, unknown>) {
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
      const targetKey = keys.find((key: string) => key === id);
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
      const dataKeys = keys.filter((key: string) => 
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
// Web環境ではnavigator.onLineを使用、ネイティブ環境では常にtrueを返す（将来的にNetInfoを統合可能）
export const isOnline = (): boolean => {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine;
  }
  // ネイティブ環境では、将来的に@react-native-community/netinfoを統合可能
  // 現時点では、オフライン検出はWeb環境のみ対応
  // TODO: ネイティブ環境でのオフライン検出を実装する場合は、NetInfoを使用
  return true; // デフォルトはオンライン
};

// オフライン対応のデータ取得
export const getDataOffline = async <T = unknown>(key: string, fallback: T | null = null): Promise<T | null> => {
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
