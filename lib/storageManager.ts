/**
 * ストレージマネージャー - 一元管理とパフォーマンス最適化
 * 
 * メモリキャッシュを優先し、ストレージアクセスを最小化
 * イベントベースの更新でポーリングを不要にする
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

type StorageValue = string | null;
type StorageListener = (value: StorageValue) => void;

class StorageManager {
  private memoryCache = new Map<string, StorageValue>();
  private listeners = new Map<string, Set<StorageListener>>();
  private pendingWrites = new Map<string, StorageValue>();
  private writeTimeout: NodeJS.Timeout | null = null;

  /**
   * 値を取得（メモリキャッシュ優先）
   */
  get(key: string): StorageValue {
    // 1. メモリキャッシュをチェック（即座）
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key)!;
    }

    // 2. ストレージから同期読み込み（Web環境のみ、初回のみ）
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const value = localStorage.getItem(key);
        if (value !== null) {
          this.memoryCache.set(key, value);
          return value;
        }
      } catch (error) {
        // エラーは無視
      }
    }

    return null;
  }

  /**
   * 値を設定（メモリキャッシュ + ストレージ）
   */
  async set(key: string, value: StorageValue): Promise<void> {
    // メモリキャッシュを即座に更新
    const oldValue = this.memoryCache.get(key);
    this.memoryCache.set(key, value);

    // 値が変更された場合のみリスナーに通知
    if (oldValue !== value) {
      this.notifyListeners(key, value);
    }

    // ストレージへの書き込みはバッチ処理（デバウンス）
    this.pendingWrites.set(key, value);
    this.scheduleWrite();
  }

  /**
   * ストレージへの書き込みをスケジュール（デバウンス）
   */
  private scheduleWrite(): void {
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
    }

    this.writeTimeout = setTimeout(async () => {
      await this.flushWrites();
    }, 50); // 50ms後に一括書き込み
  }

  /**
   * 保留中の書き込みを実行
   */
  private async flushWrites(): Promise<void> {
    const writes = new Map(this.pendingWrites);
    this.pendingWrites.clear();

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Web環境: localStorageは同期的
        for (const [key, value] of writes.entries()) {
          try {
            if (value === null) {
              localStorage.removeItem(key);
            } else {
              localStorage.setItem(key, value);
            }
          } catch (error) {
            // エラーは無視
          }
        }
      } else {
        // React Native環境: AsyncStorageは非同期
        const pairs: [string, string | null][] = [];
        const removals: string[] = [];

        for (const [key, value] of writes.entries()) {
          if (value === null) {
            removals.push(key);
          } else {
            pairs.push([key, value]);
          }
        }

        if (pairs.length > 0) {
          await AsyncStorage.multiSet(pairs);
        }
        if (removals.length > 0) {
          await AsyncStorage.multiRemove(removals);
        }
      }
    } catch (error) {
      // エラーは無視
    }
  }

  /**
   * 値を削除
   */
  async remove(key: string): Promise<void> {
    return this.set(key, null);
  }

  /**
   * リスナーを登録（変更を通知）
   */
  subscribe(key: string, listener: StorageListener): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);

    // 現在の値を即座に通知
    const currentValue = this.get(key);
    if (currentValue !== null) {
      listener(currentValue);
    }

    // クリーンアップ関数
    return () => {
      this.listeners.get(key)?.delete(listener);
      if (this.listeners.get(key)?.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  /**
   * リスナーに通知
   */
  private notifyListeners(key: string, value: StorageValue): void {
    this.listeners.get(key)?.forEach(listener => {
      try {
        listener(value);
      } catch (error) {
        // エラーは無視
      }
    });
  }

  /**
   * ストレージから値を読み込んでメモリキャッシュに保存（非同期）
   */
  async hydrate(key: string): Promise<void> {
    // 既にメモリキャッシュにある場合はスキップ
    if (this.memoryCache.has(key)) {
      return;
    }

    try {
      let value: StorageValue = null;

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        value = localStorage.getItem(key);
      } else {
        value = await AsyncStorage.getItem(key);
      }

      if (value !== null) {
        this.memoryCache.set(key, value);
        this.notifyListeners(key, value);
      }
    } catch (error) {
      // エラーは無視
    }
  }

  /**
   * 複数のキーを一度に読み込む（最適化）
   */
  async hydrateMultiple(keys: string[]): Promise<void> {
    const missingKeys = keys.filter(key => !this.memoryCache.has(key));
    if (missingKeys.length === 0) {
      return;
    }

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Web環境: 同期的
        for (const key of missingKeys) {
          const value = localStorage.getItem(key);
          if (value !== null) {
            this.memoryCache.set(key, value);
            this.notifyListeners(key, value);
          }
        }
      } else {
        // React Native環境: 非同期
        const values = await AsyncStorage.multiGet(missingKeys);
        for (const [key, value] of values) {
          if (value !== null) {
            this.memoryCache.set(key, value);
            this.notifyListeners(key, value);
          }
        }
      }
    } catch (error) {
      // エラーは無視
    }
  }

  /**
   * メモリキャッシュをクリア
   */
  clearCache(): void {
    this.memoryCache.clear();
  }

  /**
   * 保留中の書き込みを即座に実行
   */
  async flush(): Promise<void> {
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
      this.writeTimeout = null;
    }
    await this.flushWrites();
  }
}

// シングルトンインスタンス
export const storageManager = new StorageManager();

// グローバルイベント（ストレージ変更の通知用）
export const emitStorageEvent = (key: string, value: StorageValue) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('storageChange', {
      detail: { key, value }
    }));
  }
};


