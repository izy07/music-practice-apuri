/**
 * 組織リポジトリ
 * 
 * 組織データへのアクセスを提供するリポジトリレイヤー
 * 
 * @module repositories/organizationRepository
 */

import { supabase } from '@/lib/supabase';
import type { Organization, UpdateOrganizationInput } from '@/types/organization';
import type { RepositoryResult } from '@/lib/database/interfaces';
import { safeExecute, normalizeError, isSupabaseTableNotFoundError } from '@/lib/database/baseRepository';
import { isOrganizationArray } from '@/types/organization';
import logger from '@/lib/logger';

/**
 * 組織リポジトリ
 */
export const organizationRepository = {
  /**
   * 現在のユーザーが参加している組織一覧を取得
   * user_group_membershipsとJOINして、確実に現在のユーザーがメンバーである組織のみを取得
   */
  async getUserOrganizations(): Promise<RepositoryResult<Organization[]>> {
    // 404エラーを特別に処理するため、safeExecuteを使わずに直接処理
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: [], error: null };
      }

      // user_group_membershipsとJOINして、現在のユーザーがメンバーである組織のみを取得
      const { data, error } = await supabase
        .from('user_group_memberships')
        .select(`
          organization_id,
          organizations (*)
        `)
        .eq('user_id', user.id);

      if (error) {
        // 404エラーの場合、テーブルが存在しない可能性がある
        // これは正常な動作（テーブルが存在しない場合）なので、エラーとして扱わない
        const errorObj = error as any;
        const errorCode = errorObj?.code;
        const errorStatus = errorObj?.status || errorObj?.statusCode;
        const errorMessage = errorObj?.message || String(error);
        
        // エラーオブジェクト全体を文字列化して検索（より確実に404を検出）
        let errorString = '';
        try {
          errorString = JSON.stringify(errorObj).toLowerCase();
        } catch {
          // 循環参照などの場合は、エラーオブジェクトの主要プロパティを文字列化
          errorString = `${errorCode || ''} ${errorStatus || ''} ${errorMessage || ''}`.toLowerCase();
        }
        
        // 404エラーまたはテーブル不存在エラーを検出（より包括的に）
        // まず、isSupabaseTableNotFoundError関数を使用
        const isNotFoundError = isSupabaseTableNotFoundError(error) ||
          errorCode === 'PGRST116' || 
          errorCode === 'PGRST205' ||
          errorStatus === 404 ||
          errorStatus === '404' ||
          Number(errorStatus) === 404 ||
          errorMessage?.toLowerCase().includes('404') ||
          errorMessage?.toLowerCase().includes('not found') ||
          errorMessage?.toLowerCase().includes('does not exist') ||
          (errorMessage?.toLowerCase().includes('relation') && errorMessage?.toLowerCase().includes('does not exist')) ||
          errorString.includes('404') ||
          errorString.includes('not found') ||
          errorString.includes('pgrst116') ||
          errorString.includes('pgrst205');
        
        if (isNotFoundError) {
          // デバッグモードでのみログに記録（本番環境では無視）
          if (__DEV__) {
            logger.debug('[organizationRepository] getUserOrganizations:テーブルが存在しないため空配列を返します', {
              code: errorCode,
              status: errorStatus,
              message: errorMessage?.substring(0, 100), // 最初の100文字のみ
            });
          }
          // テーブルが存在しない場合は空配列を返す（エラーとして扱わない）
          return { data: [], error: null };
        }
        // その他のエラーは通常通り処理
        throw error;
      }

      // JOIN結果から組織データを抽出
      const organizations = (data || [])
        .map((membership: any) => membership.organizations)
        .filter((org: any) => org !== null && org !== undefined);

      if (!isOrganizationArray(organizations)) {
        throw new Error('Invalid organizations payload');
      }

      // 作成日時でソート
      const sorted = organizations.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

      return { data: sorted, error: null };
    } catch (error) {
      // エラーが404エラーの可能性がある場合は再チェック
      const errorObj = error as any;
      const errorCode = errorObj?.code;
      const errorStatus = errorObj?.status || errorObj?.statusCode;
      const errorMessage = errorObj?.message || String(error);
      
      // エラーオブジェクト全体を文字列化して検索（より確実に404を検出）
      let errorString = '';
      try {
        errorString = JSON.stringify(errorObj).toLowerCase();
      } catch {
        errorString = String(error).toLowerCase();
      }
      
      // より包括的な404エラー検出
      // まず、isSupabaseTableNotFoundError関数を使用
      const isNotFoundError = isSupabaseTableNotFoundError(error) ||
        errorCode === 'PGRST116' || 
        errorCode === 'PGRST205' ||
        errorStatus === 404 ||
        errorStatus === '404' ||
        Number(errorStatus) === 404 ||
        errorMessage?.toLowerCase().includes('404') ||
        errorMessage?.toLowerCase().includes('not found') ||
        errorMessage?.toLowerCase().includes('does not exist') ||
        (errorMessage?.toLowerCase().includes('relation') && errorMessage?.toLowerCase().includes('does not exist')) ||
        errorString.includes('404') ||
        errorString.includes('not found') ||
        errorString.includes('pgrst116') ||
        errorString.includes('pgrst205');
      
      if (isNotFoundError) {
        // 404エラーの場合は空配列を返す（エラーとして扱わない）
        if (__DEV__) {
          logger.debug('[organizationRepository] getUserOrganizations:テーブルが存在しないため空配列を返します（catch）', {
            code: errorCode,
            status: errorStatus,
            message: errorMessage?.substring(0, 100),
          });
        }
        return { data: [], error: null };
      }
      
      // 404以外のエラーのみログに記録
      const normalizedError = normalizeError(error, 'getUserOrganizations');
      logger.error(`[organizationRepository] getUserOrganizations:error`, { error: normalizedError });
      return { data: null, error: normalizedError };
    }
  },

  /**
   * 組織IDで組織を取得
   */
  async findById(id: string): Promise<RepositoryResult<Organization>> {
    return safeExecute(async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        throw new Error('Organization not found');
      }

      return data as Organization;
    }, 'findById');
  },

  /**
   * 組織名で組織を検索
   */
  async searchByName(name: string, limit: number = 10): Promise<RepositoryResult<Organization[]>> {
    return safeExecute(async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, description')
        .ilike('name', `%${name}%`)
        .limit(limit);

      if (error) throw error;

      return (data || []) as Organization[];
    }, 'searchByName');
  },

  /**
   * 組織を作成
   */
  async create(data: {
    name: string;
    description?: string;
    password?: string;
    password_hash?: string;
    invite_code?: string;
    invite_code_hash?: string;
    invite_code_expires_at?: string;
    admin_code?: string;
    admin_code_hash?: string;
    is_solo?: boolean;
    created_by: string;
  }): Promise<RepositoryResult<Organization>> {
    return safeExecute(async () => {
      const { data: result, error } = await supabase
        .from('organizations')
        .insert(data)
        .select()
        .single();

      if (error) {
        logger.error('[organizationRepository] create:error', { 
          error: error.message, 
          code: error.code, 
          details: error.details,
          hint: error.hint,
          data: JSON.stringify(data, null, 2)
        });
        throw error;
      }
      if (!result) {
        throw new Error('Failed to create organization');
      }

      return result as Organization;
    }, 'create');
  },

  /**
   * 組織を更新
   */
  async update(
    id: string,
    data: UpdateOrganizationInput
  ): Promise<RepositoryResult<Organization>> {
    return safeExecute(async () => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (data.name !== undefined) {
        updateData.name = data.name;
      }
      if (data.description !== undefined) {
        updateData.description = data.description;
      }

      const { data: result, error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!result) {
        throw new Error('Failed to update organization');
      }

      return result as Organization;
    }, 'update');
  },

  /**
   * 管理者コードを設定
   */
  async setAdminCode(
    id: string,
    adminCode: string,
    adminCodeHash: string
  ): Promise<RepositoryResult<Organization>> {
    return safeExecute(async () => {
      const { data: result, error } = await supabase
        .from('organizations')
        .update({
          admin_code: adminCode,
          admin_code_hash: adminCodeHash,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!result) {
        throw new Error('Failed to set admin code');
      }

      return result as Organization;
    }, 'setAdminCode');
  },

  /**
   * 組織の作成者を取得
   */
  async getCreator(id: string): Promise<RepositoryResult<string | null>> {
    return safeExecute(async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('created_by')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        throw new Error('Organization not found');
      }

      return data.created_by || null;
    }, 'getCreator');
  },

  /**
   * 組織を削除
   */
  async delete(id: string): Promise<RepositoryResult<void>> {
    return safeExecute(async () => {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }, 'delete');
  },

  /**
   * 招待コードで組織を検索
   */
  async findByInviteCode(inviteCode: string): Promise<RepositoryResult<Organization | null>> {
    return safeExecute(async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('invite_code', inviteCode.toUpperCase())
        .gte('invite_code_expires_at', new Date().toISOString())
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        return null;
      }

      return data[0] as Organization;
    }, 'findByInviteCode');
  },
};

export default organizationRepository;


