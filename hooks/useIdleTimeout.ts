/**
 * アイドルタイムアウトフック
 * ユーザーが1時間操作しなかった場合に自動的にログアウトする
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

// アイドルタイムアウト時間（1時間 = 3600秒 = 3600000ミリ秒）
const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1時間

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
    lastActivityRef.current = Date.now();

    // 新しいタイマーを設定
    timeoutRef.current = setTimeout(async () => {
      try {
        logger.info('アイドルタイムアウト: 1時間経過したため自動ログアウトします');
        await onLogout();
      } catch (error) {
        ErrorHandler.handle(error, '自動ログアウト', false);
      }
    }, timeoutMs);
  }, [isAuthenticated, enabled, timeoutMs, onLogout]);

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
      resetTimer();
    } else {
      // ログアウトした場合はタイマーをクリア
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isAuthenticated, enabled, resetTimer]);

  /**
   * グローバルなアクティビティハンドラーをエクスポート
   * 他のコンポーネントから手動でアクティビティを通知できるようにする
   */
  return {
    resetTimer,
    handleActivity,
  };
};


