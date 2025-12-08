import { supabase } from './supabase';
import { Database } from './supabase';
import logger from './logger';
import { ErrorHandler } from './errorHandler';

type UserSettings = Database['public']['Tables']['user_settings']['Row'];
type TutorialProgress = Database['public']['Tables']['tutorial_progress']['Row'];

// ユーザー設定の保存・取得
export const saveUserSettings = async (userId: string, settings: Partial<UserSettings>) => {
  try {
    // まず既存のレコードを確認
    const { data: existing } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    let result;
    if (existing) {
      // 既存レコードがある場合は更新
      const { data, error } = await supabase
        .from('user_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      result = { data, error: null };
    } else {
      // レコードがない場合は挿入
      const { data, error } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      result = { data, error: null };
    }

    return result;
  } catch (error) {
    ErrorHandler.handle(error, 'ユーザー設定保存', false);
    return { data: null, error };
  }
};

export const getUserSettings = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { data, error: null };
  } catch (error) {
    ErrorHandler.handle(error, 'ユーザー設定取得', false);
    return { data: null, error };
  }
};

// 言語設定の保存・取得
export const saveLanguageSetting = async (userId: string, language: 'ja' | 'en') => {
  try {
    // まず既存のレコードを確認
    const { data: existing } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    let result;
    if (existing) {
      // 既存レコードがある場合は更新
      const { data, error } = await supabase
        .from('user_settings')
        .update({
          language,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      result = { data, error: null };
    } else {
      // レコードがない場合は挿入
      const { data, error } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          language,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      result = { data, error: null };
    }

    return result;
  } catch (error) {
    ErrorHandler.handle(error, '言語設定保存', false);
    return { data: null, error };
  }
};

export const getLanguageSetting = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('language')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { data: data?.language || 'ja', error: null };
  } catch (error) {
    ErrorHandler.handle(error, '言語設定取得', false);
    return { data: 'ja', error };
  }
};

// チュートリアル進捗の保存・取得
export const saveTutorialProgress = async (userId: string, progress: Partial<TutorialProgress>) => {
  try {
    const { data, error } = await supabase
      .from('tutorial_progress')
      .upsert({
        user_id: userId,
        ...progress,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    ErrorHandler.handle(error, 'チュートリアル進捗保存', false);
    return { data: null, error };
  }
};

export const getTutorialProgress = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('tutorial_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { data, error: null };
  } catch (error) {
    ErrorHandler.handle(error, 'チュートリアル進捗取得', false);
    return { data: null, error };
  }
};

export const markTutorialCompleted = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('tutorial_progress')
      .upsert({
        user_id: userId,
        is_completed: true,
        completed_at: new Date().toISOString(),
        current_step: 6,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    ErrorHandler.handle(error, 'チュートリアル完了マーク', false);
    return { data: null, error };
  }
};

// メトロノーム設定の保存・取得
export const saveMetronomeSettings = async (userId: string, settings: {
  bpm: number;
  time_signature: string;
  volume: number;
  sound_type: 'click' | 'beep';
  subdivision: string;
}) => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        metronome_settings: settings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    ErrorHandler.handle(error, 'メトロノーム設定保存', false);
    return { data: null, error };
  }
};

export const getMetronomeSettings = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('metronome_settings')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { 
      data: data?.metronome_settings || {
        bpm: 120,
        time_signature: '4/4',
        volume: 0.7,
        sound_type: 'click' as const,
        subdivision: 'quarter'
      }, 
      error: null 
    };
  } catch (error) {
    ErrorHandler.handle(error, 'メトロノーム設定取得', false);
    return { 
      data: {
        bpm: 120,
        time_signature: '4/4',
        volume: 0.7,
        sound_type: 'click' as const,
        subdivision: 'quarter'
      }, 
      error 
    };
  }
};

