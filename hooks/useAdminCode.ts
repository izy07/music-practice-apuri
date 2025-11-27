/**
 * 管理者コード管理のカスタムフック
 * 
 * 管理者コードの設定・検証に関するロジックをフックに抽出
 * 
 * @module hooks/useAdminCode
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { adminCodeService } from '@/services/adminCodeService';
import type { SetAdminCodeInput } from '@/types/organization';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

/**
 * 管理者コード管理フックの戻り値
 */
export interface UseAdminCodeReturn {
  /** ローディング状態 */
  loading: boolean;
  
  /** エラーメッセージ */
  error: string | null;
  
  /** 管理者コードを設定 */
  setAdminCode: (input: SetAdminCodeInput) => Promise<boolean>;
  
  /** 管理者コードで管理者になる */
  becomeAdminByCode: (organizationId: string, adminCode: string) => Promise<boolean>;
  
  /** エラーをクリア */
  clearError: () => void;
}

/**
 * 管理者コード管理のカスタムフック
 * 
 * @returns 管理者コード管理に関する状態と関数
 */
export function useAdminCode(): UseAdminCodeReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 管理者コードを設定
   */
  const setAdminCode = useCallback(
    async (input: SetAdminCodeInput): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const result = await adminCodeService.setAdminCode(input);
        
        if (result.success) {
          Alert.alert('成功', '管理者コードが設定されました');
          return true;
        } else {
          setError(result.error || '管理者コードの設定に失敗しました');
          Alert.alert('エラー', result.error || '管理者コードの設定に失敗しました');
          return false;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '管理者コードの設定に失敗しました';
        setError(errorMessage);
        Alert.alert('エラー', errorMessage);
        ErrorHandler.handle(err, '管理者コード設定', false);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * 管理者コードで管理者になる
   */
  const becomeAdminByCode = useCallback(
    async (organizationId: string, adminCode: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const result = await adminCodeService.becomeAdminByCode(organizationId, adminCode);
        
        if (result.success) {
          Alert.alert('成功', '管理者になりました');
          return true;
        } else {
          setError(result.error || '管理者コードが正しくありません');
          Alert.alert('エラー', result.error || '管理者コードが正しくありません');
          return false;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '管理者コードの認証に失敗しました';
        setError(errorMessage);
        Alert.alert('エラー', errorMessage);
        ErrorHandler.handle(err, '管理者コード認証', false);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    setAdminCode,
    becomeAdminByCode,
    clearError,
  };
}

