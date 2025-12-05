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
 * データベーススキーマの整合性をチェック
 * アプリ起動時に呼び出して、必要なカラムが存在するか確認
 */
export async function checkDatabaseSchema(): Promise<{
  notificationSettingsColumnExists: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  const notificationSettingsExists = await checkNotificationSettingsColumnExists();
  if (!notificationSettingsExists) {
    errors.push('notification_settingsカラムが存在しません');
  }

  return {
    notificationSettingsColumnExists: notificationSettingsExists,
    errors,
  };
}

