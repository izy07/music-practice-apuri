/**
 * ユーザープロフィールリポジトリ
 * user_profilesテーブルへのアクセスを集約
 */

import { supabase } from '@/lib/supabase';
import { safeExecute, createResult, RepositoryResult } from '@/lib/database/baseRepository';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { instrumentService } from '@/services';

const REPOSITORY_CONTEXT = 'userRepository';

export interface UserProfile {
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  practice_level?: string;
  selected_instrument_id?: string;
  organization?: string;
  current_organization?: string;
  nickname?: string;
  bio?: string;
  birthday?: string;
  current_age?: number;
  music_start_age?: number;
  music_experience_years?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * ユーザープロフィールを取得
 */
export const getUserProfile = async (
  userId: string
): Promise<RepositoryResult<UserProfile | null>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] getUserProfile:start`, { userId });
      
      // 最小限のカラムのみを選択（存在が確実なカラムのみ）
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, user_id, display_name, selected_instrument_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] getUserProfile:success`);
      return data;
    },
    `${REPOSITORY_CONTEXT}.getUserProfile`
  );
};

/**
 * ユーザープロフィールを更新または作成
 */
export const upsertUserProfile = async (
  profile: Partial<UserProfile>
): Promise<RepositoryResult<UserProfile | null>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] upsertUserProfile:start`, { profile });
      
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(
          {
            ...profile,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select('id, user_id, display_name, selected_instrument_id')
        .single();

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] upsertUserProfile:success`);
      return data;
    },
    `${REPOSITORY_CONTEXT}.upsertUserProfile`
  );
};

/**
 * 練習レベルを更新
 */
export const updatePracticeLevel = async (
  userId: string,
  level: string
): Promise<RepositoryResult<void>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] updatePracticeLevel:start`, { userId, level });
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          practice_level: level,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      // レコードが存在しない場合はupsertを試みる
      if (error && (error.code === 'PGRST116' || error.code === 'PGRST205' || (error.status === 400 && error.message?.includes('No rows found')))) {
        logger.warn(`[${REPOSITORY_CONTEXT}] updatePracticeLevel:レコードが存在しないためupsertを試みます`, { userId, level });
        
        const { error: upsertError } = await supabase
          .from('user_profiles')
          .upsert(
            {
              user_id: userId,
              practice_level: level,
              updated_at: new Date().toISOString(),
              display_name: undefined,
              total_practice_minutes: 0,
            },
            { onConflict: 'user_id' }
          );
        
        if (upsertError) {
          throw upsertError;
        }
        
        logger.debug(`[${REPOSITORY_CONTEXT}] updatePracticeLevel:upsert成功`);
        return;
      }

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] updatePracticeLevel:success`);
    },
    `${REPOSITORY_CONTEXT}.updatePracticeLevel`
  );
};

/**
 * アバターURLを更新
 */
export const updateAvatarUrl = async (
  userId: string,
  url: string
): Promise<RepositoryResult<void>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] updateAvatarUrl:start`, { userId, url });
      
      const { error } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: userId,
            avatar_url: url,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] updateAvatarUrl:success`);
    },
    `${REPOSITORY_CONTEXT}.updateAvatarUrl`
  );
};

/**
 * 選択楽器IDを更新
 */
