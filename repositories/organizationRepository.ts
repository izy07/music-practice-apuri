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

      // user_group_membershipsとJOINして、現在のユーザーがメンバーである組織を取得
      // passwordフィールドも明示的に含める（作成者のみ表示可能）
      const { data: membershipData, error: membershipError } = await supabase
        .from('user_group_memberships')
        .select(`
          organization_id,
          organizations (
            *,
            password
          )
        `)
        .eq('user_id', user.id);

      // メンバーシップから取得した組織
      let organizationsFromMemberships: Organization[] = [];
      
      if (membershipError) {
        // 404エラーの場合、テーブルが存在しない可能性がある
        // これは正常な動作（テーブルが存在しない場合）なので、エラーとして扱わない
        const errorObj = membershipError as any;
        const errorCode = errorObj?.code;
        const errorStatus = errorObj?.status || errorObj?.statusCode;
        const errorMessage = errorObj?.message || String(membershipError);
        
        // エラーオブジェクト全体を文字列化して検索（より確実に404を検出）
        let errorString = '';
        try {
          errorString = JSON.stringify(errorObj).toLowerCase();
        } catch {
          // 循環参照などの場合は、エラーオブジェクトの主要プロパティを文字列化
          errorString = `${errorCode || ''} ${errorStatus || ''} ${errorMessage || ''}`.toLowerCase();
        }
        
        // 404エラーまたはテーブル不存在エラーを検出（より包括的に）
        const isNotFoundError = isSupabaseTableNotFoundError(membershipError) ||
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
        
        if (!isNotFoundError) {
          // 404以外のエラーは通常通り処理
          throw membershipError;
        }
        // 404エラーの場合は、メンバーシップから取得した組織は空配列のまま
      } else {
        // JOIN結果から組織データを抽出
        organizationsFromMemberships = (membershipData || [])
          .map((membership: any) => membership.organizations)
          .filter((org: any) => org !== null && org !== undefined);
      }

      // 組織作成者が作成した組織も取得（メンバーシップが存在しない場合でも表示されるように）
      // passwordフィールドも明示的に含める（作成者のみ表示可能）
      const { data: createdOrganizations, error: createdOrgsError } = await supabase
        .from('organizations')
        .select('*')
        .eq('created_by', user.id);

      let organizationsFromCreated: Organization[] = [];
      
      if (createdOrgsError) {
        // 404エラーの場合は無視
        const errorObj = createdOrgsError as any;
        const isNotFoundError = isSupabaseTableNotFoundError(createdOrgsError) ||
          errorObj?.code === 'PGRST116' || 
          errorObj?.code === 'PGRST205' ||
          errorObj?.status === 404;
        
        if (!isNotFoundError) {
          logger.warn('[organizationRepository] getUserOrganizations:作成した組織の取得に失敗', {
            error: createdOrgsError,
          });
        }
      } else {
        organizationsFromCreated = (createdOrganizations || []) as Organization[];
      }

      // メンバーシップから取得した組織と作成した組織をマージ（重複を除去）
      const organizationMap = new Map<string, Organization>();
      
      // まず、メンバーシップから取得した組織を追加
      // 作成者でない場合はpasswordフィールドを削除（セキュリティ）
      organizationsFromMemberships.forEach(org => {
        const orgCopy = { ...org };
        // 作成者でない場合はpasswordフィールドを削除
        if (orgCopy.created_by !== user.id) {
          delete orgCopy.password;
        }
        organizationMap.set(orgCopy.id, orgCopy);
      });
      
      // 次に、作成した組織を追加（既に存在する場合は上書きしない）
      // 作成した組織はpasswordフィールドを含む
      organizationsFromCreated.forEach(org => {
        if (!organizationMap.has(org.id)) {
          organizationMap.set(org.id, org);
        } else {
          // 既に存在する場合は、作成者の場合はpasswordフィールドを保持
          const existingOrg = organizationMap.get(org.id);
          if (existingOrg && org.created_by === user.id && org.password) {
            existingOrg.password = org.password;
          }
        }
      });

      const organizations = Array.from(organizationMap.values());

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
      // 現在のユーザーを取得して、作成者の場合はpasswordフィールドも取得
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        throw new Error('Organization not found');
      }

      // 作成者でない場合はpasswordフィールドを削除（セキュリティ）
      if (user && data.created_by !== user.id) {
        delete data.password;
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


