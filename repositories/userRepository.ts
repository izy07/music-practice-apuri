/**
 * ユーザープロフィールリポジトリ
 * user_profilesテーブルへのアクセスを集約
 */

import { supabase } from '@/lib/supabase';
import { safeExecute, createResult, RepositoryResult } from '@/lib/database/baseRepository';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { instrumentService } from '@/services';
import { Platform } from 'react-native';

// Web環境（GitHub Pages等）では直接インポートを使用（動的インポートが動作しない場合があるため）
// モバイル環境では動的インポートで遅延読み込み（軽量化）
import { ensureInstrumentExists as staticEnsureInstrumentExists } from '@/lib/instrumentValidation';

const REPOSITORY_CONTEXT = 'userRepository';

/**
 * user_profiles テーブルに実際に存在する書き込み可能カラム（スキーマと一致させる）。
 * avatar_url, nickname, birthday, music_start_age, music_experience_years 等は
 * スキーマにないため含めない（ニックネーム・生年月日等は instrument_specific_data に格納）。
 */
const USER_PROFILES_WRITABLE_COLUMNS = [
  'display_name',
  'selected_instrument_id',
  'practice_level',
  'level_selected_at',
  'total_practice_minutes',
  'tutorial_completed',
  'tutorial_completed_at',
  'onboarding_completed',
  'onboarding_completed_at',
  'instrument_specific_data',
  'updated_at',
] as const;

