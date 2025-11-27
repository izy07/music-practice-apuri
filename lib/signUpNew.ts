/**
 * 新規登録機能 - シンプルな実装
 * 
 * Supabaseの標準的な動作に完全に従う：
 * 1. メールアドレスとパスワードの検証
 * 2. supabase.auth.signUp()を直接呼び出し
 * 3. セッション管理はSupabaseクライアントに完全に任せる
 * 4. プロフィール作成はデータベーストリガーに完全に依存
 */

import { supabase } from './supabase';
import logger from './logger';

export interface SignUpResult {
  success: boolean;
  error?: string;
  userId?: string;
  email?: string;
}

/**
 * メールアドレスの正規化（全角→半角変換）
 */
function normalizeEmail(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９＠．]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
}

/**
 * エラーメッセージを日本語に変換
 */
function translateError(error: any): string {
  if (!error || !error.message) {
    return '新規登録に失敗しました。しばらく待ってから再度お試しください。';
  }

  const message = error.message.toLowerCase();

  // 既に登録済みのメールアドレスのエラーを検出
  if (message.includes('already registered') || 
      message.includes('user already registered') ||
      message.includes('email already registered') ||
      (message.includes('already') && message.includes('registered')) ||
      message.includes('user already exists') ||
      (message.includes('email') && message.includes('already') && message.includes('in use'))) {
    return 'このメールアドレスは既に登録されています。ログイン画面からログインしてください。';
  }
  if (message.includes('invalid email') || message.includes('email')) {
    return 'メールアドレスの形式が正しくありません。';
  }
  if (message.includes('password') && (message.includes('weak') || message.includes('short') || message.includes('minimum'))) {
    return 'パスワードが弱すぎます。8文字以上で、複数の文字種を含めてください。';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'ネットワーク接続に問題があります。接続を確認してください。';
  }
  // タイムアウトエラーメッセージを削除

  return error.message;
}

/**
 * 新規登録
 * 
 * @param email - メールアドレス
 * @param password - パスワード
 * @param displayName - 表示名（オプション）
 * @returns 登録結果
 */
