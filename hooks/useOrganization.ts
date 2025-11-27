/**
 * 組織管理のカスタムフック
 * 
 * 組織管理に関するロジックをフックに抽出し、UI層から分離
 * 
 * @module hooks/useOrganization
 */

import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import {
  organizationService,
  type CreateOrganizationResult,
} from '@/services/organizationService';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import type {
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  JoinOrganizationInput,
} from '@/types/organization';

/**
 * 組織管理フックの戻り値
 */
export interface UseOrganizationReturn {
  /** 組織一覧 */
  organizations: Organization[];
  
  /** ローディング状態 */
  loading: boolean;
  
  /** エラーメッセージ */
  error: string | null;
  
  /** 組織一覧を読み込む */
  loadOrganizations: () => Promise<void>;
  
  /** 組織を作成 */
  createOrganization: (
    input: CreateOrganizationInput
  ) => Promise<CreateOrganizationResult | null>;
  
  /** 組織を更新 */
  updateOrganization: (
    id: string,
    input: UpdateOrganizationInput
  ) => Promise<boolean>;
  
  /** 組織を削除 */
  deleteOrganization: (id: string) => Promise<boolean>;
  
  /** 組織に参加 */
  joinOrganization: (input: JoinOrganizationInput) => Promise<Organization | null>;
  
  /** 組織名で検索 */
  searchOrganizations: (name: string) => Promise<Organization[]>;
  
  /** エラーをクリア */
  clearError: () => void;
}

/**
 * 組織管理のカスタムフック
 * 
 * @returns 組織管理に関する状態と関数
 */
export function useOrganization(): UseOrganizationReturn {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 認証状態変更時に組織データをクリア
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_OUT') {
        // ログアウト時に組織データをクリア
        setOrganizations([]);
        setError(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * 組織一覧を読み込む
   */
  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await organizationService.getUserOrganizations();
      
      if (result.success && result.data) {
        setOrganizations(result.data);
      } else {
        setError(result.error || '組織の取得に失敗しました');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '組織の取得に失敗しました';
      setError(errorMessage);
      ErrorHandler.handle(err, '組織読み込み', false);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 組織を作成
   */
  const createOrganization = useCallback(
    async (input: CreateOrganizationInput): Promise<CreateOrganizationResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await organizationService.createOrganization(input);
        
        if (result.success && result.data) {
          // 組織一覧を再読み込み
          await loadOrganizations();
          return result.data;
        } else {
          setError(result.error || '組織の作成に失敗しました');
          Alert.alert('エラー', result.error || '組織の作成に失敗しました');
          return null;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '組織の作成に失敗しました';
        setError(errorMessage);
        Alert.alert('エラー', errorMessage);
        ErrorHandler.handle(err, '組織作成', false);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [loadOrganizations]
  );

  /**
   * 組織を更新
   */
  const updateOrganization = useCallback(
    async (id: string, input: UpdateOrganizationInput): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const result = await organizationService.updateOrganization(id, input);
        
        if (result.success) {
          // 組織一覧を再読み込み
          await loadOrganizations();
          return true;
        } else {
          setError(result.error || '組織の更新に失敗しました');
          Alert.alert('エラー', result.error || '組織の更新に失敗しました');
          return false;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '組織の更新に失敗しました';
        setError(errorMessage);
        Alert.alert('エラー', errorMessage);
        ErrorHandler.handle(err, '組織更新', false);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadOrganizations]
  );

  /**
   * 組織を削除
   */
  const deleteOrganization = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const result = await organizationService.deleteOrganization(id);
        
        if (result.success) {
          // 組織一覧を再読み込み
          await loadOrganizations();
          return true;
        } else {
          setError(result.error || '組織の削除に失敗しました');
          Alert.alert('エラー', result.error || '組織の削除に失敗しました');
          return false;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '組織の削除に失敗しました';
        setError(errorMessage);
        Alert.alert('エラー', errorMessage);
        ErrorHandler.handle(err, '組織削除', false);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadOrganizations]
  );

  /**
   * 組織に参加
   */
  const joinOrganization = useCallback(
    async (input: JoinOrganizationInput): Promise<Organization | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await organizationService.joinOrganization(input);
        
        if (result.success && result.data) {
          // 組織一覧を再読み込み
          await loadOrganizations();
          return result.data;
        } else {
          setError(result.error || '組織への参加に失敗しました');
          Alert.alert('エラー', result.error || '組織への参加に失敗しました');
          return null;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '組織への参加に失敗しました';
        setError(errorMessage);
        Alert.alert('エラー', errorMessage);
        ErrorHandler.handle(err, '組織参加', false);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [loadOrganizations]
  );

  /**
   * 組織名で検索
   */
  const searchOrganizations = useCallback(
    async (name: string): Promise<Organization[]> => {
      setLoading(true);
      setError(null);

      try {
        const result = await organizationService.searchByName(name);
        
        if (result.success && result.data) {
          return result.data;
        } else {
          setError(result.error || '組織の検索に失敗しました');
          return [];
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '組織の検索に失敗しました';
        setError(errorMessage);
        ErrorHandler.handle(err, '組織検索', false);
        return [];
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
    organizations,
    loading,
    error,
    loadOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    joinOrganization,
    searchOrganizations,
    clearError,
  };
}

