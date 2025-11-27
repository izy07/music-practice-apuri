/**
 * カスタム楽器名管理のカスタムフック
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface UseCustomInstrumentNameOptions {
  selectedInstrument: string | null;
  userId: string | null;
}

export const useCustomInstrumentName = ({ selectedInstrument, userId }: UseCustomInstrumentNameOptions) => {
  const [customInstrumentName, setCustomInstrumentName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // その他楽器（550e8400-e29b-41d4-a716-446655440016）が選択されている場合のみ取得
      if (selectedInstrument === '550e8400-e29b-41d4-a716-446655440016' && userId) {
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('custom_instrument_name')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (error) {
            // カラムが存在しないエラー（42703）の場合は無視
            if (error.code === '42703') {
              setCustomInstrumentName(null);
              return;
            }
            setCustomInstrumentName(null);
            return;
          }
          
          if (data?.custom_instrument_name) {
            setCustomInstrumentName(data.custom_instrument_name);
          } else {
            setCustomInstrumentName(null);
          }
        } catch (error: any) {
          // カラムが存在しない場合は無視
          if (error?.code !== '42703') {
            // エラーは無視（ログ出力なし）
          }
          setCustomInstrumentName(null);
        }
      } else {
        // その他楽器以外が選択されている場合はカスタム楽器名をクリア
        setCustomInstrumentName(null);
      }
    })();
  }, [selectedInstrument, userId]);

  return customInstrumentName;
};

