// 30日経過したレッスン録音を自動削除するSupabase Edge Function
// この関数はSupabaseのpg_cronまたは外部スケジューラーから定期実行されます

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight リクエストの処理
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Supabaseクライアントの作成
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 30日経過したレッスン録音を取得（お気に入りは除外）
    const now = new Date().toISOString();
    const { data: recordingsToDelete, error: selectError } = await supabase
      .from('recordings')
      .select('id, file_path, user_id')
      .eq('recording_type', 'lesson')
      .eq('is_favorite', false)
      .not('auto_delete_at', 'is', null)
      .lte('auto_delete_at', now);

    if (selectError) {
      throw selectError;
    }

    if (!recordingsToDelete || recordingsToDelete.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: '削除対象の録音はありません',
          deletedCount: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Storageからファイルを削除
    const deletedFilePaths: string[] = [];
    const failedFilePaths: string[] = [];

    for (const recording of recordingsToDelete) {
      if (recording.file_path) {
        try {
          const { error: storageError } = await supabase.storage
            .from('recordings')
            .remove([recording.file_path]);

          if (storageError) {
            console.error(`Storage削除エラー (${recording.file_path}):`, storageError);
            failedFilePaths.push(recording.file_path);
          } else {
            deletedFilePaths.push(recording.file_path);
          }
        } catch (error) {
          console.error(`Storage削除エラー (${recording.file_path}):`, error);
          failedFilePaths.push(recording.file_path);
        }
      }
    }

    // データベースからレコードを削除
    const recordingIds = recordingsToDelete.map(r => r.id);
    const { error: deleteError } = await supabase
      .from('recordings')
      .delete()
      .in('id', recordingIds);

    if (deleteError) {
      throw deleteError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '録音の削除が完了しました',
        deletedCount: recordingsToDelete.length,
        deletedFilePaths: deletedFilePaths.length,
        failedFilePaths: failedFilePaths.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('削除処理エラー:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
