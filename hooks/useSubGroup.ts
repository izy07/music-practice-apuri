/**
 * サブグループ管理のカスタムフック
 * 
 * サブグループ管理に関するロジックをフックに抽出し、UI層から分離
 * 
 * @module hooks/useSubGroup
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { subGroupService } from '@/services/subGroupService';
import type {
  SubGroup,
  CreateSubGroupInput,
} from '@/types/organization';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

/**
 * サブグループ管理フックの戻り値
 */
export interface UseSubGroupReturn {
  /** サブグループ一覧 */
  subGroups: SubGroup[];
  
  /** ローディング状態 */
  loading: boolean;
  
  /** エラーメッセージ */
  error: string | null;
  
  /** サブグループ一覧を読み込む */
  loadSubGroups: (organizationId: string) => Promise<void>;
  
  /** サブグループを作成 */
  createSubGroup: (
    organizationId: string,
    input: CreateSubGroupInput
  ) => Promise<SubGroup | null>;
  
  /** サブグループを更新 */
  updateSubGroup: (
    id: string,
    data: Partial<Pick<SubGroup, 'name' | 'group_type'>>
  ) => Promise<boolean>;
  
  /** サブグループを削除 */
  deleteSubGroup: (id: string) => Promise<boolean>;
  
  /** エラーをクリア */
  clearError: () => void;
}

/**
 * サブグループ管理のカスタムフック
 * 
 * @returns サブグループ管理に関する状態と関数
 */
export function useSubGroup(): UseSubGroupReturn {
  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * サブグループ一覧を読み込む
   */
  const loadSubGroups = useCallback(async (organizationId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await subGroupService.getByOrganizationId(organizationId);
      
      if (result.success && result.data) {
        setSubGroups(result.data);
      } else {
        setError(result.error || 'サブグループの取得に失敗しました');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'サブグループの取得に失敗しました';
      setError(errorMessage);
      ErrorHandler.handle(err, 'サブグループ読み込み', false);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * サブグループを作成
   */
  const createSubGroup = useCallback(
    async (
      organizationId: string,
      input: CreateSubGroupInput
    ): Promise<SubGroup | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await subGroupService.createSubGroup(organizationId, input);
        
        if (result.success && result.data) {
          // サブグループ一覧を再読み込み
          await loadSubGroups(organizationId);
          return result.data;
        } else {
          setError(result.error || 'サブグループの作成に失敗しました');
          Alert.alert('エラー', result.error || 'サブグループの作成に失敗しました');
          return null;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'サブグループの作成に失敗しました';
        setError(errorMessage);
        Alert.alert('エラー', errorMessage);
        ErrorHandler.handle(err, 'サブグループ作成', false);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [loadSubGroups]
  );

  /**
   * サブグループを更新
   */
  const updateSubGroup = useCallback(
    async (
      id: string,
      data: Partial<Pick<SubGroup, 'name' | 'group_type'>>
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const result = await subGroupService.updateSubGroup(id, data);
        
        if (result.success) {
          // サブグループ一覧を再読み込み（organizationIdが必要なので、現在のsubGroupsから取得）
          const subGroup = subGroups.find(sg => sg.id === id);
          if (subGroup) {
            await loadSubGroups(subGroup.organization_id);
          }
          return true;
        } else {
          setError(result.error || 'サブグループの更新に失敗しました');
          Alert.alert('エラー', result.error || 'サブグループの更新に失敗しました');
          return false;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'サブグループの更新に失敗しました';
        setError(errorMessage);
        Alert.alert('エラー', errorMessage);
        ErrorHandler.handle(err, 'サブグループ更新', false);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadSubGroups, subGroups]
  );

  /**
   * サブグループを削除
   */
  const deleteSubGroup = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const result = await subGroupService.deleteSubGroup(id);
        
        if (result.success) {
          // サブグループ一覧を再読み込み（organizationIdが必要なので、現在のsubGroupsから取得）
          const subGroup = subGroups.find(sg => sg.id === id);
          if (subGroup) {
            await loadSubGroups(subGroup.organization_id);
          }
          return true;
        } else {
          setError(result.error || 'サブグループの削除に失敗しました');
          Alert.alert('エラー', result.error || 'サブグループの削除に失敗しました');
          return false;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'サブグループの削除に失敗しました';
        setError(errorMessage);
        Alert.alert('エラー', errorMessage);
        ErrorHandler.handle(err, 'サブグループ削除', false);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadSubGroups, subGroups]
  );

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    subGroups,
    loading,
    error,
    loadSubGroups,
    createSubGroup,
    updateSubGroup,
    deleteSubGroup,
    clearError,
  };
}