export async function signUpNew(
  email: string,
  password: string,
  displayName?: string
): Promise<SignUpResult> {
  try {
    // 入力値の検証
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password) {
      return {
        success: false,
        error: 'メールアドレスとパスワードを入力してください。',
      };
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return {
        success: false,
        error: 'メールアドレスの形式が正しくありません。',
      };
    }

    logger.info('[signUpNew] 新規登録開始:', { email: normalizedEmail });

    // 新規登録前に既存のセッションをクリア（タイムアウト機能を削除）
    // Web環境ではgetSession()がタイムアウトする可能性があるため、タイムアウトを設定
    try {
      logger.debug('[signUpNew] セッション確認開始');
      
      // タイムアウト付きでgetSession()を実行（5秒でタイムアウト）
      const getSessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('getSession timeout')), 5000)
      );
      
      let sessionData;
      try {
        sessionData = await Promise.race([getSessionPromise, timeoutPromise]) as any;
      } catch (timeoutError) {
        logger.warn('[signUpNew] getSessionタイムアウト（続行）:', timeoutError);
        // タイムアウトした場合はセッションなしとして続行
        sessionData = { data: { session: null } };
      }
      
      const session = sessionData?.data?.session;
      
      if (session) {
        logger.debug('[signUpNew] 既存セッションをクリア');
        // signOut()もタイムアウトを設定
        try {
          const signOutPromise = supabase.auth.signOut();
          const signOutTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('signOut timeout')), 3000)
          );
          await Promise.race([signOutPromise, signOutTimeoutPromise]);
        } catch (signOutError) {
          logger.warn('[signUpNew] signOutタイムアウト（続行）:', signOutError);
          // タイムアウトしても続行
        }
      } else {
        logger.debug('[signUpNew] 既存セッションなし');
      }
    } catch (clearError) {
      logger.warn('[signUpNew] セッションクリアエラー（続行）:', clearError);
      // セッションクリアに失敗しても続行
    }

    // 直接fetchでSupabase APIを呼び出す（supabase.auth.signUp()がタイムアウトする問題を回避）
    logger.debug('[signUpNew] 直接API呼び出し方式に切り替え');
    let data, error;
    const signUpStartTime = Date.now();
    try {
      // SupabaseのURLとキーを取得
      const { getSupabaseConfig } = await import('./supabase');
      const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();
      
      if (!supabaseUrl || !supabaseKey) {
        logger.error('[signUpNew] Supabase設定が不正です');
        return {
          success: false,
          error: '認証サーバーへの接続に失敗しました。設定を確認してください。',
        };
      }
      
      // 直接fetchでSupabaseのsignupエンドポイントを呼び出す
      const signupUrl = `${supabaseUrl}/auth/v1/signup`;
      const requestBody = {
        email: normalizedEmail,
        password: password,
        options: {
          data: {
            name: displayName?.trim() || normalizedEmail.split('@')[0],
            display_name: displayName?.trim() || normalizedEmail.split('@')[0],
          },
        },
      };
      
      logger.debug('[signUpNew] Supabase signup API呼び出し開始:', { url: signupUrl });
      
      // タイムアウト機能を削除
      let response: Response;
      try {
        response = await fetch(signupUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify(requestBody),
        });
      } catch (fetchError: any) {
        logger.error('[signUpNew] fetchエラー:', fetchError);
        return {
          success: false,
          error: '認証サーバーへの接続に失敗しました。ネットワーク接続を確認してください。',
        };
      }
      
      const responseData = await response.json();
      const elapsed = Date.now() - signUpStartTime;
      
      // レスポンスデータをログに出力（デバッグ用）
      logger.debug('[signUpNew] APIレスポンス:', {
        status: response.status,
        ok: response.ok,
        hasUser: !!responseData.user,
        hasSession: !!responseData.session,
        hasAccessToken: !!responseData.access_token,
        hasRefreshToken: !!responseData.refresh_token,
        responseKeys: Object.keys(responseData),
        elapsed: `${elapsed}ms`
      });
      
      if (!response.ok) {
        error = responseData;
        logger.error('[signUpNew] 新規登録エラー:', { 
          error: error?.message || error?.error_description, 
          status: response.status,
          elapsed: `${elapsed}ms`
        });
        return {
          success: false,
          error: translateError(error),
        };
      }
      
      // レスポンスからユーザー情報を取得
      if (responseData.user) {
        data = { user: responseData.user, session: responseData.session || null };
        logger.debug('[signUpNew] 新規登録API完了:', { 
          hasData: !!data, 
          hasUser: !!data?.user,
          hasSession: !!data?.session,
          hasAccessToken: !!responseData.access_token,
          hasRefreshToken: !!responseData.refresh_token,
          elapsed: `${elapsed}ms`
        });
        
        // セッション情報を取得（responseData.sessionまたはresponseDataから直接取得）
        const accessToken = responseData.access_token || responseData.session?.access_token;
        const refreshToken = responseData.refresh_token || responseData.session?.refresh_token;
        const sessionUser = responseData.user || responseData.session?.user;
        
        logger.debug('[signUpNew] セッション情報抽出:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasSessionUser: !!sessionUser,
          accessTokenSource: responseData.access_token ? 'responseData' : (responseData.session?.access_token ? 'session' : 'none'),
        });
        
        // セッション情報が含まれている場合は、localStorageに直接保存（setSessionがタイムアウトする問題を回避）
        if (accessToken && refreshToken && sessionUser) {
          try {
            logger.debug('[signUpNew] セッションをlocalStorageに直接保存開始');
            
            // Supabaseが使用するストレージキー（supabase.tsで設定されたキー）
            const storageKey = 'music-practice-auth';
            const expiresAt = responseData.expires_at || responseData.session?.expires_at || Math.floor(Date.now() / 1000) + 3600;
            
            // Supabaseが期待する形式でセッションデータを構築
            const sessionData = {
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_at: expiresAt,
              expires_in: responseData.expires_in || responseData.session?.expires_in || 3600,
              token_type: responseData.token_type || responseData.session?.token_type || 'bearer',
              user: sessionUser,
            };
            
            // Supabaseが期待する形式で保存（currentSessionを含む）
            const storageValue = JSON.stringify({
              currentSession: sessionData,
              expiresAt: expiresAt,
            });
            
            if (typeof window !== 'undefined' && window.localStorage) {
              // localStorageに直接保存
              window.localStorage.setItem(storageKey, storageValue);
              
              // 保存後の確認
              const savedValue = window.localStorage.getItem(storageKey);
              const savedData = savedValue ? JSON.parse(savedValue) : null;
              logger.info('[signUpNew] セッションをlocalStorageに保存完了:', { 
                userId: sessionUser?.id,
                storageKey,
                hasSaved: !!savedValue,
                hasCurrentSession: !!savedData?.currentSession,
                hasUser: !!savedData?.currentSession?.user,
                hasAccessToken: !!savedData?.currentSession?.access_token,
                hasRefreshToken: !!savedData?.currentSession?.refresh_token,
              });
              
              // Supabaseクライアントのカスタムストレージにも保存（確実に読み込めるように）
              try {
                const authStorage = (supabase as any).auth?.storage;
                if (authStorage && typeof authStorage.setItem === 'function') {
                  const setItemResult = authStorage.setItem(storageKey, storageValue);
                  if (setItemResult && typeof setItemResult.catch === 'function') {
                    // Promiseの場合
                    setItemResult.catch((error: any) => {
                      logger.warn('[signUpNew] Supabaseストレージへの保存に失敗（続行）:', error);
                    });
                  }
                  logger.debug('[signUpNew] セッションをSupabaseストレージにも保存しました');
                } else {
                  logger.warn('[signUpNew] Supabaseストレージが利用できません');
                }
              } catch (storageError) {
                logger.warn('[signUpNew] Supabaseストレージへの保存に失敗（続行）:', storageError);
              }
            } else {
              logger.warn('[signUpNew] window.localStorageが利用できません');
            }
            
            // 非同期でsetSessionも試行（タイムアウト機能を削除、失敗しても続行）
            // localStorageに保存済みのため、setSessionが失敗しても問題ない
            (async () => {
              try {
                await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
                logger.debug('[signUpNew] setSession完了');
              } catch (setSessionError) {
                logger.warn('[signUpNew] setSessionエラー（localStorageに保存済みのため続行）:', setSessionError);
              }
            })();
          } catch (storageError) {
            logger.warn('[signUpNew] セッション保存エラー（続行）:', storageError);
            // セッション保存に失敗しても続行（ユーザーは作成されている）
          }
        } else {
          logger.warn('[signUpNew] セッション情報が不完全:', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            hasSessionUser: !!sessionUser,
          });
        }
      } else {
        logger.error('[signUpNew] ユーザー情報が取得できませんでした');
        return {
          success: false,
          error: 'ユーザー情報が取得できませんでした。',
        };
      }
    } catch (signUpError: any) {
      const elapsed = Date.now() - signUpStartTime;
      logger.error('[signUpNew] 新規登録例外:', { 
        error: signUpError?.message || signUpError,
        elapsed: `${elapsed}ms`
      });
      
      return {
        success: false,
        error: translateError(signUpError),
      };
    }

    // エラーチェック
    if (error) {
      logger.error('[signUpNew] 新規登録エラー:', { error: error.message, code: error.status });
      return {
        success: false,
        error: translateError(error),
      };
    }

    // ユーザー情報の確認
    if (!data || !data.user) {
      logger.error('[signUpNew] ユーザー情報が取得できませんでした');
      return {
        success: false,
        error: 'ユーザー情報が取得できませんでした。',
      };
    }

    const userId = data.user.id;
    
    logger.info('[signUpNew] 新規登録成功:', { 
      userId, 
      email: normalizedEmail,
      hasSession: !!data.session,
      displayName: displayName?.trim() || normalizedEmail.split('@')[0],
    });

    // プロフィールはデータベーストリガーで自動作成されることを前提とする
    // ただし、トリガーが動作しない場合に備えて、明示的にプロフィール作成を試みる（非同期、エラーは無視）
    if (displayName) {
      (async () => {
        try {
          const { createUserProfile } = await import('./authHelpers');
          const profileResult = await createUserProfile(userId, displayName.trim());
          if (profileResult.success) {
            logger.debug('[signUpNew] プロフィール作成成功（明示的）');
          } else {
            logger.debug('[signUpNew] プロフィール作成結果:', profileResult.error || '不明');
          }
        } catch (profileError) {
          logger.warn('[signUpNew] プロフィール作成エラー（トリガーに任せる）:', profileError);
          // エラーは無視（トリガーで作成される可能性があるため）
        }
      })();
    }
    
    // セッション管理はSupabaseクライアントに完全に任せる
    // セッションが返されない場合でも、Supabaseクライアントが自動的に処理する

    return {
      success: true,
      userId,
      email: normalizedEmail,
    };
  } catch (error: any) {
    logger.error('[signUpNew] 新規登録例外:', { error: error?.message || error });
    return {
      success: false,
      error: translateError(error),
    };
  }
}