// チューナー設定の保存・取得
export const saveTunerSettings = async (userId: string, settings: {
  reference_pitch: number;
  temperament: string;
  volume: number;
}) => {
  try {
    // まず既存のレコードを確認
    const { data: existingData, error: checkError } = await supabase
      .from('user_settings')
      .select('id, user_id')
      .eq('user_id', userId)
      .single();

    let result;
    if (existingData && !checkError) {
      // 既存のレコードがある場合は更新
      const { data, error } = await supabase
        .from('user_settings')
        .update({
          tuner_settings: settings,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      result = { data, error: null };
    } else {
      // レコードが存在しない場合は挿入
      const { data, error } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          tuner_settings: settings,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      result = { data, error: null };
    }

    return result;
  } catch (error) {
    ErrorHandler.handle(error, 'チューナー設定保存', false);
    return { data: null, error };
  }
};

export const getTunerSettings = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('tuner_settings')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { 
      data: data?.tuner_settings || {
        reference_pitch: 440,
        temperament: 'equal',
        volume: 0.7
      }, 
      error: null 
    };
  } catch (error) {
    ErrorHandler.handle(error, 'チューナー設定取得', false);
    return { 
      data: {
        reference_pitch: 440,
        temperament: 'equal',
        volume: 0.7
      }, 
      error 
    };
  }
};

