/**
 * 練習データのキャッシュ管理
 * メモリキャッシュとローカルストレージキャッシュを提供
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheStats {
  hitRate: number;
  size: number;
  hits: number;
  misses: number;
}

export class PracticeDataCache {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
  };
  
  // キャッシュの有効期限（ミリ秒）
  private readonly MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5分
  private readonly STORAGE_CACHE_TTL = 60 * 60 * 1000; // 1時間
  
  // 最大キャッシュサイズ（メモリ）
  private readonly MAX_MEMORY_CACHE_SIZE = 100;
  
  /**
   * メモリキャッシュからデータを取得
   */
  get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // 有効期限チェック
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return entry.data as T;
  }
  
  /**
   * メモリキャッシュにデータを保存
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // キャッシュサイズ制限
    if (this.memoryCache.size >= this.MAX_MEMORY_CACHE_SIZE) {
      // 最も古いエントリを削除
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }
    
    const now = Date.now();
    const expiresAt = now + (ttl || this.MEMORY_CACHE_TTL);
    
    this.memoryCache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });
  }
  
  /**
   * ローカルストレージキャッシュからデータを取得
   */
  async getFromStorage<T>(key: string): Promise<T | null> {
    try {
      const stored = await AsyncStorage.getItem(`cache:${key}`);
      if (!stored) {
        return null;
      }
      
      const entry: CacheEntry<T> = JSON.parse(stored);
      
      // 有効期限チェック
      if (Date.now() > entry.expiresAt) {
        await AsyncStorage.removeItem(`cache:${key}`);
        return null;
      }
      
      return entry.data;
    } catch (error) {
      logger.error('キャッシュ読み込みエラー:', error);
      return null;
    }
  }
  
  /**
   * ローカルストレージキャッシュにデータを保存
   */
  async setToStorage<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const now = Date.now();
      const expiresAt = now + (ttl || this.STORAGE_CACHE_TTL);
      
      const entry: CacheEntry<T> = {
        data,
        timestamp: now,
        expiresAt,
      };
      
      await AsyncStorage.setItem(`cache:${key}`, JSON.stringify(entry));
    } catch (error) {
      logger.error('キャッシュ保存エラー:', error);
    }
  }
  
  /**
   * メモリキャッシュから削除
   */
  delete(key: string): void {
    this.memoryCache.delete(key);
  }
  
  /**
   * ローカルストレージキャッシュから削除
   */
  async deleteFromStorage(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`cache:${key}`);
    } catch (error) {
      logger.error('キャッシュ削除エラー:', error);
    }
  }
  
  /**
   * メモリキャッシュをクリア
   */
  clear(): void {
    this.memoryCache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }
  
  /**
   * ローカルストレージキャッシュをクリア
   */
  async clearStorage(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache:'));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      logger.error('キャッシュクリアエラー:', error);
    }
  }
  
  /**
   * 有効期限切れのエントリを削除
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
      }
    }
  }
  
  /**
   * キャッシュ統計を取得
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;
    
    return {
      hitRate,
      size: this.memoryCache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
    };
  }
  
  /**
   * キャッシュキーを生成
   */
  static generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }
}

// シングルトンインスタンス
export const practiceDataCache = new PracticeDataCache();

// 定期的にクリーンアップを実行（5分ごと）
if (typeof window !== 'undefined') {
  setInterval(() => {
    practiceDataCache.cleanup();
  }, 5 * 60 * 1000);
}

