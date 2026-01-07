/**
 * アイドルタイムアウトフック
 * ユーザーが1時間操作しなかった場合に自動的にログアウトする
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import AsyncStorage from '@react-native-async-storage/async-storage';

// アイドルタイムアウト時間（1時間 = 3600秒 = 3600000ミリ秒）
const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1時間

// 最後のアクティビティ時刻を保存するキー
const LAST_ACTIVITY_KEY = 'music-practice-last-activity';

interface UseIdleTimeoutOptions {
  /** 認証済みかどうか */
  isAuthenticated: boolean;
  /** ログアウト関数 */
  onLogout: () => Promise<void>;
  /** タイムアウト時間（ミリ秒）。デフォルトは1時間 */
  timeoutMs?: number;
  /** 有効化するかどうか */
  enabled?: boolean;
}

/**
 * アイドルタイムアウトを管理するフック
 * 
 * 機能:
 * - ユーザーの操作（タッチ、スクロール、キーボード入力など）を監視
 * - 最後の操作から指定時間経過したら自動ログアウト
 * - アプリがバックグラウンドにある間はタイマーを一時停止
 */
export const useIdleTimeout = ({
  isAuthenticated,
  onLogout,
  timeoutMs = IDLE_TIMEOUT_MS,
  enabled = true,
}: UseIdleTimeoutOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const appStateRef = useRef<string>(AppState.currentState);
  const isPausedRef = useRef<boolean>(false);

  /**
   * 最後のアクティビティ時刻をストレージに保存
   */
  const saveLastActivity = useCallback(async (timestamp: number) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LAST_ACTIVITY_KEY, timestamp.toString());
      } else if (Platform.OS !== 'web') {
        await AsyncStorage.setItem(LAST_ACTIVITY_KEY, timestamp.toString());
      }
    } catch (error) {
      // ストレージ保存エラーは無視（タイマーは動作し続ける）
      logger.debug('[useIdleTimeout] 最後のアクティビティ時刻の保存に失敗（続行）:', error);
    }
  }, []);

  /**
   * タイマーをリセット
   */
  const resetTimer = useCallback(() => {
    // 既存のタイマーをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // 認証されていない、または無効化されている場合は何もしない
    if (!isAuthenticated || !enabled) {
      return;
    }

    // バックグラウンドにある場合はタイマーを開始しない
    if (isPausedRef.current) {
      return;
    }

    // 最後のアクティビティ時刻を更新
    const now = Date.now();
    lastActivityRef.current = now;

    // ストレージにも保存（アプリ再起動時にも維持されるように）
    saveLastActivity(now);

    // 新しいタイマーを設定
    timeoutRef.current = setTimeout(async () => {
      try {
        logger.info('アイドルタイムアウト: 1時間経過したため自動ログアウトします');
        await onLogout();
      } catch (error) {
        ErrorHandler.handle(error, '自動ログアウト', false);
      }
    }, timeoutMs);
  }, [isAuthenticated, enabled, timeoutMs, onLogout, saveLastActivity]);

  /**
   * ユーザーのアクティビティを検知
   */
  const handleActivity = useCallback(() => {
    if (!isAuthenticated || !enabled || isPausedRef.current) {
      return;
    }

    // 最後のアクティビティから一定時間（例: 1分）経過している場合のみリセット
    // これにより、頻繁なイベントによるパフォーマンス問題を回避
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    const MIN_ACTIVITY_INTERVAL = 60000; // 1分

    if (timeSinceLastActivity >= MIN_ACTIVITY_INTERVAL) {
      resetTimer();
    }
  }, [isAuthenticated, enabled, resetTimer]);

  /**
   * アプリの状態変化を監視
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasBackground = appStateRef.current.match(/inactive|background/);
      const isNowForeground = nextAppState === 'active';

      appStateRef.current = nextAppState;

      // バックグラウンドからフォアグラウンドに戻った場合
      if (wasBackground && isNowForeground) {
        isPausedRef.current = false;
        
        // 最後のアクティビティからの経過時間を確認
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        
        if (timeSinceLastActivity >= timeoutMs) {
          // タイムアウト時間を超えている場合は即座にログアウト
          logger.info('アプリ復帰時にタイムアウトを検出: 自動ログアウトします');
          onLogout().catch(error => {
            ErrorHandler.handle(error, '自動ログアウト', false);
          });
        } else {
          // タイムアウトしていない場合は残り時間でタイマーを再開
          const remainingTime = timeoutMs - timeSinceLastActivity;
          timeoutRef.current = setTimeout(async () => {
            try {
              logger.info('アイドルタイムアウト: 自動ログアウトします');
              await onLogout();
            } catch (error) {
              ErrorHandler.handle(error, '自動ログアウト', false);
            }
          }, remainingTime);
        }
      } else if (isNowForeground === false) {
        // フォアグラウンドからバックグラウンドに移行した場合
        isPausedRef.current = true;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [timeoutMs, onLogout]);

  /**
   * Web環境でのユーザー操作イベントを監視
   */
  useEffect(() => {
    if (!isAuthenticated || !enabled || Platform.OS !== 'web') {
      return;
    }

    // 監視するイベント
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown',
    ];

    // イベントリスナーを追加（パッシブモードでパフォーマンスを最適化）
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // クリーンアップ
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, enabled, handleActivity]);

  /**
   * React Native環境でのユーザー操作イベントを監視
   */
  useEffect(() => {
    if (!isAuthenticated || !enabled || Platform.OS === 'web') {
      return;
    }

    // React Nativeでは、AppStateの変化とタイマーのリセットで対応
    // 実際のタッチイベントは各コンポーネントで処理されるため、
    // ここではタイマーの初期化とリセットのみを行う
    resetTimer();

    // クリーンアップ
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isAuthenticated, enabled, resetTimer]);

  /**
   * 認証状態が変化したときにタイマーをリセット
   */
  useEffect(() => {
    if (isAuthenticated && enabled) {
      // ストレージから最後のアクティビティ時刻を読み込んで、タイマーを適切に設定
      const loadLastActivity = async () => {
        try {
          let savedTimestamp: number | null = null;
          
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
            const saved = window.localStorage.getItem(LAST_ACTIVITY_KEY);
            if (saved) {
              savedTimestamp = parseInt(saved, 10);
            }
          } else if (Platform.OS !== 'web') {
            const saved = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
            if (saved) {
              savedTimestamp = parseInt(saved, 10);
            }
          }

          if (savedTimestamp && !isNaN(savedTimestamp)) {
            // 保存された時刻から経過時間を計算
            const timeSinceLastActivity = Date.now() - savedTimestamp;
            
            // タイムアウト時間を超えている場合は即座にログアウト
            if (timeSinceLastActivity >= timeoutMs) {
              logger.info('[useIdleTimeout] 最後のアクティビティから1時間以上経過 - 自動ログアウト');
              onLogout().catch(error => {
                ErrorHandler.handle(error, '自動ログアウト', false);
              });
              return;
            }

            // タイムアウト時間を超えていない場合は、保存された時刻を使用
            lastActivityRef.current = savedTimestamp;
          }
        } catch (error) {
          // ストレージ読み込みエラーは無視（新しいタイマーを開始）
          logger.debug('[useIdleTimeout] 最後のアクティビティ時刻の読み込みに失敗（続行）:', error);
        }

        // タイマーをリセット（保存された時刻がある場合はそれを使用、ない場合は現在時刻を使用）
        resetTimer();
      };

      loadLastActivity();
    } else {
      // ログアウトした場合はタイマーをクリア
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // ストレージからも最後のアクティビティ時刻を削除
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.removeItem(LAST_ACTIVITY_KEY);
        } catch (error) {
          // エラーは無視
        }
      } else if (Platform.OS !== 'web') {
        AsyncStorage.removeItem(LAST_ACTIVITY_KEY).catch(() => {
          // エラーは無視
        });
      }
    }
  }, [isAuthenticated, enabled, resetTimer, timeoutMs, onLogout]);

  /**
   * グローバルなアクティビティハンドラーをエクスポート
   * 他のコンポーネントから手動でアクティビティを通知できるようにする
   */
  return {
    resetTimer,
    handleActivity,
  };
};