export const updateSelectedInstrument = async (
  userId: string,
  instrumentId: string | null
): Promise<RepositoryResult<void>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:start`, { userId, instrumentId });
      
      // instrument_idが存在するか確認（nullの場合はスキップ）
      if (instrumentId) {
        // その他楽器のIDの場合はスキップ
        if (instrumentId === '550e8400-e29b-41d4-a716-446655440016') {
          // その他楽器の場合は存在確認をスキップ
        } else {
          const { data: instrumentExists, error: checkError } = await supabase
            .from('instruments')
            .select('id')
            .eq('id', instrumentId)
            .maybeSingle();
          
          if (checkError) {
            logger.error(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:checkError`, checkError);
            throw checkError;
          }
          
          // 楽器が存在しない場合は、デフォルト楽器データから作成を試みる
          if (!instrumentExists) {
            logger.warn(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:楽器が存在しないため、作成を試みます`, { instrumentId });
            
            // デフォルト楽器データから該当楽器を取得
            const defaultInstruments = instrumentService.getDefaultInstruments();
            const defaultInstrument = defaultInstruments.find(inst => inst.id === instrumentId);
            
            if (defaultInstrument) {
              // 楽器をデータベースに作成
              const { error: createError } = await supabase
                .from('instruments')
                .upsert({
                  id: defaultInstrument.id,
                  name: defaultInstrument.name,
                  name_en: defaultInstrument.nameEn,
                  color_primary: defaultInstrument.primary,
                  color_secondary: defaultInstrument.secondary,
                  color_accent: defaultInstrument.accent,
                }, {
                  onConflict: 'id'
                });
              
              if (createError) {
                logger.error(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:楽器作成エラー`, createError);
                // 楽器作成に失敗した場合はエラーを投げる（外部キー制約違反を防ぐため）
                const error = new Error(`楽器の作成に失敗しました: ${createError.message || 'Unknown error'}`);
                (error as any).code = createError.code;
                (error as any).status = createError.status;
                throw error;
              } else {
                logger.debug(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:楽器を作成しました`, { instrumentId });
              }
            } else {
              // デフォルト楽器データにも存在しない場合はエラー
              const error = new Error(`楽器ID ${instrumentId} が存在しません`);
              logger.error(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:invalidInstrumentId`, { instrumentId });
              throw error;
            }
          }
        }
      }
      
      // まずレコードの存在確認
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id, user_id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116（レコードが存在しない）以外のエラーの場合
        logger.error(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:checkError`, checkError);
        throw checkError;
      }
      
      // レコードが存在しない場合はupsertを試みる
      if (!existingProfile) {
        logger.warn(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:レコードが存在しないためupsertを試みます`, { userId, instrumentId });
        
        // 最小限のカラムのみを使用（存在が確実なカラムのみ）
        const { error: upsertError } = await supabase
          .from('user_profiles')
          .upsert(
            {
              user_id: userId,
              selected_instrument_id: instrumentId,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
        
        if (upsertError) {
          // 409エラー（Conflict）の場合：既にレコードが存在する可能性があるため、updateにフォールバック
          if (upsertError.code === '23505' || upsertError.status === 409 || (upsertError.message?.includes('duplicate key') || upsertError.message?.includes('already exists'))) {
            logger.warn(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:409エラー - updateにフォールバック`, { userId, instrumentId });
            
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({
                selected_instrument_id: instrumentId,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', userId);
            
            if (updateError) {
              throw updateError;
            }
            
            logger.debug(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:update成功（409エラーからのフォールバック）`);
            return;
          }
          
          throw upsertError;
        }
        
        logger.debug(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:upsert成功`);
        return;
      }
      
      // レコードが存在する場合はupdateを実行
      // ただし、400エラーが発生する可能性があるため、失敗時はupsertにフォールバック
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          selected_instrument_id: instrumentId,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        // エラーの詳細情報を取得
        const errorDetails = {
          status: updateError.status || updateError.code,
          message: updateError.message,
          code: updateError.code,
          details: (updateError as any).details,
          hint: (updateError as any).hint,
          userId,
          instrumentId,
        };
        
        // 400エラー、外部キー制約違反、またはその他のエラーの場合、upsertを試みる
        const is400Error = updateError.status === 400;
        const isForeignKeyError = updateError.code === '23503' || 
            (updateError.message?.includes('violates foreign key constraint') && updateError.message?.includes('instruments'));
        const isPGRSTError = updateError.code === 'PGRST116' || updateError.code === 'PGRST205';
        
        if (is400Error || isForeignKeyError || isPGRSTError) {
          logger.warn(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:updateエラー - upsertを試みます`, errorDetails);
          
          // 楽器が存在しない場合は、再度作成を試みる（外部キー制約違反の場合）
          if (isForeignKeyError && instrumentId && instrumentId !== '550e8400-e29b-41d4-a716-446655440016') {
            const defaultInstruments = instrumentService.getDefaultInstruments();
            const defaultInstrument = defaultInstruments.find(inst => inst.id === instrumentId);
            
            if (defaultInstrument) {
              // 楽器をデータベースに作成（upsertを使用して確実に作成）
              const { error: createError } = await supabase
                .from('instruments')
                .upsert({
                  id: defaultInstrument.id,
                  name: defaultInstrument.name,
                  name_en: defaultInstrument.nameEn,
                  color_primary: defaultInstrument.primary,
                  color_secondary: defaultInstrument.secondary,
                  color_accent: defaultInstrument.accent,
                }, {
                  onConflict: 'id'
                });
              
              if (createError) {
                logger.error(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:楽器作成再試行エラー`, createError);
                // 楽器作成に失敗した場合はエラーを投げる（外部キー制約違反を防ぐため）
                const error = new Error(`楽器の作成に失敗しました（再試行）: ${createError.message || 'Unknown error'}`);
                (error as any).code = createError.code;
                (error as any).status = createError.status;
                throw error;
              } else {
                logger.debug(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:楽器を作成しました（再試行）`, { instrumentId });
                
                // 楽器作成後に少し待機（データベースの反映を待つ）
                await new Promise(resolve => setTimeout(resolve, 300));
              }
            }
          }
          
          // upsertを試みる（レコードが存在しない場合や、外部キー制約違反を回避するため）
          const { error: upsertError } = await supabase
            .from('user_profiles')
            .upsert(
              {
                user_id: userId,
                selected_instrument_id: instrumentId,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
          
          if (upsertError) {
            // upsertも失敗した場合、詳細なエラー情報をログに出力
            logger.error(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:upsertも失敗`, {
              error: upsertError,
              userId,
              instrumentId,
              originalUpdateError: errorDetails,
            });
            throw upsertError;
          }
          
          logger.debug(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:upsert成功（updateエラーからのフォールバック）`);
          return;
        }
        
        // その他のエラーの場合
        logger.error(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:updateError`, errorDetails);
        throw updateError;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:success`);
    },
    `${REPOSITORY_CONTEXT}.updateSelectedInstrument`
  );
};

/**
 * ユーザープロフィールの特定フィールドを取得
 */
export const getUserProfileFields = async (
  userId: string,
  fields: string | string[]
): Promise<any> => {
  const fieldArray = Array.isArray(fields) ? fields : [fields];
  const result = await getUserProfile(userId);
  
  if (!result.data) {
    return null;
  }
  
  const data: any = {};
  fieldArray.forEach(field => {
    data[field] = (result.data as any)[field];
  });
  
  return fieldArray.length === 1 ? data[fieldArray[0]] : data;
};

/**
 * ユーザープロフィールを更新
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>
): Promise<boolean> => {
  // selected_instrument_idが含まれている場合は、存在確認を実行
  if (updates.selected_instrument_id !== undefined && updates.selected_instrument_id !== null) {
    const instrumentId = updates.selected_instrument_id;
    
    // その他楽器のIDの場合はスキップ
    if (instrumentId !== '550e8400-e29b-41d4-a716-446655440016') {
      const { data: instrumentExists, error: checkError } = await supabase
        .from('instruments')
        .select('id')
        .eq('id', instrumentId)
        .maybeSingle();
      
      if (checkError) {
        logger.error(`[${REPOSITORY_CONTEXT}] updateUserProfile:instrumentCheckError`, checkError);
        ErrorHandler.handle(checkError, '楽器ID確認', false);
        return false;
      }
      
      if (!instrumentExists) {
        logger.error(`[${REPOSITORY_CONTEXT}] updateUserProfile:invalidInstrumentId`, { instrumentId });
        ErrorHandler.handle(new Error(`楽器ID ${instrumentId} が存在しません`), '楽器ID確認', false);
        return false;
      }
    }
  }
  
  const result = await safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] updateUserProfile:start`, { userId, updates });
      
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select('id, user_id, display_name, selected_instrument_id');
      
      if (error) {
        // レコードが存在しない場合（PGRST116、PGRST205、または400エラー）はupsertを試みる
        const isRecordNotFound = error.code === 'PGRST116' || 
                                  error.code === 'PGRST205' || 
                                  (error.status === 400 && (
                                    error.message?.includes('No rows found') ||
                                    error.message?.includes('does not exist') ||
                                    error.message?.includes('not found')
                                  ));
        
        if (isRecordNotFound) {
          logger.warn(`[${REPOSITORY_CONTEXT}] updateUserProfile:レコードが存在しないためupsertを試みます`, { userId, updates, errorCode: error.code, errorStatus: error.status });
          
          // まず、レコードが本当に存在しないか確認
          const { data: existingProfile, error: checkError } = await supabase
            .from('user_profiles')
            .select('id, user_id')
            .eq('user_id', userId)
            .maybeSingle();
          
          // レコードが存在する場合は、updateを再試行
          if (existingProfile && !checkError) {
            logger.debug(`[${REPOSITORY_CONTEXT}] updateUserProfile:レコードは存在します - updateを再試行`, { userId });
            const { data: retryData, error: retryError } = await supabase
              .from('user_profiles')
              .update({
                ...updates,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', userId)
              .select('id, user_id, display_name, selected_instrument_id');
            
            if (retryError) {
              logger.error(`[${REPOSITORY_CONTEXT}] updateUserProfile:再試行も失敗`, retryError);
              throw retryError;
            }
            
            logger.debug(`[${REPOSITORY_CONTEXT}] updateUserProfile:再試行成功`, { data: retryData });
            return; // 成功した場合はここで終了
          }
          
          // レコードが存在しない場合はupsertで作成
          logger.debug(`[${REPOSITORY_CONTEXT}] updateUserProfile:レコードが存在しないためupsertで作成します`, { userId });
          
          // 最小限のカラムのみを使用（存在が確実なカラムのみ）
          const upsertData: any = {
            user_id: userId,
            updated_at: new Date().toISOString(),
          };
          
          // display_nameが指定されている場合は含める
          if (updates.display_name) {
            upsertData.display_name = updates.display_name;
          }
          
          // selected_instrument_idが指定されている場合は含める（ただし、外部キー制約違反を避けるため、存在確認済みの場合のみ）
          if (updates.selected_instrument_id !== undefined) {
            upsertData.selected_instrument_id = updates.selected_instrument_id;
          }
          
          // その他の更新フィールドを追加（存在が確実なカラムのみ）
          if (updates.practice_level) {
            upsertData.practice_level = updates.practice_level;
          }
          
          const { data: upsertResult, error: upsertError } = await supabase
            .from('user_profiles')
            .upsert(upsertData, { onConflict: 'user_id' })
            .select('id, user_id, display_name, selected_instrument_id')
            .single();
          
          if (upsertError) {
            // 409エラー（Conflict）の場合：既にレコードが存在する可能性があるため、updateにフォールバック
            if (upsertError.code === '23505' || upsertError.status === 409 || (upsertError.message?.includes('duplicate key') || upsertError.message?.includes('already exists'))) {
              logger.warn(`[${REPOSITORY_CONTEXT}] updateUserProfile:409エラー - updateにフォールバック`, { userId, updates });
              
              const { data: updateData, error: updateError } = await supabase
                .from('user_profiles')
                .update({
                  ...updates,
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', userId)
                .select('id, user_id, display_name, selected_instrument_id');
              
              if (updateError) {
                logger.error(`[${REPOSITORY_CONTEXT}] updateUserProfile:updateも失敗`, updateError);
                throw updateError;
              }
              
              logger.debug(`[${REPOSITORY_CONTEXT}] updateUserProfile:update成功（409エラーからのフォールバック）`, { data: updateData });
              return; // 成功した場合はここで終了
            }
            
            logger.error(`[${REPOSITORY_CONTEXT}] updateUserProfile:upsertも失敗`, upsertError);
            throw upsertError;
          }
          
          logger.debug(`[${REPOSITORY_CONTEXT}] updateUserProfile:upsert成功`, { data: upsertResult });
          return; // 成功した場合はここで終了
        }
        
        // 400エラーの場合、詳細な情報をログ出力
        if (error.status === 400) {
          // エラーの詳細をコンソールに出力（開発時のデバッグ用）
          console.error('❌ user_profiles更新エラー（詳細）:', {
            code: error.code,
            message: error.message,
            status: error.status,
            details: error.details,
            hint: error.hint,
            userId,
            updates,
            timestamp: new Date().toISOString()
          });
          
          logger.error(`[${REPOSITORY_CONTEXT}] updateUserProfile:400エラー`, {
            error: {
              code: error.code,
              message: error.message,
              status: error.status,
              details: error.details,
              hint: error.hint
            },
            userId,
            updates,
            possibleCauses: [
              'RLSポリシーが正しく設定されていない',
              'user_profilesテーブルが存在しない',
              'user_idカラムが存在しない',
              '権限が不足している',
              '外部キー制約違反（selected_instrument_idが存在しないinstruments.idを参照）',
              'カラムが存在しない',
              '更新しようとしているカラムが存在しない'
            ],
            troubleshooting: [
              'SupabaseダッシュボードでRLSポリシーを確認',
              'scripts/check_user_profiles_status.sqlを実行してテーブル状態を確認',
              'エラーのdetailsとhintを確認'
            ]
          });
          
          // 外部キー制約違反の場合は、エラーを無視して続行（楽器が存在しない場合）
          if (error.code === '23503' || (error.message?.includes('violates foreign key constraint') && error.message?.includes('instruments'))) {
            logger.warn(`[${REPOSITORY_CONTEXT}] updateUserProfile:外部キー制約違反 - selected_instrument_idをNULLに設定して再試行`, {
              userId,
              updates,
              error: error.message
            });
            
            // selected_instrument_idを除外して再試行
            const { selected_instrument_id, ...updatesWithoutInstrument } = updates;
            if (Object.keys(updatesWithoutInstrument).length > 0) {
              const { error: retryError } = await supabase
                .from('user_profiles')
                .update({
                  ...updatesWithoutInstrument,
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', userId)
                .select('id, user_id, display_name, selected_instrument_id');
              
              if (retryError) {
                logger.error(`[${REPOSITORY_CONTEXT}] updateUserProfile:再試行も失敗`, retryError);
                throw retryError;
              }
              
              logger.warn(`[${REPOSITORY_CONTEXT}] updateUserProfile:selected_instrument_idを除外して更新成功`);
              return; // 成功した場合はここで終了
            }
          }
        }
        throw error;
      }
      
      logger.debug(`[${REPOSITORY_CONTEXT}] updateUserProfile:success`, { data });
    },
    `${REPOSITORY_CONTEXT}.updateUserProfile`
  );
  
  return result.error === null;
};

/**
 * 現在のユーザーを取得
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user;
};

/**
 * ユーザーの休止期間を削除
 */
export const deleteBreakPeriod = async (
  breakPeriodId: string
): Promise<RepositoryResult<void>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] deleteBreakPeriod:start`, { breakPeriodId });
      
      const { error } = await supabase
        .from('user_break_periods')
        .delete()
        .eq('id', breakPeriodId);

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] deleteBreakPeriod:success`);
    },
    `${REPOSITORY_CONTEXT}.deleteBreakPeriod`
  );
};

