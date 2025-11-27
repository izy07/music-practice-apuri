/**
 * パフォーマンストラッカー - 起動時間と読み込み速度の測定
 */
import logger from './logger';

export interface PerformanceMetrics {
  frameworkReady: number; // フレームワーク準備完了までの時間（ms）
  authInitialized: number; // 認証初期化までの時間（ms）
  instrumentLoaded: number; // 楽器データ読み込みまでの時間（ms）
  firstRender: number; // 初回レンダリングまでの時間（ms）
  totalLoadTime: number; // 合計読み込み時間（ms）
}

class PerformanceTracker {
  private startTime: number;
  private metrics: Partial<PerformanceMetrics> = {};
  private listeners: Array<(metrics: PerformanceMetrics) => void> = [];

  constructor() {
    // ページ読み込み開始時刻を記録
    if (typeof window !== 'undefined') {
      this.startTime = performance.timing?.navigationStart || Date.now();
      
      // Performance APIが利用可能な場合
      if (performance.timing) {
        // DOMContentLoadedイベントで初回レンダリング時間を測定
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          this.metrics.firstRender = performance.timing.domContentLoadedEventEnd - this.startTime;
        } else {
          window.addEventListener('DOMContentLoaded', () => {
            this.metrics.firstRender = performance.timing!.domContentLoadedEventEnd - this.startTime;
            this.notifyListeners();
          });
        }
      } else {
        this.startTime = Date.now();
      }
    } else {
      this.startTime = Date.now();
    }
  }

  /**
   * フレームワーク準備完了を記録
   */
  markFrameworkReady(): void {
    this.metrics.frameworkReady = Date.now() - this.startTime;
    this.notifyListeners();
  }

  /**
   * 認証初期化完了を記録
   */
  markAuthInitialized(): void {
    this.metrics.authInitialized = Date.now() - this.startTime;
    this.notifyListeners();
  }

  /**
   * 楽器データ読み込み完了を記録
   */
  markInstrumentLoaded(): void {
    this.metrics.instrumentLoaded = Date.now() - this.startTime;
    this.notifyListeners();
  }

  /**
   * 初回レンダリング完了を記録
   */
  markFirstRender(): void {
    if (!this.metrics.firstRender) {
      this.metrics.firstRender = Date.now() - this.startTime;
      this.notifyListeners();
    }
  }

  /**
   * メトリクスを取得
   */
  getMetrics(): PerformanceMetrics {
    const totalLoadTime = Date.now() - this.startTime;
    
    return {
      frameworkReady: this.metrics.frameworkReady || 0,
      authInitialized: this.metrics.authInitialized || 0,
      instrumentLoaded: this.metrics.instrumentLoaded || 0,
      firstRender: this.metrics.firstRender || 0,
      totalLoadTime,
    };
  }

  /**
   * メトリクス更新のリスナーを登録
   */
  subscribe(listener: (metrics: PerformanceMetrics) => void): () => void {
    this.listeners.push(listener);
    
    // 即座に現在のメトリクスを通知
    listener(this.getMetrics());
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * リスナーに通知
   */
  private notifyListeners(): void {
    const metrics = this.getMetrics();
    this.listeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (error) {
        // エラーは無視
      }
    });
  }

  /**
   * メトリクスをログ出力
   */
  logMetrics(): void {
    const metrics = this.getMetrics();
    
    logger.debug('パフォーマンスメトリクス:', {
      'フレームワーク準備': `${metrics.frameworkReady.toFixed(0)}ms`,
      '認証初期化': `${metrics.authInitialized.toFixed(0)}ms`,
      '楽器データ読み込み': `${metrics.instrumentLoaded.toFixed(0)}ms`,
      '初回レンダリング': `${metrics.firstRender.toFixed(0)}ms`,
      '合計読み込み時間': `${metrics.totalLoadTime.toFixed(0)}ms`,
    });
  }

  /**
   * メトリクスをリセット
   */
  reset(): void {
    this.startTime = Date.now();
    this.metrics = {};
  }
}

// シングルトンインスタンス
export const performanceTracker = new PerformanceTracker();

// 開発環境では自動的にログ出力
if (typeof window !== 'undefined' && (process.env.NODE_ENV === 'development' || __DEV__)) {
  // ページ読み込み完了時にメトリクスをログ出力
  window.addEventListener('load', () => {
    setTimeout(() => {
      performanceTracker.logMetrics();
    }, 1000); // 1秒後に出力（すべての初期化が完了するまで待つ）
  });
}