function pickUserProfileColumns<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of USER_PROFILES_WRITABLE_COLUMNS) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = (obj as Record<string, unknown>)[key];
    }
  }
  return result;
}

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
  custom_instrument_name?: string;
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
      
      // すべてのプロフィールカラムを取得（楽器に関係なく一律に同じデータを表示）
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
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
      
      // user_id は upsert の conflict キーかつ RLS で必須のため必ず含める
      const payload = {
        ...(profile.user_id != null && { user_id: profile.user_id }),
        ...pickUserProfileColumns(profile as Record<string, unknown>),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(payload, { onConflict: 'user_id' })
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
/**
 * アバターURLを user_profiles に保存しようとする。
 * 注意: 現在の DB スキーマに avatar_url カラムは存在しないため、
 * 実際の更新は行わず成功として返す。アバターは auth.users.user_metadata.avatar_url で参照すること。
 */
export const updateAvatarUrl = async (
  userId: string,
  url: string
): Promise<RepositoryResult<void>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] updateAvatarUrl:start (no-op: avatar_url not in schema)`, { userId, url });
      // user_profiles に avatar_url カラムがないため DB 更新は行わない。アバターは user_metadata から利用する。
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
      
      // instrument_idが存在するか確認し、存在しない場合は作成を試みる（共通ユーティリティ関数を使用）
      if (instrumentId) {
        // その他楽器の場合は、データベースに存在することを確認し、存在しない場合は作成
        if (instrumentId === '550e8400-e29b-41d4-a716-446655440016') { // OTHER_INSTRUMENT_ID
          const { data: instrumentExists, error: checkError } = await supabase
            .from('instruments')
            .select('id')
            .eq('id', instrumentId)
            .maybeSingle();

          if (checkError) {
            logger.error(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:その他楽器存在確認エラー:`, checkError);
            throw checkError;
          }

          if (!instrumentExists) {
            logger.warn(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:その他楽器が存在しないため、作成を試みます`, { instrumentId });
            const { error: createError } = await supabase
              .from('instruments')
              .upsert({
                id: instrumentId,
                name: 'その他',
                name_en: 'Other',
                color_primary: '#4682B4',
                color_secondary: '#87CEEB',
                color_accent: '#2F4F4F',
                background_color: '#E0F6FF',
                surface_color: '#FFFFFF',
                starting_note: 'C4',
                tuning_notes: ['C4'],
              }, { onConflict: 'id' });

            if (createError) {
              logger.error(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:その他楽器作成エラー:`, createError);
              throw createError;
            }
            logger.debug(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:その他楽器を作成しました`, { instrumentId });
          }
        } else {
          // その他の楽器の場合は、既存のensureInstrumentExistsロジックを使用
          const isWeb = Platform.OS === 'web' || (typeof window !== 'undefined' && typeof document !== 'undefined');
          let instrumentExists = false;
          if (isWeb) {
            instrumentExists = await staticEnsureInstrumentExists(instrumentId);
          } else {
            const { ensureInstrumentExists } = await import('@/lib/instrumentValidation');
            instrumentExists = await ensureInstrumentExists(instrumentId);
          }
          
          // 楽器が存在しない場合は警告を出して続行
          // 外部キー制約違反が発生する可能性があるが、その場合は後続の処理でエラーが発生する
          if (!instrumentExists) {
            logger.warn(`[${REPOSITORY_CONTEXT}] updateSelectedInstrument:楽器が存在しませんが、続行します`, { instrumentId });
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
          
          // 外部キー制約違反の場合、楽器が存在するか確認
          // 注意: 楽器の作成は試みません（RLSポリシーにより通常ユーザーは作成不可）
          if (isForeignKeyError && instrumentId) {
            // Web環境では直接インポートを使用、モバイル環境では動的インポートを使用
            const isWeb = Platform.OS === 'web' || (typeof window !== 'undefined' && typeof document !== 'undefined');
            let instrumentExists = false;
            if (isWeb) {
              instrumentExists = await staticEnsureInstrumentExists(instrumentId);
            } else {
              const { ensureInstrumentExists } = await import('@/lib/instrumentValidation');
              instrumentExists = await ensureInstrumentExists(instrumentId);
            }
            
            // 楽器が存在しない場合はエラーを返す
            if (!instrumentExists) {
              const error = new Error(`楽器ID ${instrumentId} がデータベースに存在しません。管理者に連絡して楽器を作成してもらってください。`);
              (error as any).code = '23503';
              (error as any).status = 400;
              throw error;
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
  
  const safeUpdates = pickUserProfileColumns(updates as Record<string, unknown>);

  const result = await safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] updateUserProfile:start`, { userId, updates });
      
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...safeUpdates,
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
                ...safeUpdates,
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
                .update({ ...safeUpdates, updated_at: new Date().toISOString() })
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
          console.error('user_profiles更新エラー（詳細）:', {
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
          
          // 外部キー制約違反の場合は、エラーを適切に処理（楽器が存在しない場合）
          if (error.code === '23503' || (error.message?.includes('violates foreign key constraint') && error.message?.includes('instruments'))) {
            logger.error(`[${REPOSITORY_CONTEXT}] updateUserProfile:外部キー制約違反 - selected_instrument_idが無効です`, {
              userId,
              updates,
              error: {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
              }
            });
            
            // selected_instrument_idを除外して再試行（楽器が存在しない場合はNULLに設定）
            const { selected_instrument_id, ...updatesWithoutInstrument } = updates as Record<string, unknown>;
            const retryPayload = { ...pickUserProfileColumns(updatesWithoutInstrument), selected_instrument_id: null, updated_at: new Date().toISOString() };
            if (Object.keys(retryPayload).length > 0) {
              const { error: retryError } = await supabase
                .from('user_profiles')
                .update(retryPayload)
                .eq('user_id', userId)
                .select('id, user_id, display_name, selected_instrument_id');
              
              if (retryError) {
                logger.error(`[${REPOSITORY_CONTEXT}] updateUserProfile:再試行も失敗`, {
                  error: retryError,
                  code: retryError.code,
                  message: retryError.message
                });
                // エラーを適切にスロー（呼び出し側で処理できるように）
                throw new Error(`プロフィールの更新に失敗しました: ${retryError.message || '不明なエラー'}`);
              }
              
              logger.warn(`[${REPOSITORY_CONTEXT}] updateUserProfile:selected_instrument_idをNULLに設定して更新成功（楽器が存在しないため）`);
              // 成功した場合はここで終了（ただし、楽器IDが無効だったことを記録）
              // 呼び出し側で適切に処理できるように、エラーをスローするか、成功フラグを返す
              return; // 成功した場合はここで終了
            } else {
              // selected_instrument_id以外に更新項目がない場合は、エラーをスロー
              throw new Error(`選択された楽器が存在しません。楽器ID: ${updates.selected_instrument_id}`);
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

/**
 * 楽器ごとのプロフィールデータを取得
 */
export const getInstrumentSpecificProfileData = async (
  userId: string,
  instrumentId: string
): Promise<RepositoryResult<any>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] getInstrumentSpecificProfileData:start`, { userId, instrumentId });
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('instrument_specific_data')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      // instrument_specific_dataが存在しない場合は空のオブジェクトを返す
      const instrumentData = data?.instrument_specific_data || {};
      const result = instrumentData[instrumentId] || {};

      logger.debug(`[${REPOSITORY_CONTEXT}] getInstrumentSpecificProfileData:success`);
      return result;
    },
    `${REPOSITORY_CONTEXT}.getInstrumentSpecificProfileData`
  );
};

/**
 * 楽器ごとのプロフィールデータを保存
 */
export const saveInstrumentSpecificProfileData = async (
  userId: string,
  instrumentId: string,
  data: any
): Promise<RepositoryResult<void>> => {
  return safeExecute(
    async () => {
      logger.debug(`[${REPOSITORY_CONTEXT}] saveInstrumentSpecificProfileData:start`, { userId, instrumentId, data });
      
      // 既存のinstrument_specific_dataを取得
      const { data: profile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('instrument_specific_data')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // 既存のデータをマージ
      const existingData = profile?.instrument_specific_data || {};
      const updatedData = {
        ...existingData,
        [instrumentId]: data,
      };

      // プロフィールが存在しない場合はupsert、存在する場合はupdate
      const { error } = profile
        ? await supabase
            .from('user_profiles')
            .update({
              instrument_specific_data: updatedData,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
        : await supabase
            .from('user_profiles')
            .upsert({
              user_id: userId,
              instrument_specific_data: updatedData,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

      if (error) {
        throw error;
      }

      logger.debug(`[${REPOSITORY_CONTEXT}] saveInstrumentSpecificProfileData:success`);
    },
    `${REPOSITORY_CONTEXT}.saveInstrumentSpecificProfileData`
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
  getInstrumentSpecificProfileData,
  saveInstrumentSpecificProfileData,
};

export default userRepository;