/**
 * ユーザーの過去の所属団体を削除
 */
export const deletePastOrganization = async (
  organizationId: string
): Promise<RepositoryResult<void>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] deletePastOrganization:start`, { organizationId });
      
      const { error } = await supabase
        .from('user_past_organizations')
        .delete()
        .eq('id', organizationId);

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] deletePastOrganization:success`);
    },
    `${REPOSITORY_CONTEXT}.deletePastOrganization`
  );
};

/**
 * ユーザーの受賞を削除
 */
export const deleteAward = async (
  awardId: string
): Promise<RepositoryResult<void>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] deleteAward:start`, { awardId });
      
      const { error } = await supabase
        .from('user_awards')
        .delete()
        .eq('id', awardId);

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] deleteAward:success`);
    },
    `${REPOSITORY_CONTEXT}.deleteAward`
  );
};

/**
 * ユーザーの演奏経験を削除
 */
export const deletePerformance = async (
  performanceId: string
): Promise<RepositoryResult<void>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] deletePerformance:start`, { performanceId });
      
      const { error } = await supabase
        .from('user_performances')
        .delete()
        .eq('id', performanceId);

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] deletePerformance:success`);
    },
    `${REPOSITORY_CONTEXT}.deletePerformance`
  );
};

// 後方互換性のためのエクスポート
export const userRepository = {
  getProfile: getUserProfile,
  upsertProfile: upsertUserProfile,
  updatePracticeLevel,
  updateAvatarUrl,
  getCurrentUser,
  deleteBreakPeriod,
  deletePastOrganization,
  deleteAward,
  deletePerformance,
};

export default userRepository;


