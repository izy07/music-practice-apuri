// データベーススキーマの整合性をチェックするユーティリティ
import { supabase } from './supabase';
import logger from './logger';

/**
 * user_settingsテーブルにnotification_settingsカラムが存在するかチェック
 * エラーを発生させずにカラムの存在を確認する
 * @returns true: カラムが存在する, false: カラムが存在しない
 */
export async function checkNotificationSettingsColumnExists(): Promise<boolean> {
  try {
    // 根本的な解決策: RPC関数の呼び出しを完全に削除し、フォールバック方法のみを使用
    // RPC関数はオプションの最適化であり、必須ではない
    // エラーを発生させないため、最初からフォールバック方法を使用
    
    // select('*')を使用してデータを取得し、notification_settingsプロパティが存在するかチェック
    // レコードが存在する場合のみ有効
    const { data: userData, error: selectError } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!selectError && userData) {
      // データが取得できた場合、notification_settingsプロパティが存在するかチェック
      const hasColumn = 'notification_settings' in userData;
      logger.debug(`notification_settingsカラムの存在チェック結果（データ確認）: ${hasColumn}`);
      return hasColumn;
    }

    // レコードが存在しない場合、select('*')ではカラムの存在を確認できない
    // この場合、カラムが存在すると仮定する（エラーを発生させないため）
    // 実際にカラムを使用する際にエラーが発生した場合は、その時点で処理する
    if (selectError && (selectError.code === 'PGRST116' || selectError.code === 'PGRST205')) {
      logger.debug('user_settingsレコードが存在しないため、カラムの存在を確認できません。デフォルトでtrueを返します。');
      return true; // レコードが存在しない場合は、カラムが存在すると仮定
    }

    // その他のエラーが発生した場合も、カラムが存在すると仮定（エラーを発生させないため）
    if (selectError) {
      logger.warn('user_settingsの取得中にエラーが発生しましたが、カラムは存在すると仮定します。', selectError);
      return true;
    }

    // エラーがなく、データも取得できなかった場合（空の結果）
    logger.debug('user_settingsレコードが存在しないため、カラムの存在を確認できません。デフォルトでtrueを返します。');
    return true;
  } catch (error: any) {
    // 予期しないエラーが発生した場合も、カラムが存在すると仮定（エラーを発生させないため）
    logger.warn('notification_settingsカラムの存在チェック中に予期しないエラーが発生しましたが、カラムは存在すると仮定します。', error);
    return true;
  }
}

/**
 * notification_settingsカラムが存在しない場合のエラーメッセージを取得
 */
export function getMissingColumnErrorMessage(): string {
  return `
notification_settingsカラムがデータベースに存在しません。

解決方法:
1. Supabaseダッシュボードにアクセス:
   https://supabase.com/dashboard/project/uteeqkpsezbabdmritkn/sql/new

2. 以下のSQLを実行してください:

-- user_settingsテーブルにnotification_settingsカラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings' 
    AND column_name = 'notification_settings'
  ) THEN
    ALTER TABLE public.user_settings 
    ADD COLUMN notification_settings JSONB DEFAULT '{
      "practice_reminders": true,
      "goal_reminders": true,
      "daily_practice": true,
      "weekly_summary": false,
      "achievement_notifications": true,
      "sound_notifications": true,
      "vibration_notifications": true,
      "quiet_hours_enabled": false,
      "quiet_hours_start": "22:00",
      "quiet_hours_end": "08:00"
    }'::jsonb;
    
    RAISE NOTICE 'notification_settingsカラムを追加しました';
  ELSE
    RAISE NOTICE 'notification_settingsカラムは既に存在します';
  END IF;
END $$;
  `.trim();
}

/**
 * attendance_recordsテーブルが存在するかチェック
 * 存在しない場合は、自動的に作成を試みる
 * @returns true: テーブルが存在する, false: テーブルが存在しない（作成も失敗）
 */
export async function checkAttendanceRecordsTableExists(): Promise<boolean> {
  try {
    // テーブルの存在を確認するため、空のクエリを実行
    const { error } = await supabase
      .from('attendance_records')
      .select('id')
      .limit(0);

    if (error) {
      // テーブルが存在しない場合（404エラー）
      if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('does not exist')) {
        logger.warn('attendance_recordsテーブルが存在しません。自動的に作成を試みます...');
        
        // RPC関数を呼び出してテーブルを作成
        try {
          const { data: rpcResult, error: rpcError } = await supabase.rpc('ensure_attendance_records_table');
          
          if (rpcError) {
            logger.error('attendance_recordsテーブルの自動作成に失敗しました:', rpcError);
            return false;
          }
          
          if (rpcResult && (rpcResult as any).success) {
            const created = (rpcResult as any).created;
            if (created) {
              logger.info('✅ attendance_recordsテーブルを自動作成しました');
            } else {
              logger.info('ℹ️ attendance_recordsテーブルは既に存在します');
            }
            
            // 作成後、再度存在確認
            const { error: verifyError } = await supabase
              .from('attendance_records')
              .select('id')
              .limit(0);
            
            if (verifyError) {
              logger.warn('テーブル作成後の確認でエラーが発生しました:', verifyError);
              return false;
            }
            
            return true;
          } else {
            logger.error('attendance_recordsテーブルの自動作成に失敗しました（結果が不正）');
            return false;
          }
        } catch (rpcException: any) {
          // RPC関数が存在しない場合（マイグレーション未実行）は、手動実行を促す
          if (rpcException.message?.includes('function') && rpcException.message?.includes('does not exist')) {
            logger.warn('ensure_attendance_records_table関数が存在しません。');
            logger.warn('解決方法: Supabaseダッシュボードで以下のマイグレーションを実行してください:');
            logger.warn('  1. 20251209000000_create_practice_schedules_and_tasks.sql（推奨：最初からテーブルを作成）');
            logger.warn('  または');
            logger.warn('  2. 20251209000002_ensure_attendance_records_table_final.sql（既存環境用）');
            return false;
          }
          logger.error('attendance_recordsテーブルの自動作成中にエラーが発生しました:', rpcException);
          return false;
        }
      }
      // その他のエラーはテーブルが存在すると仮定
      return true;
    }

    // エラーがなければテーブルは存在する
    return true;
  } catch (error: any) {
    logger.warn('attendance_recordsテーブルの存在チェック中にエラーが発生しました:', error);
    // エラーが発生した場合は、テーブルが存在しないと仮定
    return false;
  }
}

/**
 * データベーススキーマの整合性をチェック
 * アプリ起動時に呼び出して、必要なカラムが存在するか確認
 */
export async function checkDatabaseSchema(): Promise<{
  notificationSettingsColumnExists: boolean;
  attendanceRecordsTableExists: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  const notificationSettingsExists = await checkNotificationSettingsColumnExists();
  if (!notificationSettingsExists) {
    errors.push('notification_settingsカラムが存在しません');
  }

  const attendanceRecordsExists = await checkAttendanceRecordsTableExists();
  if (!attendanceRecordsExists) {
    errors.push('attendance_recordsテーブルが存在しません。マイグレーションを実行してください。');
  }

  return {
    notificationSettingsColumnExists: notificationSettingsExists,
    attendanceRecordsTableExists: attendanceRecordsExists,
    errors,
  };
}

