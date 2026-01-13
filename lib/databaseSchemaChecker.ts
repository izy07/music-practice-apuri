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
    // 根本的な解決策: レコードの有無に関係なく、カラムの存在を確認
    // SELECT notification_settings FROM user_settings LIMIT 0 を使用することで、
    // レコードが存在しなくてもカラムが存在するかどうかを確認できる
    // カラムが存在する場合: エラーは発生しない（空の結果が返る）
    // カラムが存在しない場合: 42703エラー（undefined_column）が発生
    
    const { error: columnCheckError } = await supabase
      .from('user_settings')
      .select('notification_settings')
      .limit(0); // レコードの取得は不要、カラムの存在確認のみ

    if (columnCheckError) {
      // 42703エラー（undefined_column）が発生した場合はカラムが存在しない
      if (columnCheckError.code === '42703' || columnCheckError.message?.includes('notification_settings')) {
        logger.debug('notification_settingsカラムが存在しません');
        return false;
    }

      // PGRST205エラー（テーブルが存在しない）の場合もカラムは存在しない
      if (columnCheckError.code === 'PGRST205' || columnCheckError.code === '42P01') {
        logger.debug('user_settingsテーブルが存在しません（カラムも存在しない）');
        return false;
    }

      // その他のエラー（RLSポリシーなど）の場合は、カラムが存在すると仮定
      // （実際の使用時にエラーが発生した場合はその時点で処理）
      logger.debug('notification_settingsカラムの存在チェックでエラーが発生しましたが、カラムは存在すると仮定します:', {
        errorCode: columnCheckError.code,
        errorMessage: columnCheckError.message
      });
      return true;
    }

    // エラーが発生しなかった場合、カラムは存在する
    logger.debug('notification_settingsカラムが存在します');
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
              logger.info('attendance_recordsテーブルを自動作成しました');
            } else {
              logger.info('attendance_recordsテーブルは既に存在します');
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
            logger.warn('  統合マイグレーションファイル: 20251219000000_initial_schema.sql');
            logger.warn('  （すべてのテーブルが含まれています）');
            logger.warn('  または、ローカル環境で: supabase db reset');
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
 * 
 * 注意: 初期スキーマ（20251219000000_initial_schema.sql）に含まれているテーブル/カラムは
 * 毎回チェックする必要はありません。この関数は現在使用されていません。
 * 
 * 初期スキーマに含まれているもの：
 * - notification_settings: 初期スキーマに含まれている
 * - attendance_records: 初期スキーマに含まれている
 * - instrument_id: 各テーブルに初期スキーマで定義されている
 * - show_on_calendar: goalsテーブルに初期スキーマで定義されている
 * - tutorial_completed: user_profilesテーブルに初期スキーマで定義されている
 * 
 * @deprecated 初期スキーマに含まれているため、この関数は不要です
 */
export async function checkDatabaseSchema(): Promise<{
  errors: string[];
}> {
  // 初期スキーマに含まれているため、チェックは不要
  return {
    errors: [],
  };
}