// 練習セッションの保存
export const savePracticeSession = async (session: {
  user_id: string;
  instrument_id: string | null;
  practice_date: string;
  duration_minutes: number;
  content: string | null;
  audio_url: string | null;
  input_method: 'manual' | 'preset' | 'voice';
}) => {
  try {
    const { data, error } = await supabase
      .from('practice_sessions')
      .insert({
        ...session,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    ErrorHandler.handle(error, '練習セッション保存', false);
    return { data: null, error };
  }
};

// 練習セッションの削除
export const deletePracticeSession = async (sessionId: string) => {
  try {
    const { error } = await supabase
      .from('practice_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    ErrorHandler.handle(error, '練習セッション削除', false);
    return { error };
  }
};

// 録音データの削除
export const deleteRecording = async (recordingId: string) => {
  try {
    const { error } = await supabase
      .from('recordings')
      .delete()
      .eq('id', recordingId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    ErrorHandler.handle(error, '録音削除', false);
    return { error };
  }
};

// 特定の日付の録音データを取得（タイムゾーン対応）
export const getRecordingsByDate = async (
  userId: string, 
  date: string,
  instrumentId?: string | null
) => {
  try {
    // 日付範囲を計算（タイムゾーンの問題を回避）
    // 指定日の00:00:00から23:59:59までをカバーするため、UTCで前後1日を含める
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    startOfDay.setDate(startOfDay.getDate() - 1); // 前日を含める（タイムゾーン対応）
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    endOfDay.setDate(endOfDay.getDate() + 1); // 翌日を含める（タイムゾーン対応）
    
    let query = supabase
      .from('recordings')
      .select('id, title, duration_seconds, file_path, recorded_at, instrument_id')
      .eq('user_id', userId)
      .gte('recorded_at', startOfDay.toISOString())
      .lte('recorded_at', endOfDay.toISOString());
    
    // 楽器IDでフィルタリング
    if (instrumentId) {
      query = query.eq('instrument_id', instrumentId);
    } else {
      query = query.is('instrument_id', null);
    }
    
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(10); // 最大10件（通常は1件のみ）

    if (error) throw error;
    
    // ローカル日付で再フィルタリング（タイムゾーンの問題を確実に回避）
    const { formatLocalDate } = require('./dateUtils');
    const dateStr = formatLocalDate(targetDate);
    const filteredData = (data || []).filter((recording: { recorded_at: string }) => {
      if (!recording.recorded_at) return false;
      const recordedDateStr = formatLocalDate(new Date(recording.recorded_at));
      return recordedDateStr === dateStr;
    });
    
    return { data: filteredData, error: null };
  } catch (error) {
    ErrorHandler.handle(error, '録音データ取得（日付別）', false);
    return { data: null, error };
  }
};

// 目標の保存・更新
export const saveGoal = async (goal: {
  user_id: string;
  goal_type: 'personal_short' | 'personal_long' | 'group';
  title: string;
  description: string | null;
  target_date: string | null;
  progress_percentage: number;
  is_active: boolean;
}) => {
  try {
    const { data, error } = await supabase
      .from('goals')
      .insert({
        ...goal,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    ErrorHandler.handle(error, '目標保存', false);
    return { data: null, error };
  }
};

export const updateGoal = async (goalId: string, updates: Partial<{
  title: string;
  description: string | null;
  target_date: string | null;
  progress_percentage: number;
  is_active: boolean;
}>) => {
  try {
    const { data, error } = await supabase
      .from('goals')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    ErrorHandler.handle(error, '目標更新', false);
    return { data: null, error };
  }
};

// (removed) AIチャット履歴の保存

// 音符トレーニング結果の保存（機能削除のためコメントアウト）
// export const saveNoteTrainingResult = async (userId: string, result: {
//   mode: 'basic' | 'instrument' | 'endless';
//   level: number;
//   score: number;
//   correct_count: number;
//   total_count: number;
//   max_streak: number;
//   play_time: number;
//   created_at: string;
// }) => {
//   try {
//     const { data, error } = await supabase
//       .from('note_training_results')
//       .insert({
//         user_id: userId,
//         ...result,
//       })
//       .select()
//       .single();

//     if (error) throw error;
//     return { data, error: null };
//   } catch (error) {
//     ErrorHandler.handle(error, '音符トレーニング結果保存', false);
//     return { data: null, error };
//   }
// };

// ====== 録音・動画ライブラリ関連 ======

// 音声BlobをSupabase Storageにアップロード
export const uploadRecordingBlob = async (
  userId: string,
  blob: Blob,
  fileExtension: string = 'wav'
) => {
  try {
    const randomId = (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
      ? (crypto as any).randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
    const fileName = `${userId}/${randomId}.${fileExtension}`;
    const { data, error } = await supabase.storage
      .from('recordings')
      .upload(fileName, blob, { upsert: false, contentType: `audio/${fileExtension}` });
    if (error) throw error;
    return { path: data.path, error: null };
  } catch (error) {
    ErrorHandler.handle(error, '録音Blobアップロード', false);
    return { path: null, error };
  }
};

// 録音/動画レコードの保存（my_songs連携）
export const saveRecording = async (record: {
  user_id: string;
  instrument_id?: string | null;
  song_id?: string | null;
  title?: string | null;
  memo?: string | null;
  file_path?: string | null; // Storageに保存したパス
  duration_seconds?: number | null;
  is_favorite?: boolean;
  recorded_at?: string | null;
}) => {
  try {
    logger.debug('録音保存開始:', {
      userId: record.user_id,
      instrumentId: record.instrument_id,
      title: record.title,
      duration: record.duration_seconds,
      hasFilePath: !!record.file_path
    });

    // 現在のデータベーススキーマに合わせて、必須フィールドにデフォルト値を設定
    const payload = {
      user_id: record.user_id,
      instrument_id: record.instrument_id ?? null, // 楽器IDを保存
      title: record.title ?? '録音', // タイトルが空の場合はデフォルト値を設定
      memo: record.memo ?? null,
      file_path: record.file_path ?? '', // NOT NULL制約の場合、空文字列をデフォルトに
      duration_seconds: record.duration_seconds ?? 0, // NOT NULL制約の場合、0をデフォルトに
      is_favorite: record.is_favorite ?? false,
      recorded_at: record.recorded_at ?? new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    logger.debug('保存ペイロード:', payload);

    const { data, error } = await supabase
      .from('recordings')
      .insert(payload)
      .select()
      .single();

    if (error) {
      ErrorHandler.handle(error, 'Supabase保存', false);
      throw error;
    }

    logger.debug('録音保存成功:', data);
    return { data, error: null };
  } catch (error) {
    console.error('💥 録音保存エラー:', error);
    return { data: null, error };
  }
};

// 指定年月の録音一覧を取得（降順）
export const listRecordingsByMonth = async (
  userId: string,
  year: number,
  month: number
) => {
  try {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .eq('user_id', userId)
      .gte('recorded_at', start.toISOString())
      .lte('recorded_at', new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString())
      .order('recorded_at', { ascending: false });
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error listing recordings:', error);
    return { data: [], error };
  }
};

// 全期間の録音一覧（降順、ページング可）
export const listAllRecordings = async (
  userId: string,
  instrumentId?: string | null,
  range?: { from: number; to: number }
) => {
  try {
    let query = supabase
      .from('recordings')
      .select('*')
      .eq('user_id', userId);
    
    // 楽器IDが指定されている場合はフィルタリング
    if (instrumentId) {
      query = query.eq('instrument_id', instrumentId);
    }
    
    query = query.order('recorded_at', { ascending: false });
    
    if (range) {
      query = query.range(range.from, range.to);
    }
    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error listing all recordings:', error);
    return { data: [], error };
  }
};
