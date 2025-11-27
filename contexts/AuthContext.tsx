/**
 * 認証状態の一元管理 - 世に出回っているアプリの一般的なパターン
 * 
 * 特徴:
 * - 認証状態を一元管理
 * - 認証状態の変更を監視
 * - 新規登録画面では認証状態を無視
 * - 認証成功時は自動的にメインアプリに遷移
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import logger from '@/lib/logger';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isInitialized: false,
  });

  // 認証状態の変更を監視（一元管理）
  useEffect(() => {
    logger.debug('認証状態の監視開始');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.debug('認証状態変更:', event, session?.user?.email || 'none');
        
        setAuthState({
          user: session?.user || null,
          isLoading: false,
          isInitialized: true,
        });
      }
    );

    return () => {
      logger.debug('認証状態の監視終了');
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    logger.debug('ログアウト処理開始');
    await supabase.auth.signOut();
    setAuthState({
      user: null,
      isLoading: false,
      isInitialized: true,
    });
    logger.debug('ログアウト完了');
  };

  const value: AuthContextType = {
    ...authState,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};